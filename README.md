# Aetherion Trading Engine: A Polyglot Microservice Architecture

A high-performance trading engine demonstrating a modern, gRPC-based microservice architecture using Go, Rust, and Python. This project has evolved from its FFI-based origins to a more robust, scalable, and production-ready design.

## Architecture

The system is composed of several independent services communicating via gRPC:

-   **Go Trading Service**: The primary gateway. It's designed for high-concurrency I/O, perfect for handling market data streams, managing client connections, and routing order requests.
-   **Rust Risk Service**: A specialized service for CPU-intensive, safety-critical computations. It exposes endpoints for complex calculations like Value at Risk (VaR), ensuring maximum performance and correctness.
-   **Python Orchestrator**: The "brains" of the operation. A flexible client that consumes data from the Go service, calls the Rust service for risk analysis, and implements high-level trading strategies and analytics.
-   **Protocol Buffers (`.proto`)**: The single source of truth for the API. It defines all services, messages, and RPCs, enabling type-safe code generation for all languages.

## Quick Start

### Prerequisites
- macOS or Linux
- Python 3.8+
- Go 1.21+
- Rust (stable toolchain)
- C++ compiler (for gRPC Python tools)

### One-Time Setup: gRPC & Protobuf Tools
You must install the Protocol Buffer compiler (`protoc`) and the language-specific gRPC plugins.

- **protoc**: `brew install protobuf` (on macOS)
- **Go plugins**:
  ```sh
  go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
  go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
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

2.  **Generate gRPC Code**: This command uses `protoc` to generate client and server code from `protos/trading_api.proto` for all languages.
    ```sh
    make generate
    ```

3.  **Run the Services**: Open three separate terminals and run one command in each to start the services and the client.
    -   **Terminal 1 (Go Service):** `make run-go-service`
    -   **Terminal 2 (Rust Service):** `make run-rust-service`
    -   **Terminal 3 (Python Client):** `make run-python-client`

## Configuration

For local development, you can manage configuration and secrets using a `.env` file in the project root.

1.  Copy the example file:
    ```sh
    cp .env.example .env
    ```
2.  Edit `.env` to add your API keys or change service addresses.

The `.env` file is excluded from version control by `.gitignore`. For production, you should use your cloud provider's secret management service (e.g., AWS Secrets Manager, HashiCorp Vault).

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
