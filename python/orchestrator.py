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
    df = pd.read_csv(csv_path)
    prices = df['price'].tolist()  # <-- fix: use 'price' instead of 'close'
    return prices[-lookback_period:]

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
    returns = np.diff(prices) / prices[:-1]
    return returns.tolist()

async def update_bot_state(bot_stub, bot_id, state_dict, metadata):
    from protos import trading_api_pb2
    # Ensure all values are strings for protobuf map<string, string>
    # FIX: Use "" for None values, not "None"
    state_dict = {str(k): "" if v is None else str(v) for k, v in convert_numpy(state_dict).items()}
    req = trading_api_pb2.UpdateBotStateRequest(
        bot_id=bot_id,
        state=state_dict
    )
    # ...existing metadata sanitization...
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
        self.go_service_addr = os.environ.get('GO_SERVICE_ADDR', 'localhost:50051')
        self.rust_service_addr = os.environ.get('RUST_SERVICE_ADDR', 'localhost:50052')
        self.account_value = float(os.environ.get('INITIAL_ACCOUNT_VALUE', '1000000.0'))
        self.auth_secret = os.environ.get('AUTH_SECRET', None)
        if self.auth_secret:
            masked_secret = self.auth_secret[:4] + '...' + self.auth_secret[-4:] if len(self.auth_secret) > 8 else '***'
            print(f"[DEBUG] AUTH_SECRET loaded: {masked_secret}")
        else:
            print("[DEBUG] AUTH_SECRET not set.")
        backfill_prices = load_backfill_prices("data/BTCUSD_1min.csv", 20)
        params = MeanReversionParams(
            lookback_period=20,
            entry_std_dev=1.0,
            exit_std_dev=0.5,
            max_position_size=0.1,
            stop_loss_pct=0.02,
            risk_per_trade_pct=0.01
        )
        self.strategy = MeanReversionStrategy(params, backfill_prices=backfill_prices)
        self.orchestrator_user_id = os.environ.get('ORCHESTRATOR_USER_ID')
        print(f"[DEBUG] Using orchestrator_user_id: {self.orchestrator_user_id}")
        if not self.orchestrator_user_id:
            print("Error: ORCHESTRATOR_USER_ID environment variable not set.")
            exit(1)

    def _generate_jwt(self):
        if not self.auth_secret:
            return None
        claims = {
            'sub': 'orchestrator',
            'iat': int(time.time()),
            'exp': int(time.time()) + 3600  # 1 hour expiry
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

            signal = self.strategy.generate_signal(price, bot.account_value)
            # print(f"[DEBUG] Signal details: {signal}")

            if signal['action'] == 'hold' or signal['size'] == 0:
                # print(f"[INFO] No trade signal for bot {bot.name}: reason=Hold or Zero size")
                pass
            else:
                print(f"[INFO] Trade signal for bot {bot.name}: action={signal['action']}, size={signal['size']}, stop_loss={signal.get('stop_loss')}")

                if signal['action'] != 'hold' and signal['size'] > 0:
                    print(f"Generated signal for bot {bot.name}: {json.dumps(signal)}")
                    
                    portfolio = trading_api_pb2.PortfolioResponse(
                        bot_id=bot.bot_id,
                        total_portfolio_value=trading_api_pb2.DecimalValue(units=int(self.account_value), nanos=int((self.account_value % 1) * 1e9)),
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

                    # ...existing code...
                    portfolio = trading_api_pb2.PortfolioResponse(
                        bot_id=bot.bot_id,
                        total_portfolio_value=trading_api_pb2.DecimalValue(units=int(self.account_value), nanos=int((self.account_value % 1) * 1e9)),
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
                    hist_prices = load_backfill_prices(f"data/BTCUSD_1min.csv", 30)
                    asset_returns = calculate_returns(hist_prices)
                    asset_history = trading_api_pb2.AssetHistory(returns=asset_returns)
                    asset_histories = {bot.symbol: asset_history}

                    var_request = trading_api_pb2.VaRRequest(
                        current_portfolio=portfolio,
                        risk_model="monte_carlo",
                        confidence_level=0.95,
                        horizon_days=1,
                        asset_histories=asset_histories
                    )
                    # print(f"Calculating VaR for bot {bot.name} with portfolio: {portfolio}")
                    try:
                        var_response = await risk_stub.CalculateVaR(var_request, metadata=metadata)
                        # print(f"[DEBUG] VaR response: {var_response.value_at_risk}")
                        
                        def decimal_value_to_float(decimal_value):
                            return float(decimal_value.units) + float(decimal_value.nanos) / 1e9

                        risk_value = decimal_value_to_float(var_response.value_at_risk)
                        risk_ok = risk_value <= (bot.account_value * 0.10)
                        
                        print(f"Risk check for bot {bot.name}: VaR {risk_value:.2f}, OK: {risk_ok}")
                        
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
                            order_response = await order_stub.CreateOrder(order_request, metadata=metadata)
                            print(f"Order submitted for bot {bot.name}: {order_response.status}")
                        else:
                            print(f"Order blocked for bot {bot.name}: VaR {risk_value:.2f} over limit")
                    except grpc.aio.AioRpcError as e:
                        print(f"Error calculating VaR for bot {bot.name}: {e.details()}")

            state = {
                "last_signal": signal.get('action'),
                "zscore": float(signal.get('zscore')) if signal.get('zscore') is not None else None,
                "size": float(signal.get('size')) if signal.get('size') is not None else None,
                "timestamp": int(time.time()),
                "price": float(price),
                "bot_name": bot.name,
                "strategy": bot.strategy,
                "account_value": float(bot.account_value),
            }
            # print(f"Bot {bot.name} state updated: {state}")
            await update_bot_state(bot_stub, bot.bot_id, state, metadata)

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
