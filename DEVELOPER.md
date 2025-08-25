# Developer Documentation

This document contains technical setup instructions, API documentation, and development guidelines for the Aetherion Trading Platform.

## Table of Contents

- [Local Development Workflow](#local-development-workflow)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Architecture Overview](#architecture-overview)
- [Development Workflow](#development-workflow)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Deployment](#deployment)

## Local Development Workflow

To run Aetherion locally for development:

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/rwh9609-bit/multilanguage.git
    cd multilanguage
    ```

2.  **Install Docker Desktop** (if not already installed).

3.  **Run the stack with Docker Compose:**
    ```sh
    docker-compose up --build
    ```
    This will start all services defined in `docker-compose.yml`.

4.  **Access the frontend:**
    Open [http://localhost:3000](http://localhost:3000) in your browser.

### Secure JWT Token Generation & Usage

To securely authenticate the orchestrator with the Go backend, generate a JWT token using your `AUTH_SECRET` and update your `.env` file:

1.  Generate a JWT token:

    ```bash
    make jwt-generate
    ```

    This will run the token generation script and automatically update your `.env` with the new `AUTH_TOKEN`.

2.  Restart the services:

    ```bash
    docker-compose up --build
    ```

**Note:** Never commit your `.env` file with real secrets or tokens to version control. For production, use Docker secrets or environment variable injection.

## Prerequisites

### Required Software

```bash
# macOS (using Homebrew)
brew install protobuf go rust python@3.10 node envoy

# Ubuntu/Debian
sudo apt update
sudo apt install protobuf-compiler golang-go rust-all nodejs npm python3.10 python3.10-venv

# Language-specific tools
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
npm install -g protoc-gen-grpc-web
pip install grpcio grpcio-tools
```

### Version Requirements

| Component | Required | Notes |
|-----------|----------|-------|
| Go        | 1.24.x   | `go.mod` uses toolchain go1.24.x |
| Rust      | 1.78+    | Docker uses `rust:1.78-alpine` |
| Python    | 3.10+    | `python/Dockerfile` uses `python:3.10-slim` |
| Node.js   | 20+      | `Dockerfile.frontend` uses `node:20-alpine` |
| protoc    | 3.21+    | Alpine package `protobuf` |
| Envoy     | ≥1.29    | gRPC-Web translation |

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
make proto-gen
```

### 4. Build Services

```bash
# Build all services
make build
```

### 5. Run Services

```bash
# Option 1: Run all services at once with Docker Compose (recommended)
docker-compose up --build

# Option 2: Run services individually (for debugging)
make run-go      # Terminal 1
make run-risk    # Terminal 2
make run-python  # Terminal 3 (runs the orchestrator)
```

## Architecture Overview

Aetherion's architecture consists of the following containerized services:

*   **`frontend`**: (React) The user interface for traders.
*   **`envoy`**: (Envoy Proxy) The service mesh proxy, handling gRPC-Web translation and routing to backend services.
*   **`trading`**: (Go) The core trading logic, including order book management, price feeds, and user authentication.
*   **`risk`**: (Rust) High-performance risk management and analytics.
*   **`orchestrator`**: (Python) Manages and executes complex trading strategies.
*   **`backend`**: (Python/FastAPI) Provides the backtesting API for strategies.
*   **`postgres`**: (PostgreSQL) Data persistence for trading activities and analytical data.

### Data Flow

```
Browser → React → Envoy → gRPC Services
                    ↓
Market Data APIs → Go Service → Event Bus → Frontend
                    ↓
Risk Calculations ← Rust Service
                    ↓
Strategy Decisions ← Python Orchestrator
                    ↓
Backtesting API ← Python Backend (FastAPI)
```

## Development Workflow

### Making Changes

1.  **Frontend Changes**
    ```bash
    cd frontend/
    npm start  # Hot reload enabled
    ```

2.  **Go Service Changes**
    ```bash
    cd go/
    go run .
    # For hot-reloading, consider installing `air`
    ```

3.  **Rust Service Changes**
    ```bash
    cd rust/risk_service/
    cargo run
    # For hot-reloading, consider installing `cargo-watch`
    ```

4.  **Python Service Changes**
    ```bash
    cd python/
    ../venv/bin/python orchestrator.py # For the orchestrator
    # or
    uvicorn python.app:app --reload # For the backtesting API
    ```

### Protocol Buffer Changes

When modifying `protos/trading_api.proto`:

1.  **Update the proto file**
2.  **Regenerate code**: `make proto-gen`
3.  **Update implementations** in each service
4.  **Restart all services**

## API Documentation

See `docs/API.md` for detailed API documentation.

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

## Deployment

### Docker Deployment

The primary deployment method is using Docker Compose:

```bash
# Build and run the stack in detached mode
docker-compose up -d --build
```

### Kubernetes Deployment

Kubernetes manifests are not yet available but are planned for future releases.

### Production Considerations

*   **Security:** Use strong JWT secrets, enable TLS, and implement rate limiting.
*   **Scalability:** Load balance gRPC services and use message queues for asynchronous processing.
*   **Monitoring:** Set up Prometheus metrics, distributed tracing, and health checks.
*   **Data Persistence:** Implement a robust backup and recovery strategy for the PostgreSQL database.

---

For questions or support, please open an issue on GitHub.