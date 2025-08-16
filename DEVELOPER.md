# Developer Documentation

---
## We Want Contributors!

Aetherion is open source and actively seeking developers, quants, and fintech enthusiasts. If you want to help build the future of trading technology, please:
- Fork and star the repo
- Submit issues and PRs
- Join our Discord/Matrix (coming soon)
- See the new Careers page in the app for opportunities

---

This document contains technical setup instructions, API documentation, and development guidelines for the Aetherion Trading Engine.


## Table of Contents

- [Local Development Workflow](#local-development-workflow)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Architecture Overview](#architecture-overview)
- [Development Workflow](#development-workflow)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Deployment](#deployment)

## Local Development Workflow (dev branch)

To run Aetherion locally for development:

1. **Clone the dev branch:**
   ```sh
   git clone -b dev https://github.com/rwh9609-bit/multilanguage.git
   cd multilanguage
   ```

2. **Install Docker Desktop** (if not already installed):
   - Download from [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/).
   - Install and start Docker Desktop.

3. **Create ACME challenge directory for TLS (macOS fix):**
   ```sh
   mkdir -p ~/acme-challenge
   ```

4. **Run the stack with Docker Compose:**
   ```sh
   docker-compose up --build
   ```
   - This will start all services defined in `docker-compose.yml`.

5. **Access the frontend:**
   - Open [http://localhost:3000](http://localhost:3000) in your browser.

6. **Expected behavior:**
   - Some health endpoints may show 404 or connection errors if not all backend services are running locally, but main trading dashboard and price streams should work.

For more details, see the rest of this documentation.

## 2025-08: HTTPS & Security Upgrade

Production endpoints now use HTTPS with Let’s Encrypt certificates for all domains. Envoy terminates TLS on port 443. If you see SSL or CORS errors, check for duplicate domains in envoy.yaml and verify certificate paths and permissions.

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

| Component | Required | Notes |
|-----------|----------|-------|
| Go | 1.24.x (toolchain directive) | go.mod uses toolchain go1.24.x |
| Rust | 1.78+ | Docker uses rust:1.78-alpine |
| Python | 3.11+ | Strategies / orchestration |
| Node.js | 18+ | React build |
| protoc | 3.21+ | Alpine package `protobuf` |
| Envoy | ≥1.29 | gRPC-Web translation |

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
      - Dual momentum views (client-side tick stream + server aggregated momentum panel)
      - Health status badge (polls Go service `:8090/healthz`)

#### 2. Envoy Proxy (Port 8080)
- **Configuration**: `envoy.yaml`
- **Purpose**: gRPC-Web to gRPC translation
- **Routes**:
      - `/trading.TradingService/*` → Go Service (50051)
      - `/trading.RiskService/*` → Rust Service (50052)
      - `/trading.AuthService/*` → Go Service (50051)
      - `/trading.BotService/*` → Go Service (50051)

#### 3. Go Trading Service (Port 50051)
- **Location**: `go/`
- **Features**:
      - Order book management
      - Price feed aggregation (Coinbase WebSocket)
      - Configurable default symbols via `DEFAULT_SYMBOLS` (comma-separated; falls back to BTC-USD,ETH-USD,SOL-USD,ILV-USD)
      - Authentication & JWT handling
      - gRPC streaming endpoints

## Configuration Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `GRPC_LISTEN_ADDR` | gRPC listen address | `:50051` |
| `HTTP_HEALTH_ADDR` | Health HTTP server address | `:8090` |
| `AUTH_SECRET` | Primary JWT signing secret (>=32 chars in prod) | (must set in prod) |
| `AUTH_PREVIOUS_SECRET` | Previous JWT secret for rotation window | (empty) |
| `POSTGRES_DSN` | Postgres connection string for users/bots | (empty -> in-memory/JSON) |
| `DEFAULT_SYMBOLS` | Comma-separated startup symbol subscriptions | `BTC-USD,ETH-USD,SOL-USD,ILV-USD` |
| `LOG_LEVEL` | Zerolog level (trace/debug/info/warn/error) | `info` |
| `REQUEST_TIMEOUT_MS` | Per-RPC timeout if client omits deadline | `5000` |
| `SHUTDOWN_GRACE_SECONDS` | Grace period on SIGTERM before force stop | `15` |
| `AUTH_DISABLED` | If `1`, bypasses auth (dev only) | (unset) |

Example:

```bash
DEFAULT_SYMBOLS="BTC-USD,ETH-USD,ILV-USD,SOL-USD" GRPC_LISTEN_ADDR=":6000" LOG_LEVEL=debug make run
```

#### 4. Rust Risk Service (Port 50052)
- **Location**: `rust/risk_service/`
- **Features**:
   - Monte Carlo VaR calculations
   - Real-time risk assessment
   - High-performance computations

#### 5. Python Strategy Service

#### 6. Bot Service (logical, currently in Go process)

- **Location**: `go/bot_service.go`
- **Features**:
   - Bot registry persisted to `data/bots.json`
   - RPCs: CreateBot, ListBots, StartBot, StopBot, GetBotStatus
   - Integrates with TradingService StartStrategy; stores `strategy_id` in bot parameters

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

When modifying `protos/trading_api.proto` or `protos/bot.proto`:

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

### Trading Service APIs (subset)

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
rpc GetMomentum(MomentumRequest) returns (MomentumResponse) {}
```

#### Symbol Management
```protobuf
rpc AddSymbol(SymbolRequest) returns (StatusResponse) {}
rpc RemoveSymbol(SymbolRequest) returns (StatusResponse) {}
rpc ListSymbols(Empty) returns (SymbolList) {}
```

#### Strategy & Bot Control
```protobuf
rpc StartStrategy(StrategyRequest) returns (StatusResponse) {}
rpc StopStrategy(StrategyRequest) returns (StatusResponse) {}
```

#### Portfolio Management
```protobuf
rpc GetPortfolio(PortfolioRequest) returns (Portfolio) {}
```

### Risk Service APIs (planned expansion)

```protobuf
rpc CalculateVaR(VaRRequest) returns (VaRResponse) {}
```

### Message Types (excerpt)

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

// Momentum (server-side scanner)
message MomentumRequest { repeated string symbols = 1; }
message MomentumMetric {
   string symbol = 1;
   double last_price = 2;
   double pct_change_1m = 3;
   double pct_change_5m = 4;
   double volatility = 5;
   double momentum_score = 6;
}
message MomentumResponse { repeated MomentumMetric metrics = 1; int64 generated_at_unix_ms = 2; }
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
export HEALTH_PORT=8090
export FRONTEND_PORT=3000
export REACT_APP_GRPC_HOST=https://app.aetherion.cloud   # production deployment planned domain
export CORS_ALLOWED_ORIGINS=https://app.aetherion.cloud   # comma-separated list
export AUTH_PREVIOUS_SECRET=old-secret   # optional; enables graceful JWT key rotation

```

## Containerization

### Local (Docker Compose)

```bash
docker compose build
AUTH_SECRET=$(openssl rand -hex 32) docker compose up -d
```

Services
* frontend (3000)
* envoy (8080, gRPC-Web proxy)
* trading (50051 internal)
* risk (50052 internal)
* orchestrator (python experimental)

Update a single service:
```bash
docker compose build trading && docker compose up -d trading
```

Logs:
```bash
docker compose logs -f envoy
```

Tear down:
```bash
docker compose down -v
```

### Production Images

Frontend with baked host:
```bash
docker build -f Dockerfile.frontend --build-arg REACT_APP_GRPC_HOST=https://api.example.com -t aetherion-frontend:prod .
```

Push example:
```bash
docker tag aetherion-frontend:prod ghcr.io/yourorg/aetherion-frontend:prod
docker push ghcr.io/yourorg/aetherion-frontend:prod
```

### Authentication / Configuration Exports

```bash
export AUTH_SECRET=your-secret-key-here
export AUTH_PREVIOUS_SECRET=old-secret-if-rotating
export AUTH_DISABLED=0             # set to 1 to bypass auth in dev ONLY
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

### Authentication & Secrets

The Go trading service enforces a strong JWT signing secret in **production** and provides a convenience fallback **only for local development**.

Key points:

- Production requirement: `AUTH_SECRET` MUST be set and be at least 32 bytes (characters). The process exits if this is not satisfied.
- Key rotation: To rotate, first deploy with both `AUTH_SECRET=<new>` and `AUTH_PREVIOUS_SECRET=<old>` set. After the longest possible token lifetime has passed (e.g. `JWT_EXPIRY_HOURS`), remove `AUTH_PREVIOUS_SECRET`.
- Dev fallback: If `GO_ENV` is NOT `production` and `AUTH_SECRET` is unset, the server will generate a random ephemeral secret at startup (logged with a warning). This means all previously issued tokens become invalid every restart.

Recommended local workflow for stable sessions:

```bash
# In your shell profile or a local .env file (NOT committed)
export AUTH_SECRET="$(openssl rand -hex 32)"  # 64 hex chars = 32 bytes
```

Then restart the service (`make restart` or `make run`). This avoids surprise logouts after restarts.

Operational guidance:

- Minimum length: Use 32+ random bytes (NOT simple words concatenated).
- Storage: In production, store secrets in a secret manager (AWS Secrets Manager, GCP Secret Manager, Vault, or Kubernetes Secret) and inject via environment variables.
- Auditing: Log only the presence of a secret and its length, never the secret contents (the code already avoids printing the secret value).
- Rotation cadence: Rotate on a regular schedule (e.g. quarterly) and immediately if compromise is suspected.

Example rotation (shell):

```bash
OLD_SECRET="$AUTH_SECRET"
NEW_SECRET="$(openssl rand -hex 32)"
export AUTH_PREVIOUS_SECRET="$OLD_SECRET"
export AUTH_SECRET="$NEW_SECRET"
# Deploy new release / restart services
# After JWT_EXPIRY_HOURS passes:
unset AUTH_PREVIOUS_SECRET
```

If you see login failures after a restart during dev, confirm whether an ephemeral secret was generated (look for a log message mentioning an auto-generated dev secret). Set a persistent `AUTH_SECRET` to eliminate this.


## Service-Specific Configuration

### Go Service (`go/main.go`)

```go
type Config struct {
    Port           string
    AuthSecret     []byte
    MaxConnections int
    Keepalive      time.Duration
}

Health endpoint: HTTP `/healthz` on port 8090 (used by Docker healthcheck).

Key Rotation: set `AUTH_PREVIOUS_SECRET` alongside new `AUTH_SECRET` to accept tokens signed with previous key until they expire.

Security Enforcement: Process aborts if `AUTH_SECRET` length < 32 characters (see startup logic). Use a strong random secret.

### Frontend gRPC Host Resolution

Priority order:
1. `REACT_APP_GRPC_HOST` environment variable (explicit override during build)
2. If running on `app.<root-domain>` and no explicit host, auto-switch to `api.<root-domain>` (split-domain deployment)
3. Same-origin (for single-domain deployments)
4. `http://localhost:8080` fallback (dev)

To disable the auto `api.` mapping, set an explicit `REACT_APP_GRPC_HOST` to the desired origin.

### Momentum Panels

- `CryptoScanner`: Client-side, streaming computations using live tick stream. Updates continuously; ideal for immediate responsiveness.
- `ServerMomentum`: Calls `GetMomentum` every 30s; aggregates on the server (consistent, lower client CPU). Click any row to focus symbol.

### Rust Service (`rust/risk_service/src/main.rs`)

```rust
pub struct RiskConfig {
   pub port: u16,
   pub var_confidence: f64,
   pub simulation_count: usize,
}
```

### Python Service (`python/config.py`)

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
