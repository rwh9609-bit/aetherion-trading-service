# Developer Documentation

This document contains technical setup instructions, API documentation, and development guidelines for the Aetherion Trading Engine.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Architecture Overview](#architecture-overview)
- [Development Workflow](#development-workflow)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Deployment](#deployment)

## Prerequisites

### Required Software

```bash
# macOS (using Homebrew)
brew install protobuf go rust python@3.11 node envoy

# Ubuntu/Debian
sudo apt update
sudo apt install protobuf-compiler golang-go rust-all nodejs npm python3.11 python3.11-venv

# Language-specific tools
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
npm install -g protoc-gen-grpc-web
pip install grpcio grpcio-tools
```

### Version Requirements

- **Go**: 1.21+
- **Rust**: 1.70+  
- **Python**: 3.11+
- **Node.js**: 18+
- **Protocol Buffers**: 3.15+

## Installation & Setup

### 1. Clone Repository
```bash
git clone https://github.com/rwh9609-bit/multilanguage.git
cd multilanguage
```

### 2. Environment Setup
```bash
# Setup development environment
make setup

# Verify Go PATH
export PATH="$PATH:$(go env GOPATH)/bin"
```

### 3. Generate Protocol Buffers
```bash
# Generate gRPC code for all languages
make generate
```

### 4. Build Services
```bash
# Build all services
make build
```

### 5. Run Services
```bash
# Option 1: Run all services at once
make run

# Option 2: Run services individually
make run-go-service      # Terminal 1
make run-rust-service    # Terminal 2  
make run-python-client   # Terminal 3
```

## Architecture Overview

### System Components

#### 1. React Frontend (Port 3000)
- **Location**: `frontend/`
- **Technology**: React 18, Material-UI, gRPC-Web
- **Features**:
  - Real-time order book visualization
  - Risk metrics dashboard
  - Strategy control panel
  - User authentication

#### 2. Envoy Proxy (Port 8080)
- **Configuration**: `envoy.yaml`
- **Purpose**: gRPC-Web to gRPC translation
- **Routes**:
  - `/trading.TradingService/*` → Go Service (50051)
  - `/trading.RiskService/*` → Rust Service (50052)
  - `/trading.AuthService/*` → Go Service (50051)

#### 3. Go Trading Service (Port 50051)
- **Location**: `go/`
- **Features**:
  - Order book management
  - Price feed aggregation (Coinbase WebSocket)
  - Authentication & JWT handling
  - gRPC streaming endpoints

#### 4. Rust Risk Service (Port 50052)  
- **Location**: `rust/risk_service/`
- **Features**:
  - Monte Carlo VaR calculations
  - Real-time risk assessment
  - High-performance computations

#### 5. Python Strategy Service
- **Location**: `python/`
- **Features**:
  - Mean reversion strategy
  - Multiple data source handling
  - Trading signal generation

### Data Flow

```
Browser → React → Envoy → gRPC Services
                    ↓
Market Data APIs → Go Service → Event Bus → Frontend
                    ↓
Risk Calculations ← Rust Service
                    ↓  
Strategy Decisions ← Python Service
```

## Development Workflow

### Making Changes

1. **Frontend Changes**
   ```bash
   cd frontend/
   npm start  # Hot reload enabled
   ```

2. **Go Service Changes**
   ```bash
   cd go/
   go run .
   # Or use air for hot reload: air
   ```

3. **Rust Service Changes**
   ```bash
   cd rust/risk_service/
   cargo run
   # Or with watch: cargo watch -x run
   ```

4. **Python Service Changes**
   ```bash
   cd python/
   ../venv/bin/python main.py
   ```

### Protocol Buffer Changes

When modifying `protos/trading_api.proto`:

1. **Update the proto file**
2. **Regenerate code**: `make generate`
3. **Update implementations** in each service
4. **Restart all services**: `make restart`

### Adding New gRPC Methods

1. **Define in proto**:
   ```protobuf
   service TradingService {
     rpc NewMethod(NewRequest) returns (NewResponse) {}
   }
   ```

2. **Implement in Go**:
   ```go
   func (s *tradingServer) NewMethod(ctx context.Context, req *pb.NewRequest) (*pb.NewResponse, error) {
     // Implementation
   }
   ```

3. **Add to frontend**:
   ```javascript
   export const newMethod = async (data) => {
     const req = new NewRequest();
     // Set fields...
     return promisify(tradingClient.newMethod.bind(tradingClient))(req, createMetadata());
   };
   ```

## API Documentation

### Trading Service APIs

#### Authentication
```protobuf
rpc Register(RegisterRequest) returns (AuthResponse) {}
rpc Login(AuthRequest) returns (AuthResponse) {}
```

#### Market Data
```protobuf
rpc GetPrice(Tick) returns (Tick) {}
rpc StreamOrderBook(OrderBookRequest) returns (stream OrderBook) {}
rpc StreamPrice(TickStreamRequest) returns (stream Tick) {}
```

#### Symbol Management
```protobuf
rpc AddSymbol(SymbolRequest) returns (StatusResponse) {}
rpc RemoveSymbol(SymbolRequest) returns (StatusResponse) {}
rpc ListSymbols(Empty) returns (SymbolList) {}
```

#### Strategy Control
```protobuf
rpc StartStrategy(StrategyRequest) returns (StatusResponse) {}
rpc StopStrategy(StrategyRequest) returns (StatusResponse) {}
```

#### Portfolio Management
```protobuf
rpc GetPortfolio(PortfolioRequest) returns (Portfolio) {}
```

### Risk Service APIs

```protobuf
rpc CalculateVaR(VaRRequest) returns (VaRResponse) {}
```

### Message Types

#### Core Messages
```protobuf
message Tick {
    string symbol = 1;
    double price = 2;
    int64 timestamp_ns = 3;
}

message OrderBook {
    repeated OrderBookEntry bids = 1;
    repeated OrderBookEntry asks = 2;
    string symbol = 3;
}

message Portfolio {
    map<string, double> positions = 1;
    double total_value_usd = 2;
    optional double last_price_change = 3;
}
```

## Testing

### Unit Tests

```bash
# Go tests
cd go/
go test ./... -v

# Rust tests  
cd rust/risk_service/
cargo test

# Python tests
cd python/
../venv/bin/python -m pytest

# Frontend tests
cd frontend/
npm test
```

### Integration Tests

```bash
# Start all services
make run

# Run integration test suite
cd tests/
./run_integration_tests.sh
```

### Load Testing

```bash
# gRPC load testing with ghz
ghz --insecure --proto protos/trading_api.proto \
    --call trading.TradingService.GetPrice \
    --data '{"symbol":"BTC-USD"}' \
    localhost:50051
```

## Configuration

### Environment Variables

```bash
# Service Configuration
export GO_SERVICE_ADDR=localhost:50051
export RUST_SERVICE_ADDR=localhost:50052
export ENVOY_PROXY_ADDR=localhost:8080
export FRONTEND_PORT=3000

# Authentication
export AUTH_SECRET=your-secret-key-here
export JWT_EXPIRY_HOURS=24

# Trading Parameters
export INITIAL_ACCOUNT_VALUE=10000.0
export RISK_PER_TRADE=0.01
export MAX_POSITION_SIZE=0.1
export STOP_LOSS_PCT=0.02

# Strategy Parameters
export LOOKBACK_PERIOD=20
export ENTRY_STD_DEV=2.0
export EXIT_STD_DEV=0.5

# Market Data
export COINBASE_WS_URL=wss://ws-feed.exchange.coinbase.com
export BINANCE_API_URL=https://api.binance.com
```

### Service-Specific Configuration

#### Go Service (`go/main.go`)
```go
type Config struct {
    Port           string
    AuthSecret     []byte
    MaxConnections int
    Keepalive      time.Duration
}
```

#### Rust Service (`rust/risk_service/src/main.rs`)
```rust
pub struct RiskConfig {
    pub port: u16,
    pub var_confidence: f64,
    pub simulation_count: usize,
}
```

#### Python Service (`python/config.py`)
```python
@dataclass
class StrategyConfig:
    lookback_period: int = 20
    entry_std_dev: float = 2.0
    exit_std_dev: float = 0.5
    max_position_size: float = 0.1
    stop_loss_pct: float = 0.02
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Find and kill process
   lsof -ti:50051 | xargs kill -9
   ```

2. **Protocol Buffer Issues**
   ```bash
   # Clean and regenerate
   make clean
   make generate
   ```

3. **Go Module Issues**
   ```bash
   cd go/
   go mod tidy
   go mod download
   ```

4. **Python Virtual Environment**
   ```bash
   # Recreate venv
   rm -rf venv/
   make setup
   ```

### Logging

- **Go Service**: Logs to stdout with structured JSON
- **Rust Service**: Uses `tracing` crate with configurable levels
- **Python Service**: Standard Python logging to stdout
- **Frontend**: Browser console and React DevTools

### Performance Monitoring

```bash
# Go service metrics
curl http://localhost:50051/metrics

# Rust service health
curl http://localhost:50052/health

# System resource usage
top -p $(pgrep -f "trading_service|risk_service")
```

## Deployment

### Docker Deployment

```bash
# Build images
docker-compose build

# Run stack
docker-compose up -d

# Scale services
docker-compose up --scale trading-service=3
```

### Kubernetes Deployment

```bash
# Apply manifests
kubectl apply -f k8s/

# Check status
kubectl get pods -l app=aetherion

# View logs
kubectl logs -f deployment/trading-service
```

### Production Considerations

1. **Security**
   - Use strong JWT secrets
   - Enable TLS for all communications
   - Implement rate limiting
   - Add authentication middleware

2. **Scalability**
   - Load balance gRPC services
   - Use message queues for async processing
   - Implement connection pooling
   - Add caching layers

3. **Monitoring**
   - Set up Prometheus metrics
   - Add distributed tracing
   - Implement health checks
   - Monitor resource usage

4. **Data Persistence**
   - Add database for portfolio state
   - Implement trade history storage
   - Set up backup procedures
   - Configure data retention policies

## Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Make changes** following coding standards
4. **Add tests** for new functionality
5. **Run test suite**: `make test`
6. **Commit changes**: `git commit -m 'Add amazing feature'`
7. **Push to branch**: `git push origin feature/amazing-feature`
8. **Open Pull Request**

### Coding Standards

- **Go**: Follow `gofmt` and `golint`
- **Rust**: Use `rustfmt` and `clippy`
- **Python**: Follow PEP 8 with `black` formatting
- **JavaScript**: Use ESLint and Prettier
- **Commit Messages**: Follow conventional commits

---

For questions or support, please open an issue on GitHub or check the main [README](README.md) for user-focused documentation.
