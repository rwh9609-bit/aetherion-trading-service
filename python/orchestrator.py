#!/usr/bin/env python3
import os
import grpc
import sys
import json
import time
from datetime import datetime
from strategies.mean_reversion import MeanReversionStrategy, MeanReversionParams
from fetch_binance import fetch_binance_price

# Add protos path to sys.path
script_dir = os.path.dirname(__file__)
protos_path = os.path.join(script_dir, "protos")
if protos_path not in sys.path:
    sys.path.insert(0, protos_path)

try:
    import trading_api_pb2 as pb
    import trading_api_pb2_grpc as rpc
except ImportError:
    print("Error: gRPC modules not found. Please run 'make generate' first.")
    exit(1)

class TradingOrchestrator:
    def __init__(self):
        self.go_service_addr = os.environ.get('GO_SERVICE_ADDR', 'localhost:50051')
        self.rust_service_addr = os.environ.get('RUST_SERVICE_ADDR', 'localhost:50052')
        self.account_value = float(os.environ.get('INITIAL_ACCOUNT_VALUE', '10000.0'))
        
        # Initialize strategy
        params = MeanReversionParams(
            lookback_period=20,
            entry_std_dev=2.0,
            exit_std_dev=0.5,
            max_position_size=0.1,
            stop_loss_pct=0.02,
            risk_per_trade_pct=0.01
        )
        self.strategy = MeanReversionStrategy(params)

    def run(self):
        """Main strategy execution loop"""
        print(f"Connecting to Go service at {self.go_service_addr}")
        print(f"Connecting to Rust service at {self.rust_service_addr}")
        
        with grpc.insecure_channel(self.go_service_addr) as trading_channel, \
             grpc.insecure_channel(self.rust_service_addr) as risk_channel:
            
            trading_stub = rpc.TradingServiceStub(trading_channel)
            risk_stub = rpc.RiskServiceStub(risk_channel)
            
            # Start the strategy
            print("Starting strategy...")
            strategy_req = pb.StrategyRequest(
                strategy_id="mean_reversion_01",
                symbol="BTC-USD",
                parameters={"order_size": "0.1"}
            )
            
            try:
                status_response = trading_stub.StartStrategy(strategy_req)
                print(f"Strategy initialized: {status_response.message}")
            except grpc.RpcError as e:
                print(f"Error initializing strategy: {e.details()}")
                return
            
            while True:
                try:
                    # 1. Fetch current price
                    price = fetch_binance_price("BTCUSDT")
                    print(f"Current BTC price: ${price:,.2f}")
                    
                    # 2. Generate trading signal
                    signal = self.strategy.generate_signal(price, self.account_value)
                    
                    # 3. If we have a trade signal, check risk and execute
                    if signal['action'] != 'hold' and signal['size'] > 0:
                        # Build simplified portfolio (positions map only)
                        positions_map = {"BTC-USD": signal['size'] if signal['action']=='buy' else -signal['size']}
                        portfolio = pb.Portfolio(positions=positions_map, total_value_usd=self.account_value)
                        var_request = pb.VaRRequest(
                            current_portfolio=portfolio,
                            risk_model="monte_carlo",
                            confidence_level=0.95,
                            horizon_days=1
                        )
                        try:
                            var_response = risk_stub.CalculateVaR(var_request)
                            risk_ok = var_response.value_at_risk <= (self.account_value * 0.02)
                            if risk_ok:
                                trade_request = pb.TradeRequest(
                                    symbol="BTC-USD",
                                    side=signal['action'].upper(),
                                    size=float(signal['size']),
                                    price=float(price)
                                )
                                try:
                                    trade_response = trading_stub.ExecuteTrade(trade_request)
                                    print(f"Trade executed @ {trade_response.executed_price:.2f}: {trade_response.message}")
                                    print(f"Signal: {json.dumps(signal)}  VaR: {var_response.value_at_risk:.2f}")
                                    if hasattr(trade_response, 'pnl'):
                                        self.account_value += float(trade_response.pnl)
                                        print(f"Account value: ${self.account_value:,.2f}")
                                except grpc.RpcError as e:
                                    print(f"Error executing trade: {e.details()}")
                            else:
                                print(f"Trade blocked: VaR {var_response.value_at_risk:.2f} over limit")
                        except grpc.RpcError as e:
                            print(f"Error calculating VaR: {e.details()}")
                    time.sleep(60)
                except Exception as e:
                    print(f"Error in loop: {str(e)}")
                    time.sleep(60)

if __name__ == "__main__":
    print("Starting Trading Orchestrator...")
    orchestrator = TradingOrchestrator()
    try:
        orchestrator.run()
    except KeyboardInterrupt:
        print("\nOrchestrator shutdown.")
