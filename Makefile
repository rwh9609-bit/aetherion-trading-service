## Makefile for the Aetherion Trading Engine (gRPC Microservices)

.PHONY: all setup proto-gen proto-gen-go proto-gen-web proto-gen-python build run stop clean test_go docker-build docker-up docker-down docker-logs fmt help

## --- Variables ---
PROTOC ?= protoc
PROTO_DIR := protos
ROOT_PROTOS := trading_api.proto $(PROTO_DIR)/bot.proto

# Go variables
GO_DIR := go
GO_BIN ?= $(HOME)/go/bin

# Python variables
PYTHON_DIR := python
VENV_DIR := venv

# Rust variables
RUST_SERVICE_DIR := rust/risk_service

# Frontend variables
FRONTEND_DIR := frontend

DOCKER_COMPOSE ?= docker compose
COMPOSE_SERVICES := risk trading envoy orchestrator frontend

## Colors (optional prettiness)
GREEN=\033[32m
YELLOW=\033[33m
BLUE=\033[34m
RESET=\033[0m

# --- Main Targets ---

## Default target
all: build

## Setup (idempotent)
setup:
	@echo "$(BLUE)Setting up development environment...$(RESET)"
	@if [ ! -d "$(VENV_DIR)" ]; then python3 -m venv $(VENV_DIR); fi
	@. $(VENV_DIR)/bin/activate; pip install -q --upgrade pip; pip install -q -r $(PYTHON_DIR)/requirements.txt
	@cd $(FRONTEND_DIR) && npm install --legacy-peer-deps >/dev/null 2>&1 || npm install >/dev/null 2>&1
	@cd $(RUST_SERVICE_DIR) && cargo fetch
	@cd $(GO_DIR) && go mod tidy
	@echo "$(GREEN)Setup complete.$(RESET)"

## Proto generation aggregate
proto-gen: proto-gen-python proto-gen-go proto-gen-web ## Generate all protobuf artifacts
	@echo "$(GREEN)All protobuf code generated.$(RESET)"

## Go protobufs (flatten into go/gen as committed layout)
proto-gen-go:
	@echo "Generating Go protobufs..."
	@mkdir -p $(GO_DIR)/gen
	@$(PROTOC) -I . -I $(PROTO_DIR) \
		--go_out=$(GO_DIR) --go_opt=paths=source_relative \
		--go-grpc_out=$(GO_DIR) --go-grpc_opt=paths=source_relative \
		$(ROOT_PROTOS)
	@mkdir -p $(GO_DIR)/gen
	@mv $(GO_DIR)/trading_api*.pb.go $(GO_DIR)/gen/ 2>/dev/null || true
	@# Do NOT delete or overwrite bot_grpc.pb.go and bot.pb.go in go/gen
	@if [ -f $(GO_DIR)/$(PROTO_DIR)/bot.pb.go ]; then mv $(GO_DIR)/$(PROTO_DIR)/bot.pb.go $(GO_DIR)/gen/; fi
	@if [ -f $(GO_DIR)/$(PROTO_DIR)/bot_grpc.pb.go ]; then mv $(GO_DIR)/$(PROTO_DIR)/bot_grpc.pb.go $(GO_DIR)/gen/; fi
	@rmdir $(GO_DIR)/$(PROTO_DIR) 2>/dev/null || true
	@echo "$(GREEN)Go protos updated in go/gen$(RESET)"

## Web (gRPC-Web JS) protobufs
proto-gen-web:
	@echo "Generating gRPC-Web JS stubs..."
	@mkdir -p $(FRONTEND_DIR)/src/proto
	@$(PROTOC) -I . -I $(PROTO_DIR) \
		--js_out=import_style=commonjs:$(FRONTEND_DIR)/src/proto \
		--grpc-web_out=import_style=commonjs,mode=grpcwebtext:$(FRONTEND_DIR)/src/proto \
		$(ROOT_PROTOS)
	@echo "$(GREEN)Web stubs updated in frontend/src/proto$(RESET)"

## Python protobufs
proto-gen-python: setup
	@echo "Generating Python protobufs..."
	@mkdir -p $(PYTHON_DIR)/protos
	@. $(VENV_DIR)/bin/activate; python3 -m grpc_tools.protoc -I . -I $(PROTO_DIR) \
		--python_out=$(PYTHON_DIR)/protos \
		--pyi_out=$(PYTHON_DIR)/protos \
		--grpc_python_out=$(PYTHON_DIR)/protos \
		$(ROOT_PROTOS)
	@touch $(PYTHON_DIR)/protos/__init__.py
	@echo "$(GREEN)Python protos updated$(RESET)"

## Build all (local, not docker)
build: proto-gen
	@echo "Building services (local)..."
	@cd $(RUST_SERVICE_DIR) && cargo build --release
	@cd $(GO_DIR) && go build -o bin/trading_service
	@cd $(FRONTEND_DIR) && npm run build
	@echo "$(GREEN)Local build complete.$(RESET)"

## Run all services (background, local dev)
run:
	@echo "Starting local services..."
	@$(MAKE) -s run-go || true
	@$(MAKE) -s run-risk || true
	@$(MAKE) -s run-python || true
	@echo "$(GREEN)Local services started (where free ports).$(RESET)"

## Stop local services
stop:
	@echo "Stopping local services (best-effort)..."
	-@pkill -f trading_service || true
	-@pkill -f risk_service || true
	-@pkill -f orchestrator.py || true
	-@pkill -f node || true
	@echo "$(GREEN)Stop sequence issued.$(RESET)"

restart: stop build run ## Rebuild & restart local services

## Clean build artifacts (non-docker)
clean:
	@echo "Cleaning..."
	-rm -rf $(GO_DIR)/bin/trading_service
	-rm -rf $(GO_DIR)/gen
	-rm -rf $(PYTHON_DIR)/protos
	-find $(PYTHON_DIR) -type d -name "__pycache__" -exec rm -r {} +
	-rm -rf $(RUST_SERVICE_DIR)/target
	-rm -rf $(FRONTEND_DIR)/build
	@echo "$(GREEN)Clean complete.$(RESET)"

## Local single service helpers
run-go:
	@echo "Running Go trading service (50051)"
	@cd $(GO_DIR) && go run . &
run-risk:
	@echo "Running Rust risk service (50052)"
	@cd $(RUST_SERVICE_DIR) && cargo run --release &
run-python:
	@echo "Running Python orchestrator (50053)"
	@cd $(PYTHON_DIR) && . ../$(VENV_DIR)/bin/activate && python3 orchestrator.py &

## Docker convenience
docker-build: ## Build all docker images
	$(DOCKER_COMPOSE) build --pull --no-cache
docker-up: ## Start all compose services
	$(DOCKER_COMPOSE) up -d $(COMPOSE_SERVICES)
docker-down: ## Stop all compose services
	$(DOCKER_COMPOSE) down
docker-logs: ## Tail logs for all services
	$(DOCKER_COMPOSE) logs -f --tail=100

## Tests
test_go:
	@echo "Running Go tests"
	@cd $(GO_DIR) && go test ./... -count=1 -v

## Formatting (placeholder hooks)
fmt:
	@cd $(GO_DIR) && go fmt ./...
	@echo "(Add rustfmt / black as needed)"

## Help
help:
	@grep -E '^([a-zA-Z0-9_-]+):.*?##' $(MAKEFILE_LIST) | awk 'BEGIN {FS=":.*?## "}; {printf "\033[36m%-18s\033[0m %s\n", $$1, $$2}' | sort

## --- Simple aggregate targets for devs ---
proto:
	bash scripts/gen_proto.sh

build:
	cd go && go build ./...

test:
	cd go && go test ./...

docker-build:
	$(DOCKER_COMPOSE) up --build

## End of Makefile