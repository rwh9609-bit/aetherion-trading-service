# Makefile for the Aetherion Trading Engine (gRPC Microservices)

.PHONY: all setup generate build run stop clean test_go

# --- Variables ---
PROTOC = protoc
PROTO_DIR = protos
PROTO_FILE = trading_api.proto

# Go variables
GO_DIR = go
GO_MODULE = aetherion-trading-service
GO_BIN = /Users/xeratooth/go/bin

# Python variables
PYTHON_DIR = python
VENV_DIR = venv

# Rust variables
RUST_SERVICE_DIR = rust/risk_service

# Frontend variables
FRONTEND_DIR = frontend

# --- Main Targets ---

# Default target
all: setup generate build

# Setup development environment
setup:
	@echo "Setting up development environment..."
	cd $(FRONTEND_DIR) && npm install
	cd $(PYTHON_DIR) && pip install -r requirements.txt
	cd $(RUST_SERVICE_DIR) && cargo build
	cd $(GO_DIR) && go mod tidy

# Generate all gRPC code
generate: generate-python
	@echo "Generating Protocol Buffers for Go, Rust, and Web..."
	@mkdir -p $(GO_DIR)/gen
	PATH="$(GO_BIN):$$PATH" $(PROTOC) -I$(PROTO_DIR) --go_out=$(GO_DIR)/gen --go_opt=paths=source_relative --go-grpc_out=$(GO_DIR)/gen --go-grpc_opt=paths=source_relative --grpc-web_out=import_style=commonjs,mode=grpcwebtext:$(FRONTEND_DIR)/src/proto --js_out=import_style=commonjs:$(FRONTEND_DIR)/src/proto $(PROTO_FILE)
	# Generate Rust code
	cd $(RUST_SERVICE_DIR) && cargo build --release

# Build all services
build: generate
	@echo "Building all services..."
	cd $(RUST_SERVICE_DIR) && cargo build --release
	cd $(GO_DIR) && go mod tidy && go build -o bin/trading_service
	cd $(FRONTEND_DIR) && npm run build

# Run all services (in background)
run:
	@echo "Starting all services..."
	@echo "Starting Envoy proxy on port 8080..."
	envoy -c envoy.yaml & echo $$! > /tmp/envoy.pid
	@echo "Starting Rust Risk Service on port 50052..."
	cd $(RUST_SERVICE_DIR) && cargo run --release & echo $$! > /tmp/risk_service.pid
	@echo "Starting Go Trading Service on port 50051..."
	cd $(GO_DIR) && ./bin/trading_service & echo $$! > /tmp/trading_service.pid
	@echo "Starting Python Strategy Service on port 50053..."
	cd $(PYTHON_DIR) && ../venv/bin/python main.py & echo $$! > /tmp/python_service.pid
	@echo "Starting Frontend on port 3000..."
	cd $(FRONTEND_DIR) && npm start &
	@echo "All services started. Visit http://localhost:3000 for the UI"

# Stop all services
stop:
	@echo "Stopping all services..."
	-kill -9 `lsof -t -i:8080` 2>/dev/null || true
	-kill -9 `lsof -t -i:50051` 2>/dev/null || true
	-kill -9 `lsof -t -i:50052` 2>/dev/null || true
	-kill -9 `lsof -t -i:50053` 2>/dev/null || true
	-kill -9 `lsof -t -i:3000` 2>/dev/null || true
	-rm -f /tmp/envoy.pid /tmp/risk_service.pid /tmp/trading_service.pid /tmp/python_service.pid
	@echo "All services stopped."

# Restart all services
restart: stop build run

# Clean up generated files and build artifacts
clean:
	@echo "Cleaning up project..."
	-rm -rf $(GO_DIR)/bin/trading_service
	-rm -rf $(GO_DIR)/gen
	-rm -rf $(PYTHON_DIR)/protos
	-find $(PYTHON_DIR) -type d -name "__pycache__" -exec rm -r {} +
	-rm -rf $(RUST_SERVICE_DIR)/target
	-rm -rf $(FRONTEND_DIR)/build
	-rm -f cpp/*.o cpp/*.out cpp/test_load cpp/test_orderbook
	@echo "Clean up complete."

# Generate Python gRPC code
generate-python: setup $(PROTO_FILE)
	@echo "Generating Python gRPC code..."
	@mkdir -p $(PYTHON_DIR)/protos
	@. $(VENV_DIR)/bin/activate; python3 -m grpc_tools.protoc -I$(PROTO_DIR) \
	          --python_out=$(PYTHON_DIR)/protos \
	          --pyi_out=$(PYTHON_DIR)/protos \
	          --grpc_python_out=$(PYTHON_DIR)/protos \
	          $(PROTO_FILE)
	@ls -l $(PYTHON_DIR)/protos
	@touch $(PYTHON_DIR)/protos/__init__.py



# --- Service & Client Runners ---

# Run the Go trading service
run-go-service: generate-go
	cd $(GO_DIR) && go mod tidy
	@echo "Starting Go Trading Service on port 50051..."
	cd $(GO_DIR) && go run . &

# Stop the Go trading service
stop-go-service:
	@echo "Stopping Go Trading Service..."
	@kill `lsof -t -i:50051` || true

# Run the Rust risk service
run-rust-service:
	@echo "Starting Rust Risk Service on port 50052..."
	cd $(RUST_SERVICE_DIR) && cargo run

# Stop the Rust risk service
stop-rust-service:
	@echo "Stopping Rust Risk Service..."
	@kill `lsof -t -i:50052` || true

# Run the Python orchestrator client
run-python-client: setup generate-python
	@echo "Starting Python Orchestrator Client..."
	@cd $(PYTHON_DIR) && . ../$(VENV_DIR)/bin/activate && python3 orchestrator.py

# --- Setup & Cleanup ---

# Set up the Python virtual environment and install dependencies
setup:
	@if [ ! -d "$(VENV_DIR)" ]; then \
		echo "Python venv not found. Creating one..."; \
		python3 -m venv $(VENV_DIR); \
	fi
	@echo "Installing/updating Python dependencies..."
	@. $(VENV_DIR)/bin/activate; \
	pip install -q --upgrade pip; \
	pip install -q -r $(PYTHON_DIR)/requirements.txt

# Clean up generated files
clean:
	@echo "Cleaning up..."
	rm -rf $(GO_DIR)/gen
	rm -rf $(PYTHON_DIR)/protos
	# Rust's cargo clean will handle its build artifacts
	cd $(RUST_SERVICE_DIR) && cargo clean
	@echo "Cleanup complete."

# Run Go unit tests
test_go:
	@echo "Running Go tests"
	cd $(GO_DIR) && go test ./... -count=1 -v

# --- EOF ---