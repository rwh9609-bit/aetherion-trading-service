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
from fetch_binance import fetch_binance_price
from protos import trading_api_pb2, trading_api_pb2_grpc

# Add protos path to sys.path
script_dir = os.path.dirname(__file__)
protos_path = os.path.join(script_dir, "protos")

def load_backfill_prices(csv_path, lookback_period):
    df = pd.read_csv(csv_path)
    prices = df['price'].tolist()  # <-- fix: use 'price' instead of 'close'
    return prices[-lookback_period:]

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
    
    # def fetch_trade_history(self, trading_stub, bot_id, metadata):
    #     try:
    #         history_req = trading_api_pb2.TradeHistoryRequest(user_id, bot_id)
    #         history_resp = trading_stub.GetTradeHistory(history_req, metadata=metadata)
    #         print(f"Trade history for bot {bot_id}:")
    #         for trade in history_resp.trades:
    #             print(f"  {trade.trade_id}: {trade.side} {trade.quantity} {trade.symbol} @ {trade.price} on {datetime.fromtimestamp(trade.executed_at)}")
    #     except grpc.RpcError as e:
    #         print(f"Error fetching trade history for bot {bot_id}: {e.details()}")

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
                    # print(f"[DEBUG] gRPC metadata: {metadata}")

                    # 1. Fetch all bots from Go backend
                    bot_stub = trading_api_pb2_grpc.BotServiceStub(trading_channel)
                    bot_list = bot_stub.ListBots(trading_api_pb2.Empty(), metadata=metadata)
                    # This is spammy.
                    # print(f"[DEBUG] Bot list: {bot_list}")
                    for bot in bot_list.bots:
                        if not getattr(bot, "is_active", False):
                            # print(f"[Orchestrator] Skipping inactive bot: {bot.name} ({bot.bot_id})")
                            continue  # Skip inactive bots
                        print(f"[Orchestrator] Processing bot: {bot.name} ({bot.bot_id})")
                        # 2. Fetch current price for bot's symbol
                        price = fetch_binance_price(bot.symbol.replace("-", ""))
                        print(f"Current price for {bot.symbol}: ${price:,.2f}")
                        # 3. Generate trading signal (replace with bot-specific strategy)
                        # For demo, use mean reversion for all
                        signal = self.strategy.generate_signal(price, bot.account_value)
                        # print(f"[DEBUG] Signal details: {signal}")
                        if signal['action'] == 'hold':
                            print(f"[INFO] No trade signal for bot {bot.name}: zscore={signal.get('zscore')}, price={price}, reason=Hold action")
                        elif signal['size'] == 0:
                            print(f"[INFO] Signal size is zero for bot {bot.name}: zscore={signal.get('zscore')}, price={price}, reason=Zero size")
                        else:
                            print(f"[INFO] Trade signal for bot {bot.name}: action={signal['action']}, size={signal['size']}, stop_loss={signal.get('stop_loss')}")

                        if signal['action'] != 'hold' and signal['size'] > 0:
                            print(f"Generated signal for bot {bot.name}: {json.dumps(signal)}")
                            positions_map = {bot.symbol: signal['size'] if signal['action']=='buy' else -signal['size']}
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
                                    def decimal_value_to_float(decimal_value):
                                        return float(decimal_value.units) + float(decimal_value.nanos) / 1e9

                                    risk_value = decimal_value_to_float(var_response.value_at_risk)
                                    risk_ok = risk_value <= (bot.account_value * 0.10)
                                else:
                                    risk_ok = False
                                def decimal_value_to_float(decimal_value):
                                    return float(decimal_value.units) + float(decimal_value.nanos) / 1e9

                                risk_value = decimal_value_to_float(var_response.value_at_risk)
                                print(f"Risk check: VaR {risk_value:.2f}, OK: {risk_ok}")
                                if risk_ok:
                                    strategy = getattr(bot, "strategy_id", None)
                                    order_stub = trading_api_pb2_grpc.OrderServiceStub(trading_channel)
                                    order_request = trading_api_pb2.CreateOrderRequest(
                                        bot_id=bot.bot_id,
                                        symbol=bot.symbol,
                                        side=trading_api_pb2.BUY if signal['action'].lower() == 'buy' else trading_api_pb2.SELL,
                                        type=trading_api_pb2.MARKET,  # or LIMIT/STOP as needed
                                        quantity=trading_api_pb2.DecimalValue(
                                            units=int(signal['size']),
                                            nanos=int((signal['size'] % 1) * 1e9)
                                        ),
                                        # limit_price=...,  # set if needed
                                        # stop_price=...,   # set if needed
                                    )
                                    order_response = order_stub.CreateOrder(order_request, metadata=metadata)
                                    print(f"Order submitted for bot {bot.name}: {order_response.status}")
                                else:
                                    print(f"Order blocked for bot {bot.name}: VaR {risk_value:.2f} over limit")
                            except grpc.RpcError as e:
                                print(f"Error calculating VaR for bot {bot.name}: {e.details()}")
                        # Add logging for trade execution

                        # After trading logic, fetch trade history:
                        # self.fetch_trade_history(trading_stub, bot.bot_id, metadata)

                    time.sleep(1)

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
