# This is a conceptual example of what the Python client would look like.
import os
import grpc
import sys

# Explicitly add the protos directory to sys.path
# This is often necessary for generated gRPC code to be found correctly
script_dir = os.path.dirname(__file__)
protos_path = os.path.join(script_dir, "protos")
if protos_path not in sys.path:
    sys.path.insert(0, protos_path) # Add to the beginning of sys.path

# It's good practice to handle the case where the generated code doesn't exist yet.
try:
    import trading_api_pb2 as pb # Changed import to directly import the module
    import trading_api_pb2_grpc as rpc # Changed import to directly import the module
except ImportError:
    print("Error: gRPC modules not found. Please run 'make generate' first.")
    exit(1)

def run_orchestrator():
    """
    Connects to the Go and Rust gRPC services and orchestrates calls between them.
    """
    go_service_addr = os.environ.get('GO_SERVICE_ADDR', 'localhost:50051')
    rust_service_addr = os.environ.get('RUST_SERVICE_ADDR', 'localhost:50052')

    # Use `with` statements to ensure channels are properly closed
    with grpc.insecure_channel(go_service_addr) as trading_channel, \
         grpc.insecure_channel(rust_service_addr) as risk_channel:
        
        trading_stub = rpc.TradingServiceStub(trading_channel)
        risk_stub = rpc.RiskServiceStub(risk_channel)

        # --- 1. Call Go Service to Start a Strategy ---
        print("--- 1. Starting Strategy via Go Service ---")
        strategy_req = pb.StrategyRequest(
            strategy_id="mean_reversion_01",
            symbol="BTC-USD",
            parameters={"order_size": "0.1"}
        )
        try:
            status_response = trading_stub.StartStrategy(strategy_req)
            print(f"Go service response: {status_response.message}")
        except grpc.RpcError as e:
            print(f"Error connecting to Go Trading Service: {e.details()}")
            return

        # --- 2. Call Rust Service for Risk Calculation ---
        print("\n--- 2. Calculating Portfolio Risk via Rust Service ---")
        # Create a dummy portfolio to send to the risk service
        dummy_portfolio = pb.PortfolioResponse(
            positions={"BTC": 1.5, "USD": 50000.0},
            total_value_usd=125000.0
        )
        var_req = pb.VaRRequest(
            current_portfolio=dummy_portfolio,
            risk_model="monte_carlo"
        )
        try:
            var_response = risk_stub.CalculateVaR(var_req)
            print(f"Rust service calculated Value at Risk (VaR): ${var_response.value_at_risk:.2f}")
        except grpc.RpcError as e:
            print(f"Error connecting to Rust Risk Service: {e.details()}")

        # --- 3. Subscribe to Market Data Stream from Go Service ---
        print("\n--- 3. Subscribing to Market Data from Go Service ---")
        last_btc_price = None # Initialize variable to track last BTC price
        try:
            # This call is non-blocking and returns an iterator
            for tick in trading_stub.SubscribeTicks(strategy_req):
                print(f"Received Tick: {tick.symbol} Price={tick.price:.2f} (Timestamp: {tick.timestamp_ns})")
                
                # Simple logic: Detect price change for BTC-USD
                if tick.symbol == "BTC-USD":
                    if last_btc_price is None:
                        last_btc_price = tick.price
                        print(f"[ORCHESTRATOR] Initial BTC-USD price set to: {last_btc_price:.2f}")
                    elif tick.price != last_btc_price:
                        print(f"[ORCHESTRATOR] BTC-USD price changed from {last_btc_price:.2f} to {tick.price:.2f}")
                        last_btc_price = tick.price

        except KeyboardInterrupt:
            print("\nUnsubscribing from market data.")
        except grpc.RpcError as e:
            print(f"An error occurred during streaming: {e.details()}")

if __name__ == '__main__':
    run_orchestrator()