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
    docker compose up --build
    ```
    This will start all services defined in `docker-compose.yml`.

4.  **Access the frontend:**
    Open [http://localhost:3000](http://localhost:3000) in your browser.

## Generating an AUTH_SECRET on Windows

To generate a secure `AUTH_SECRET` for JWT authentication on Windows:

1. **Install OpenSSL using Chocolatey:**

   Open **PowerShell as Administrator** (right-click the PowerShell icon and select "Run as administrator"), then run:

   ```powershell
   choco install openssl
   ```

2. **Generate a random secret:**

   In PowerShell, run:

   ```powershell
   openssl rand -base64 32
   ```

   Copy the output and set it as your `AUTH_SECRET` in your `.env` file. `.env` should be .gitignored. 

**Note:** Always keep your secrets private and never commit them to version control.

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

# README.md
## Windows Quickstart

1. **Install Docker Desktop for Windows**
   - Download from [docker.com](https://www.docker.com/products/docker-desktop/)
   - During installation, enable **WSL 2 integration**.

2. **Clone the repository**
   ```powershell
   git clone https://github.com/rwh9609-bit/aetherion-trading-service.git
   cd aetherion-trading-service
   ```

3. **Copy and fill out your `.env` file**
   - Use `.env.example` as a template.

4. **Open PowerShell (not WSL, not docker-desktop) in the project root**

5. **Build and start all services**
   ```powershell
   docker compose up --build
   ```

6. **Access the app**
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - API: [http://localhost:8000](http://localhost:8000)

**Troubleshooting:**
- If you see `exec format error`, ensure you are running on x86_64 hardware and that Docker Desktop is set to Linux containers.
- All Dockerfiles and `docker-compose.yml` are compatible with Windows + WSL2.

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

## Windows Development Notes

- **Docker Desktop must be running and set to Linux containers.**
- **Do not run Docker commands from the `docker-desktop` WSL2 distribution.**
- You may use a WSL2 distro (e.g., Ubuntu) if Docker Desktop WSL2 integration is enabled for it.
- All Dockerfiles and `docker-compose.yml` are now compatible with Windows + WSL2.
- If you see `exec format error`, ensure you are running on x86_64 hardware and that `platform: linux/amd64` is set for all build services in `docker-compose.yml`.
- To clean and rebuild:
  ```powershell
  docker compose down
  docker system prune -af
  docker compose build --no-cache
  docker compose up
  ```
- For troubleshooting, check Docker Desktop settings:
  - **Settings > Resources > WSL Integration**: Enable your WSL2 distro.
  - **Settings > General**: Confirm "Use the WSL 2 based engine" is checked.

## Generating a JWT Token (Windows)

If you can't use `make`, you can generate a JWT token using Python:

1. **Install Python (if not already installed):**
   - Download from [python.org](https://www.python.org/downloads/)

2. **Install the PyJWT library:**
   ```powershell
   pip install pyjwt
   ```

3. **Create a script called `generate_jwt.py` with the following content:**
   ```python
   import jwt
   import datetime

   secret = "YOUR_AUTH_SECRET"  # Use the value from your .env file
   payload = {
       "user_id": "your-user-id",
       "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1)
   }
   token = jwt.encode(payload, secret, algorithm="HS256")
   print(token)
   ```

4. **Run the script:**
   ```powershell
   python generate_jwt.py
   ```

Replace `"YOUR_AUTH_SECRET"` and `"your-user-id"` with your actual values.

---

**Alternatively, you can use [jwt.io](https://jwt.io/) for manual token generation, but using a script is more secure for real secrets.**

---

**Add this section to your `DEVELOPER.md` so Windows users can generate JWT tokens without needing `make`.**  
Let me know if you want a ready-to-commit script file!## Generating a JWT Token (Windows)

If you can't use `make`, you can generate a JWT token using Python:

1. **Install Python (if not already installed):**
   - Download from [python.org](https://www.python.org/downloads/)

2. **Install the PyJWT library:**
   ```powershell
   pip install pyjwt
   ```

3. **Create a script called `generate_jwt.py` with the following content:**
   ```python
   import jwt
   import datetime

   = "YOUR_AUTH_SECRET"  # Use the value from your .env file
   payload = {
       "user_id": "your-user-id",
       "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1)
   }
   token = jwt.encode(payload, secret, algorithm="HS256")
   print(token)
   ```

4. **Run the script:**
   ```powershell
   python generate_jwt.py
   ```

Replace `"YOUR_AUTH_SECRET"` and `"your-user-id"` with your actual values.

---

**Alternatively, you can use [jwt.io](https://jwt.io/) for manual token generation, but using a script is more secure for real secrets.**

---

**Add this section to your `DEVELOPER.md` so Windows users can generate JWT tokens without needing `make`.**  
Let me know if you want a ready-to-commit script file!

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