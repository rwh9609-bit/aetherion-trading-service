# Makefile for the Aetherion Trading Engine (gRPC Microservices)

.PHONY: all generate generate-go generate-python run-go-service run-rust-service run-python-client setup clean

# --- Variables ---
PROTOC = protoc
PROTO_DIR = protos
PROTO_FILE = $(PROTO_DIR)/trading_api.proto

# Go variables
GO_DIR = go
GO_MODULE = aetherion-trading-service

# Python variables
PYTHON_DIR = python
VENV_DIR = venv

# Rust variables
RUST_SERVICE_DIR = rust/risk_service

# --- Main Targets ---

# Default target
all: generate

# Generate all gRPC code (Rust generation is handled by cargo)
generate: generate-go generate-python 
	@echo "All gRPC code generated."

# Run all services and the client (requires separate terminals)
run:
	@echo "To run the system, please open three separate terminals."
	@echo "Terminal 1: make run-go-service"
	@echo "Terminal 2: make run-rust-service"
	@echo "Terminal 3: make run-python-client"

# --- Code Generation ---

# Generate Go gRPC code
generate-go: $(PROTO_FILE)
	@echo "Generating Go gRPC code..."
	$(PROTOC) --go_out=. --go-grpc_out=. \
	          $(PROTO_FILE)

# Generate Python gRPC code
generate-python: $(PROTO_FILE)
	@echo "Generating Python gRPC code..."
	@mkdir -p $(PYTHON_DIR)/protos
	python3 -m grpc_tools.protoc -I$(PROTO_DIR) \
	          --python_out=$(PYTHON_DIR)/protos \
	          --pyi_out=$(PYTHON_DIR)/protos \
	          --grpc_python_out=$(PYTHON_DIR)/protos \
	          $(PROTO_FILE)
	@touch $(PYTHON_DIR)/protos/__init__.py

# --- Service & Client Runners ---

# Run the Go trading service
run-go-service: generate-go
	go mod tidy
	@echo "Starting Go Trading Service on port 50051..."
	go run ./$(GO_DIR)

# Run the Rust risk service
run-rust-service:
	@echo "Starting Rust Risk Service on port 50052..."
	cd $(RUST_SERVICE_DIR) && cargo run

# Run the Python orchestrator client
run-python-client: setup
	@echo "Starting Python Orchestrator Client..."
	@. $(VENV_DIR)/bin/activate; python3 $(PYTHON_DIR)/orchestrator.py

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

# --- EOF ---