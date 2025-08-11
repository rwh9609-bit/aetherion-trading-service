# Aetherion Trading Engine: A Polyglot Microservice Architecture

A high-performance trading engine demonstrating modern microservice architecture using Go, Rust, Python, and React. Features real-time order book streaming, advanced risk calculations, and automated trading strategies.

## Architecture Overview

![Architecture Diagram](docs/architecture.png)

The system consists of four main components:

1. **React Frontend (Port 3000)**
   - Real-time order book visualization
   - Risk metrics dashboard
   - Strategy control panel
   - Material-UI components
   - gRPC-Web for backend communication

2. **Go Trading Service (Ports 50051/8080)**
   - Order book management
   - Price feed aggregation
   - WebSocket market data streams
   - gRPC-Web proxy (Port 8080)
   - Real-time trading execution

3. **Rust Risk Service (Port 50052)**
   - Monte Carlo VaR calculations
   - Real-time risk assessment
   - Position limit monitoring
   - High-performance computations

4. **Python Strategy Service**
   - Mean reversion strategy implementation
   - Multiple data source handling
   - Position sizing logic
   - Trading signal generation

## Quick Start

### Prerequisites
```bash
# macOS (using Homebrew)
brew install protobuf go rust python@3.11 node

# Install language-specific tools
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
npm install -g protoc-gen-grpc-web
```

### Build & Run
```bash
# Clone the repository
git clone https://github.com/rwh9609-bit/multilanguage.git
cd multilanguage

# Setup development environment
make setup

# Generate Protocol Buffers
make generate

# Build all services
make build

# Run all services
make run

# Visit http://localhost:3000 in your browser
```

### Development Workflow

1. **Making Changes**
   - Frontend: Edit files in `frontend/src/`
   - Go Service: Edit files in `go/`
   - Rust Service: Edit files in `rust/risk_service/src/`
   - Python Service: Edit files in `python/`

2. **API Changes**
   - Edit `protos/trading_api.proto`
   - Run `make generate` to update all services
   - Restart services with `make stop && make run`

3. **Testing Changes**
   ```bash
   # Run tests for each service
   cd go && go test ./...
   cd rust/risk_service && cargo test
   cd python && python -m pytest
   cd frontend && npm test
   ```
- **Python tools**:
  ```sh
  pip install grpcio grpcio-tools
  ```
Make sure your Go bin directory is in your `PATH` (e.g., `export PATH="$PATH:$(go env GOPATH)/bin"`).

### Build & Run

1.  **Set up Python Environment**: This creates a virtual environment and installs required packages.
    ```sh
    make setup
    ```

2.  **Generate gRPC Code**: This command uses `protoc` to generate client and server code from `protos/trading_api.proto` for all languages. The Python gRPC code generation now correctly activates the virtual environment to ensure `grpc_tools` is found.
    ```sh
    make generate
    ```

3.  **Run the Services**: Open three separate terminals and run one command in each to start the services and the client.
    -   **Terminal 1 (Go Service):** `make run-go-service`
    -   **Terminal 2 (Rust Service):** `make run-rust-service`
    -   **Terminal 3 (Python Client):** `make run-python-client`

## Implemented Features

### Trading Strategy
- **Mean Reversion Strategy**:
  - Dynamic z-score based entry/exit signals
  - Configurable lookback periods and deviation thresholds
  - Automatic position sizing based on account risk
  - Stop-loss protection

### Risk Management
- **Value at Risk (VaR) Calculations**:
  - Pre-trade risk assessment
  - Position-level risk limits
  - Portfolio-level exposure controls
  - Configurable confidence levels

### Market Data Integration
- **Multi-Exchange Support**:
  - Primary: Coinbase Pro REST API
  - Fallback: Binance REST API
  - Automatic failover between sources
  - Configurable update frequency

### System Architecture
- **Microservices Design**:
  - Independent scaling of components
  - gRPC-based communication
  - HTTP monitoring endpoints
  - Graceful error handling

## Configuration

### Environment Variables
```sh
# Service Addresses
GO_SERVICE_ADDR=localhost:50051
RUST_SERVICE_ADDR=localhost:50052

# Trading Parameters
INITIAL_ACCOUNT_VALUE=10000.0
RISK_PER_TRADE=0.01
MAX_POSITION_SIZE=0.1
STOP_LOSS_PCT=0.02

# Strategy Parameters
LOOKBACK_PERIOD=20
ENTRY_STD_DEV=2.0
EXIT_STD_DEV=0.5
```

### Risk Management Settings
```python
# In python/strategies/mean_reversion.py
class MeanReversionParams:
    lookback_period: int = 20
    entry_std_dev: float = 2.0
    exit_std_dev: float = 0.5
    max_position_size: float = 0.1
    stop_loss_pct: float = 0.02
    risk_per_trade_pct: float = 0.01
```

## Development

### Regenerating gRPC Code
If you modify `protos/trading_api.proto`, you must regenerate the client and server code for all languages.

```sh
make generate
```

### Cleaning Up
To remove all generated code and build artifacts, run:
```sh
make clean
```

## License
MIT
