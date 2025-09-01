#!/usr/bin/env python3
import os
import traceback
import grpc
import pandas as pd
import numpy as np
import sys
import json
import time
import jwt
import uuid
from datetime import datetime
from strategies.mean_reversion import MeanReversionStrategy, MeanReversionParams
from fetch_binance import fetch_binance_price_async
from protos import trading_api_pb2, trading_api_pb2_grpc
import asyncio
import aiohttp
from dotenv import load_dotenv

load_dotenv()


# Add protos path to sys.path
script_dir = os.path.dirname(__file__)
protos_path = os.path.join(script_dir, "protos")

def load_backfill_prices(csv_path, lookback_period):
    try:
        df = pd.read_csv(csv_path)
    except FileNotFoundError:
        print(f"[WARN] Price CSV not found: {csv_path}")
        return [], []
    # Handle both lowercase and capitalized columns
    if 'close' in df.columns:
        prices = df['close'].tolist()
        timestamps = df['timestamp'].tolist()
    elif 'Close' in df.columns:
        prices = df['Close'].tolist()
        timestamps = df['Timestamp'].tolist()
    elif 'price' in df.columns:
        prices = df['price'].tolist()
        timestamps = df['timestamp'].tolist()
    else:
        raise KeyError("CSV must contain 'close', 'Close', or 'price' column")
    return prices[-lookback_period:], timestamps[-lookback_period:]

def convert_numpy(obj):
    if isinstance(obj, np.generic):
        return obj.item()
    elif isinstance(obj, dict):
        return {k: convert_numpy(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy(v) for v in obj]
    elif isinstance(obj, tuple):
        return tuple(convert_numpy(v) for v in obj)
    else:
        return obj
    
def calculate_returns(prices):
    prices = np.array(prices)
    if prices.ndim > 1:
        prices = prices.flatten()
    returns = np.diff(prices) / prices[:-1]
    return returns.tolist()

def _symbol_to_csv(symbol: str) -> str:
    """Map a trading symbol to a backfill CSV path (try uppercase first to match writer)."""
    sym = symbol.replace("-", "").upper()
    base = f"{sym}_1-min_data.csv"
    path_upper = os.path.join("data", base)
    path_lower = os.path.join("data", base.lower())
    return path_upper if os.path.exists(path_upper) else path_lower

async def update_bot_state(bot_stub, bot_id, state_dict, metadata, account_value=None):
    from protos import trading_api_pb2
    state_dict = {str(k): "" if v is None else str(v) for k, v in convert_numpy(state_dict).items()}
    req = trading_api_pb2.UpdateBotStateRequest(
        bot_id=bot_id,
        state=state_dict,
        account_value=account_value
    ) 
    if metadata is None:
        metadata = []
    elif isinstance(metadata, dict):
        metadata = list(metadata.items())
    elif isinstance(metadata, list):
        sanitized = []
        for m in metadata:
            if isinstance(m, (list, tuple)) and len(m) == 2:
                sanitized.append(tuple(m))
            elif isinstance(m, str) and ':' in m:
                k, v = m.split(':', 1)
                sanitized.append((k.strip(), v.strip()))
            elif isinstance(m, str):
                print(f"[WARN] Skipping malformed metadata string: {m!r}")
                continue
        metadata = sanitized
    resp = await bot_stub.UpdateBotState(req, metadata=metadata)
    return resp

class TradingOrchestrator:
    def __init__(self):
        self.positions = {}  # bot_id -> position size
        self._last_noncustom_warn = {}  # bot_id -> last warn timestamp
        self.go_service_addr = os.environ.get('GO_SERVICE_ADDR', 'localhost:50051')
        self.rust_service_addr = os.environ.get('RUST_SERVICE_ADDR', 'localhost:50052')
        # self.account_value = float(os.environ.get('INITIAL_ACCOUNT_VALUE', '1000000.0'))
        self.auth_secret = os.environ.get('AUTH_SECRET', None)
        if self.auth_secret:
            masked_secret = self.auth_secret[:4] + '...' + self.auth_secret[-4:] if len(self.auth_secret) > 8 else '***'
            print(f"[DEBUG] AUTH_SECRET loaded: {masked_secret}")
        else:
            print("[DEBUG] AUTH_SECRET not set.") 
        
        self.orchestrator_user_id = os.environ.get('ORCHESTRATOR_USER_ID')
        print(f"[DEBUG] Using orchestrator_user_id: {self.orchestrator_user_id}")
        if not self.orchestrator_user_id:
            print("Error: ORCHESTRATOR_USER_ID environment variable not set.")
            exit(1)
        self.positions = {}  # bot_id -> position size
        self._last_abnormal_warn = {} # bot_id -> last abnormal warn timestamp
        self.allow_shorts = os.environ.get('ALLOW_SHORTS', 'false').strip().lower() in ('1','true','yes','y')
        # Rolling live price windows per symbol for z-score
        self.price_windows = defaultdict(lambda: deque(maxlen=200))

    def _generate_jwt(self):
        if not self.auth_secret:
            return None
        now = int(time.time())
        claims = {
            'sub': 'orchestrator',
            'iat': now - 5,
            'exp': now + 6 * 3600,
            'user_id': self.orchestrator_user_id,
        }
        return jwt.encode(claims, self.auth_secret, algorithm='HS256')

    async def process_bot(self, bot, trading_channel, risk_channel, metadata, http_session):
        """Processes a single bot: fetch price, generate signal, check risk, create order, update state."""
        try:
            bot_stub = trading_api_pb2_grpc.BotServiceStub(trading_channel)
            risk_stub = trading_api_pb2_grpc.RiskServiceStub(risk_channel)
            order_stub = trading_api_pb2_grpc.OrderServiceStub(trading_channel)

            if not getattr(bot, "is_active", False):
                # print(f"[Orchestrator] Skipping inactive bot: {bot.name} ({bot.bot_id})")
                return

            # print(f"[Orchestrator] Processing bot: {bot.name} ({bot.bot_id})")
            price = await fetch_binance_price_async(http_session, bot.symbol.replace("-", ""))
            # print(f"Current price for {bot.symbol}: ${price:,.2f}")
            if price is not None:
                self.price_windows[bot.symbol].append(float(price))

            # Assuming bot.custom_strategy_definition exists and is a CustomStrategy protobuf message
            # In a real scenario, the bot service would provide this based on the bot's configuration.
            # if bot.strategy == "CustomStrategy" and hasattr(bot, 'custom_strategy_definition'):
            #     from backtest_engine import CustomStrategy as BacktestCustomStrategy
            #     custom_strategy_instance = BacktestCustomStrategy(bot.custom_strategy_definition)
            #     signal = custom_strategy_instance.generate_signal(price, bot.account_value)
            # else:
            signal = {'action': 'hold', 'size': 0}
            strategy_name = (getattr(bot, "strategy", "") or "").lower()

            # Helper to read params from bot.parameters map with fallback keys
            def _pget(pmap, keys, default=None):
                for k in keys:
                    v = pmap.get(k)
                    if v is not None and str(v) != "":
                        return v
                return default

            try:
                # Try CustomStrategy (including "developbot" alias or state-provided JSON)
                if strategy_name in ("customstrategy", "custom_strategy", "developbot", "develop_bot"):
                    from backtest_engine import CustomStrategy as BacktestCustomStrategy
                    custom_strategy_instance = BacktestCustomStrategy(bot.custom_strategy_definition)
                    signal = custom_strategy_instance.generate_signal(price, bot.account_value)
                else:
                    # Support built-in strategies (e.g., MEAN_REVERSION)
                    params_map = {}
                    if hasattr(bot, "parameters"):
                        try:
                            params_map = dict(bot.parameters)
                        except Exception:
                            try:
                                params_map = {k: bot.parameters[k] for k in bot.parameters.keys()}
                            except Exception:
                                params_map = {}
                    if strategy_name in ("mean_reversion", "meanreversion"):
                        # Parse params (sent as strings from frontend)
                        lookback = int(float(_pget(params_map, ["lookback"], 20)))
                        entry_std = float(_pget(params_map, ["entryStd", "entry_std"], 2.0))
                        exit_std = float(_pget(params_map, ["exitStd", "exit_std"], 0.5))
                        max_pos_pct = float(_pget(params_map, ["maxPos", "max_position", "max_pos"], 0.10))
                        stop_loss_pct = float(_pget(params_map, ["stopLossPct", "stop_loss_pct"], 0.02))
                        risk_per_trade_pct = float(_pget(params_map, ["riskPerTradePct", "risk_per_trade_pct"], 0.01))

                        # Prefer live window over CSV to avoid scale mismatch
                        live_window = list(self.price_windows[bot.symbol])[-lookback:]
                        min_samples = max(5, min(lookback, 30))

                        csv_path = _symbol_to_csv(bot.symbol)
                        prices_list, _ts = load_backfill_prices(csv_path, max(lookback, 2))
 
                        if price is not None and len(live_window) >= min_samples:
                            import numpy as _np
                            window = live_window
                            price_f = float(price)
                            mean_p = float(_np.mean(window))
                            std_p = float(_np.std(window)) or 0.0
                            
                            
                            if std_p <= 1e-9:
                                signal = {'action': 'hold', 'size': 0, 'zscore': 0.0}
                            else:
                                z_raw = (price_f - mean_p) / std_p
                                z = float(_np.clip(z_raw, -10.0, 10.0))

                                # Equity, current position, and caps
                                position = float(self.positions.get(bot.bot_id, 0.0))
                                total_equity = float(bot.account_value) + position * price_f
                                max_units = (max_pos_pct * total_equity) / price_f if price_f > 0 else 0.0
                                per_trade_cap = (risk_per_trade_pct * total_equity) / price_f if price_f > 0 else 0.0

                                # Deadband around exit_std; target scales with z/entry_std
                                if abs(z) <= exit_std or max_units <= 0:
                                    target_units = 0.0
                                else:
                                    scale = max(-1.0, min(1.0, -z / entry_std))
                                    target_units = scale * max_units

                                # Long-only clamp unless shorts are allowed
                                if not self.allow_shorts:
                                    target_units = max(0.0, target_units)

                                delta = target_units - position
                                # Raise min trade size to avoid tiny orders
                                min_trade_units = max(1e-6, per_trade_cap * 1e-4)
                                qty = min(abs(delta), per_trade_cap)
                                if qty < min_trade_units:
                                    signal = {'action': 'hold', 'size': 0, 'zscore': z, 'target_units': target_units}
                                else:
                                    action = 'buy' if delta > 0 else 'sell'
                                    if action == 'sell' and not self.allow_shorts:
                                        qty = min(qty, max(0.0, position))
                                    if action == 'sell' and qty <= 0:
                                        signal = {'action': 'hold', 'size': 0, 'zscore': z, 'target_units': target_units}
                                    else:
                                        signal = {'action': action, 'size': qty, 'stop_loss': stop_loss_pct, 'zscore': z, 'target_units': target_units}

                        elif prices_list and price is not None:
                            import numpy as _np
                            window = prices_list[-lookback:] if len(prices_list) >= lookback else prices_list
                            price_f = float(price)
                            mean_p = float(_np.mean(window))
                            std_p = float(_np.std(window)) or 0.0

                            safe_for_trade = True

                            # Rescale window if CSV mean doesn't match live price level
                            if mean_p > 0:
                                ratio = price_f / mean_p
                                if ratio < 0.67 or ratio > 1.5:
                                    window = [p * ratio for p in window]
                                    mean_p = float(_np.mean(window))
                                    std_p = float(_np.std(window)) or 0.0

                            if std_p <= 1e-9:
                                z = 0.0
                                safe_for_trade = False
                            else:
                                z_raw = (price_f - mean_p) / std_p
                                if abs(z_raw) > 10:
                                    key = f"{bot.symbol}:abnz"
                                    now_ts = time.time()
                                    last = self._last_abnormal_warn.get(key, 0)
                                    if now_ts - last > 30:
                                        print(f"[WARN] Abnormal z-score {z_raw:.2f} for {bot.symbol}. mean={mean_p:.4f}, std={std_p:.6f}, n={len(window)}, csv={csv_path}")
                                        self._last_abnormal_warn[key] = now_ts
                                    safe_for_trade = False
                                z = float(_np.clip(z_raw, -10.0, 10.0))

                            if not safe_for_trade:
                                signal = {'action': 'hold', 'size': 0, 'zscore': z}
                            else:
                                position = float(self.positions.get(bot.bot_id, 0.0))
                                total_equity = float(bot.account_value) + position * price_f
                                max_units = (max_pos_pct * total_equity) / price_f if price_f > 0 else 0.0
                                per_trade_cap = (risk_per_trade_pct * total_equity) / price_f if price_f > 0 else 0.0

                                if abs(z) <= exit_std or max_units <= 0:
                                    target_units = 0.0
                                else:
                                    scale = max(-1.0, min(1.0, -z / entry_std))
                                    target_units = scale * max_units

                                if not self.allow_shorts:
                                    target_units = max(0.0, target_units)

                                delta = target_units - position
                                min_trade_units = max(1e-6, per_trade_cap * 1e-4)
                                qty = min(abs(delta), per_trade_cap)
                                if qty < min_trade_units:
                                    signal = {'action': 'hold', 'size': 0, 'zscore': z, 'target_units': target_units}
                                else:
                                    action = 'buy' if delta > 0 else 'sell'
                                    if action == 'sell' and not self.allow_shorts:
                                        qty = min(qty, max(0.0, position))
                                    if action == 'sell' and qty <= 0:
                                        signal = {'action': 'hold', 'size': 0, 'zscore': z, 'target_units': target_units}
                                    else:
                                        signal = {'action': action, 'size': qty, 'stop_loss': stop_loss_pct, 'zscore': z, 'target_units': target_units}
                        else:
                            signal = {'action': 'hold', 'size': 0}

                    elif hasattr(bot, "state") and isinstance(bot.state, dict):
                        # Optional: allow custom strategy JSON saved in state
                        cfg_raw = bot.state.get("custom_strategy") or bot.state.get("customStrategy")
                        if cfg_raw:
                            from backtest_engine import CustomStrategy as BacktestCustomStrategy
                            cfg = json.loads(cfg_raw) if isinstance(cfg_raw, str) else cfg_raw
                            custom_strategy_instance = BacktestCustomStrategy(cfg)
                            signal = custom_strategy_instance.generate_signal(price, bot.account_value)

            except Exception as _e:
                # Fallback to hold; warn only occasionally
                now_ts = time.time()
                last = self._last_noncustom_warn.get(bot.bot_id, 0)
                if now_ts - last > 30:
                    print(f"[WARN] Failed to generate signal for {bot.name}: {_e}. Using hold.")
                    self._last_noncustom_warn[bot.bot_id] = now_ts
                signal = {'action': 'hold', 'size': 0}

            if signal['action'] == 'hold' or signal['size'] == 0:
                pass
            else:
                print(f"[INFO] Trade signal for bot {bot.name}: action={signal['action']}, size={signal['size']}, stop_loss={signal.get('stop_loss')}")
                bot_id = bot.bot_id
                position = self.positions.get(bot_id, 0.0)
                if signal['action'] != 'hold' and signal['size'] > 0:
                    print(f"Generated signal for bot {bot.name}: {json.dumps(signal)}")

                    portfolio = trading_api_pb2.PortfolioResponse(
                        bot_id=bot.bot_id,
                        total_portfolio_value=trading_api_pb2.DecimalValue(units=int(bot.account_value), nanos=int((bot.account_value % 1) * 1e9)),
                        positions=[
                            trading_api_pb2.PortfolioPosition(
                                symbol=bot.symbol,
                                quantity=trading_api_pb2.DecimalValue(units=int(signal['size']), nanos=int((signal['size'] % 1) * 1e9)),
                                average_price=trading_api_pb2.DecimalValue(units=int(price), nanos=int((price % 1) * 1e9)),
                                market_value=trading_api_pb2.DecimalValue(units=int(price * signal['size']), nanos=int(((price * signal['size']) % 1) * 1e9)),
                                unrealized_pnl=trading_api_pb2.DecimalValue(units=0, nanos=0),
                                exposure_pct=trading_api_pb2.DecimalValue(units=0, nanos=0)
                            )
                        ],
                        cash_balance=trading_api_pb2.DecimalValue(units=0, nanos=0)
                    )

                    # Load historical prices and calculate returns
                    csv_path = _symbol_to_csv(bot.symbol)
                    prices_list, _ts = load_backfill_prices(csv_path, 30)
                    asset_returns = calculate_returns(prices_list) if prices_list else []

                    # Default: allow order if no history; track risk_value if computed
                    risk_ok = True
                    risk_value = None

                    if asset_returns:
                        asset_history = trading_api_pb2.AssetHistory(returns=asset_returns)
                        asset_histories = {bot.symbol: asset_history}
                        var_request = trading_api_pb2.VaRRequest(
                            current_portfolio=portfolio,
                            risk_model="monte_carlo",
                            confidence_level=0.95,
                            horizon_days=1,
                            asset_histories=asset_histories
                        )
                        try:
                            var_response = await risk_stub.CalculateVaR(var_request, metadata=metadata)
                            def decimal_value_to_float(decimal_value):
                                return float(decimal_value.units) + float(decimal_value.nanos) / 1e9
                            risk_value = decimal_value_to_float(var_response.value_at_risk)
                            risk_ok = risk_value <= (bot.account_value * 0.10)
                            print(f"Risk check for bot {bot.name}: VaR {risk_value:.2f}, OK: {risk_ok}")
                        except grpc.aio.AioRpcError as e:
                            print(f"gRPC error for bot {bot.name}: code={e.code()} details={e.details()}")
                            risk_ok = False

                    if risk_ok:
                        order_request = trading_api_pb2.CreateOrderRequest(
                            bot_id=bot.bot_id,
                            symbol=bot.symbol,
                            side=trading_api_pb2.BUY if signal['action'].lower() == 'buy' else trading_api_pb2.SELL,
                            type=trading_api_pb2.MARKET,
                            quantity=trading_api_pb2.DecimalValue(
                                units=int(signal['size']),
                                nanos=int((signal['size'] % 1) * 1e9)
                            ),
                        )
                        if signal['action'].lower() == 'buy' and bot.account_value <= 0:
                            print(f"[WARN] Bot {bot.name} tried to buy with no funds. Buy blocked.")
                            return
                        position = self.positions.get(bot.bot_id, 0.0)
                        if signal['action'].lower() == 'sell' and position <= 0:
                            print(f"[WARN] Bot {bot.name} tried to sell with no position. Sell blocked.")
                            return

                        order_response = await order_stub.CreateOrder(order_request, metadata=metadata)
                        print(f"Order submitted for bot {bot.name}: {order_response.status}")

                        trade_value = float(price) * float(signal['size'])
                        if signal['action'].lower() == 'buy':
                            position += signal['size']
                            bot.account_value -= trade_value
                        elif signal['action'].lower() == 'sell':
                            position -= signal['size']
                            bot.account_value += trade_value

                        self.positions[bot_id] = position
                    else:
                        rv_txt = f"{risk_value:.2f}" if isinstance(risk_value, (int, float)) else "n/a"
                        print(f"Order blocked for bot {bot.name}: VaR {rv_txt} over limit")


            state = {
                "last_signal": signal.get('action'),
                "zscore": float(signal.get('zscore')) if signal.get('zscore') is not None else None,
                "size": float(signal.get('size')) if signal.get('size') is not None else None,
                "timestamp": int(time.time()),
                "price": float(price) if price is not None else None,
                "bot_name": bot.name,
                "strategy": bot.strategy,
                "account_value": float(bot.account_value),
                "position": float(self.positions.get(bot.bot_id, 0.0)),  # <-- persist position
            }
            await update_bot_state(bot_stub, bot.bot_id, state, metadata, account_value=float(bot.account_value))
        except Exception as e:
            print(f"Error processing bot {bot.name} ({bot.bot_id}): {e}")
            traceback.print_exc()

    async def run(self):
        """Main orchestrator loop: fetch bots and execute trades for each bot concurrently."""
        print(f"Connecting to Go service at {self.go_service_addr}")
        print(f"Connecting to Rust service at {self.rust_service_addr}")
        
        async with grpc.aio.insecure_channel(self.go_service_addr) as trading_channel, \
                   grpc.aio.insecure_channel(self.rust_service_addr) as risk_channel, \
                   aiohttp.ClientSession() as http_session:
            
            bot_stub = trading_api_pb2_grpc.BotServiceStub(trading_channel)

            while True:
                try:
                    token = self._generate_jwt()
                    metadata = []
                    if token:
                        metadata.append(('authorization', f'Bearer {token}'))

                    bot_list = await bot_stub.ListBots(trading_api_pb2.Empty(), metadata=metadata)
                    tasks = []
                    for bot in bot_list.bots:
                        # Restore position from bot.state if present
                        pos = 0.0
                        if hasattr(bot, "state") and "position" in bot.state:
                            try:
                                pos = float(bot.state["position"])
                            except Exception:
                                pos = 0.0
                        self.positions[bot.bot_id] = pos  # <-- restore position before processing
                        task = asyncio.create_task(
                            self.process_bot(bot, trading_channel, risk_channel, metadata, http_session)
                        )
                        tasks.append(task)
                    await asyncio.gather(*tasks)
                    await asyncio.sleep(1)
                except Exception as e:
                    print(f"Error in orchestrator loop: {str(e)}")
                    traceback.print_exc()
                    await asyncio.sleep(60)

if __name__ == "__main__":
    print("Starting Trading Orchestrator...")
    orchestrator = TradingOrchestrator()
    try:
        asyncio.run(orchestrator.run())
    except KeyboardInterrupt:
        print("\nOrchestrator shutdown.")
