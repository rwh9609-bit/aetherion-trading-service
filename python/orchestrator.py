# This is a conceptual example of what the Python client would look like.
import os
import grpc

# It's good practice to handle the case where the generated code doesn't exist yet.
try:
    import protos.trading_api_pb2 as pb
    import protos.trading_api_pb2_grpc as rpc
except ImportError:
    print("Error: gRPC modules not found. Please run 'make generate' first.")
    exit(1)

def run_orchestrator():
    go_service_addr = os.environ.get('GO_SERVICE_ADDR', 'localhost:50051')

    # Establish a connection to the Go gRPC server
    channel = grpc.insecure_channel(go_service_addr)
    stub = rpc.TradingServiceStub(channel)

    # --- Control Plane Example: Start a strategy ---
    print("--- Starting Strategy ---")
    strategy_req = pb.StrategyRequest(
        strategy_id="mean_reversion_01",
        symbol="BTC-USD",
        parameters={"order_size": "0.1"}
    )
    status_response = stub.StartStrategy(strategy_req)
    print(f"Server response: {status_response.message}")


    # --- Data Plane Example: Subscribe to a data stream ---
    print("\n--- Subscribing to Market Data ---")
    try:
        # This call is non-blocking and returns an iterator
        for tick in stub.SubscribeTicks(strategy_req):
            print(f"Received Tick: {tick.symbol} Price={tick.price:.2f}")
            # Here, you would feed the tick into your Python-based
            # models, risk checks, or analytics dashboards.

    except KeyboardInterrupt:
        print("Unsubscribing from market data.")
    except grpc.RpcError as e:
        print(f"An error occurred: {e.details()}")

if __name__ == '__main__':
    run_orchestrator()
