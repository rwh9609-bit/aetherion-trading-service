#!/usr/bin/env python3
import os
import grpc
import pandas as pd
import sys
import json
import time
import jwt
import uuid
from datetime import datetime
from strategies.mean_reversion import MeanReversionStrategy, MeanReversionParams
from fetch_binance import fetch_price
from protos import trading_api_pb2, trading_api_pb2_grpc

# Add protos path to sys.path
script_dir = os.path.dirname(__file__)
protos_path = os.path.join(script_dir, "protos")

def load_backfill_prices(csv_path, lookback_period):
    df = pd.read_csv(csv_path)
    prices = df['price'].tolist()  # <-- fix: use 'price' instead of 'close'
    return prices[-lookback_period:]

def format_symbol_for_exchange(symbol, exchange):
    symbol = symbol.strip()
    if exchange == "coinbase":
        # Convert ETHUSD -> ETH-USD
        if len(symbol) > 3 and "-" not in symbol:
            return symbol[:3] + "-" + symbol[3:]
        return symbol
    elif exchange == "binance":
        # Convert ETHUSD -> ETHUSDT
        if symbol.endswith("USD") and not symbol.endswith("USDT"):
            return symbol + "T"
        return symbol
    return symbol

class TradingOrchestrator:
    def __init__(self):
        self.go_service_addr = os.environ.get('GO_SERVICE_ADDR', 'localhost:50051')
        self.rust_service_addr = os.environ.get('RUST_SERVICE_ADDR', 'localhost:50052')
        # extract account value
        # this is what actually sets bot's account value (initially) from docker compose. It's then overriden by bot_service.go.
        self.account_value = float(os.environ.get('INITIAL_ACCOUNT_VALUE', '1000000.0'))
        self.auth_secret = os.environ.get('AUTH_SECRET', None)
        if self.auth_secret:
            masked_secret = self.auth_secret[:4] + '...' + self.auth_secret[-4:] if len(self.auth_secret) > 8 else '***'
            print(f"[DEBUG] AUTH_SECRET loaded: {masked_secret}")
        else:
            print("[DEBUG] AUTH_SECRET not set.")
        # Initialize strategy
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
    
    def fetch_trade_history(self, trading_stub, bot_id, metadata):
        try:
            history_req = trading_api_pb2.TradeHistoryRequest(user_id=bot_id)
            history_resp = trading_stub.GetTradeHistory(history_req, metadata=metadata)
            print(f"Trade history for bot {bot_id}:")
            for trade in history_resp.trades:
                print(f"  {trade.trade_id}: {trade.side} {trade.quantity} {trade.symbol} @ {trade.price} on {datetime.fromtimestamp(trade.executed_at)}")
        except grpc.RpcError as e:
            print(f"Error fetching trade history for bot {bot_id}: {e.details()}")

    def run(self):
        """Main orchestrator loop: fetch bots and execute trades for each bot."""
        print(f"Connecting to Go service at {self.go_service_addr}")
        print(f"Connecting to Rust service at {self.rust_service_addr}")
        with grpc.insecure_channel(self.go_service_addr) as trading_channel, \
            grpc.insecure_channel(self.rust_service_addr) as risk_channel:
            trading_stub = trading_api_pb2_grpc.TradingServiceStub(trading_channel)
            risk_stub = trading_api_pb2_grpc.RiskServiceStub(risk_channel)  
            while True:
                try:
                    token = self._generate_jwt()  # <-- Move here
                    metadata = []
                    if token:
                        metadata.append(('authorization', f'Bearer {token}'))
                    print(f"[DEBUG] gRPC metadata: {metadata}")

                    # 1. Fetch all bots from Go backend
                    bot_stub = trading_api_pb2_grpc.BotServiceStub(trading_channel)
                    bot_list = bot_stub.ListBots(trading_api_pb2.Empty(), metadata=metadata)
                    # This is spammy.
                    # print(f"[DEBUG] Bot list: {bot_list}")
                    for bot in bot_list.bots:
                        if not getattr(bot, "is_active", False):
                            print(f"[Orchestrator] Skipping inactive bot: {bot.name} ({bot.bot_id})")
                            continue  # Skip inactive bots
                        print(f"[Orchestrator] Processing bot: {bot.name} ({bot.bot_id})")

                        for raw_symbol in bot.symbol.split(","):
                            coinbase_symbol = format_symbol_for_exchange(raw_symbol, "coinbase")
                            binance_symbol = format_symbol_for_exchange(raw_symbol.replace("-", ""), "binance")
                            # print(f"[DEBUG] Mapped symbols: raw={raw_symbol}, coinbase={coinbase_symbol}, binance={binance_symbol}")

                            # Fetch price from Binance 
                            price = fetch_price(binance_symbol)
                            # print(f"Current price for {binance_symbol} (Binance): {price if price is not None else 'N/A'}")

                            # Defensive: handle None price
                            if price is None:
                                # print(f"[ERROR] Could not fetch price for {binance_symbol} from Binance.")
                                # Fetch price from Coinbase
                                price = fetch_price(coinbase_symbol)
                                # print(f"Current price for {coinbase_symbol} (Coinbase): {price if price is not None else 'N/A'}")
                            if price is None:
                                print(f"[ERROR] Could not fetch price for {coinbase_symbol} from Coinbase. Skipping trade logic.")
                                continue

                            # If you want to fetch from Coinbase, use coinbase_symbol
                            # coinbase_price = fetch_coinbase_price(coinbase_symbol)
                            # print(f"Current price for {coinbase_symbol} (Coinbase): ${coinbase_price:,.2f}")
                            # ...rest of your trading logic...
                            # If you want to fetch from Coinbase, use coinbase_symbol
                            # coinbase_price = fetch_coinbase_price(coinbase_symbol)
                            # print(f"Current price for {coinbase_symbol} (Coinbase): ${coinbase_price:,.2f}")
                            # 3. Generate trading signal (replace with bot-specific strategy)
                            # For demo, use mean reversion for all
                            signal = self.strategy.generate_signal(price, bot.account_value)
                            # print(f"[DEBUG] Signal details: {signal}")

                            if signal['action'] != 'hold' and signal['size'] > 0:
                                print(f"Generated signal for bot {bot.name}: {json.dumps(signal)}")
                                positions_map = {bot.symbol: signal['size'] if signal['action']=='buy' else -signal['size']}
                                portfolio = trading_api_pb2.Portfolio(positions=positions_map, total_value_usd=self.account_value)
                                print(f"[DEBUG] VaR request: positions={positions_map}, total_value_usd={self.account_value}")
                                var_request = trading_api_pb2.VaRRequest(
                                    current_portfolio=portfolio,
                                    risk_model="monte_carlo",
                                    confidence_level=0.95,
                                    horizon_days=1
                                )
                                print(f"Calculating VaR for bot {bot.name} with portfolio: {portfolio}")
                                try:
                                    var_response = risk_stub.CalculateVaR(var_request, metadata=metadata)
                                    print(f"[DEBUG] VaR response: {var_response.value_at_risk}")
                                    if var_response.value_at_risk is not None and bot.account_value is not None:
                                        risk_ok = float(var_response.value_at_risk) <= (bot.account_value * 0.10)
                                    else:
                                        risk_ok = False
                                    print(f"Risk check: VaR {var_response.value_at_risk:.2f}, OK: {risk_ok}")
                                    if risk_ok:
                                        strategy_id = getattr(bot, "strategy_id", None) 
                                        if not strategy_id or strategy_id == "":
                                            print(f"[WARNING] Strategy ID is missing for bot {bot.name}, generating a new one.")
                                            # Generate a random UUID if missing
                                            strategy_id = str(uuid.uuid4())
                                        trade_request = trading_api_pb2.TradeRequest(
                                            symbol=bot.symbol,
                                            side=signal['action'].upper(),
                                            size=float(signal['size']),
                                            price=float(price),
                                            user_id=bot.bot_id,
                                            strategy_id=strategy_id
                                        )
                                        try:
                                            trade_response = trading_stub.ExecuteTrade(trade_request, metadata=metadata)
                                            print(f"Trade executed for bot {bot.name} @ {trade_response.executed_price:.2f}: {trade_response.message}")
                                            print(f"Signal: {json.dumps(signal)}  VaR: {var_response.value_at_risk:.2f}")
                                            if hasattr(trade_response, 'pnl'):
                                                self.account_value += float(trade_response.pnl)
                                                print(f"Account value: ${self.account_value:,.2f}")
                                        except grpc.RpcError as e:
                                            print(f"Error executing trade for bot {bot.name}: {e.details()}")
                                    else:
                                        print(f"Trade blocked for bot {bot.name}: VaR {var_response.value_at_risk:.2f} over limit")
                                except grpc.RpcError as e:
                                    print(f"Error calculating VaR for bot {bot.name}: {e.details()}")
                        # Add logging for trade execution

                        # After trading logic, fetch trade history:
                        self.fetch_trade_history(trading_stub, bot.bot_id, metadata)

                    time.sleep(20)

                except Exception as e:
                    print(f"Error in orchestrator loop: {str(e)}")
                    time.sleep(60)

if __name__ == "__main__":
    print("Starting Trading Orchestrator...")
    orchestrator = TradingOrchestrator()
    try:
        orchestrator.run()
    except KeyboardInterrupt:
        print("\nOrchestrator shutdown.")
# Example: Run a backtest programmatically
from backtest_engine import BacktestEngine, load_historical_data
from strategies.mean_reversion import MeanReversionStrategy, MeanReversionParams
params = MeanReversionParams(lookback_period=20, entry_std_dev=2.0, exit_std_dev=0.5)
strategy = MeanReversionStrategy(params)
historical_data = load_historical_data("data/BTCUSD_1min.csv")
engine = BacktestEngine(strategy, historical_data)
trades, equity_curve = engine.run()
print(f"Backtest complete: {len(trades)} trades, {len(equity_curve)} equity points.")
