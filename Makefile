# Define directories and variables
GO_SRC_DIR = go
RUST_SRC_DIR = rust
CPP_SRC_DIR = cpp
PYTHON_SRC_DIR = python
BIN_DIR = bin

GO_LIB = $(BIN_DIR)/libgo.dylib
GO_HEADER = $(BIN_DIR)/go_lib.h
RUST_LIB = $(BIN_DIR)/librust_lib.dylib
CPP_LIB = $(BIN_DIR)/libcpp.dylib

# --- Build Targets ---


# Strict sequential build order: Go → Rust → C++
all: go rust cpp

go: $(GO_LIB) $(GO_HEADER)

$(GO_LIB) $(GO_HEADER): $(GO_SRC_DIR)/*.go | $(BIN_DIR)
	@echo "Building Go shared library..."
	cd $(GO_SRC_DIR) && \
	go build -buildmode=c-shared -o libgo.dylib . && \
	cp libgo.dylib ../$(GO_LIB) && \
	cp libgo.h ../$(GO_HEADER)

rust: $(RUST_LIB)

$(RUST_LIB): $(RUST_SRC_DIR)/src/lib.rs $(RUST_SRC_DIR)/Cargo.toml | $(BIN_DIR)
	@echo "Building Rust shared library..."
	cd $(RUST_SRC_DIR) && cargo build --release
	cp $(RUST_SRC_DIR)/target/release/librust_lib.dylib $(RUST_LIB)

cpp: $(CPP_LIB)

$(CPP_LIB): $(GO_LIB) $(GO_HEADER) $(RUST_LIB) $(CPP_SRC_DIR)/cpp_lib.cpp go/orderbook_api.h | $(BIN_DIR)
	cp go/orderbook_api.h $(BIN_DIR)/orderbook_api.h
	@echo "Building C++ shared library..."
	g++ -shared -fPIC -o $(CPP_LIB) $(CPP_SRC_DIR)/*.cpp \
		-I$(BIN_DIR) -L$(BIN_DIR) -lgo -lrust_lib -Wl,-rpath,.

$(BIN_DIR):
	mkdir -p $(BIN_DIR)

# The `run` target first builds all dependencies, then runs the Python script.

# The `run` target builds all dependencies, ensures venv/requests, then runs the Python script.
run: all
	@if [ ! -d "venv" ]; then \
		echo "Python venv not found. Creating one and installing dependencies..."; \
		python3 -m venv venv; \
		source venv/bin/activate; \
		pip install requests; \
	fi
	@echo "Running Python script..."
	. venv/bin/activate; \
	ABS_BIN_DIR=$(shell cd $(BIN_DIR) && pwd); \
	DYLD_LIBRARY_PATH=$(shell cd $(BIN_DIR) && pwd) python3 $(PYTHON_SRC_DIR)/main.py

# The `clean` target removes all generated files
clean:
	@echo "Cleaning up..."
	rm -rf $(BIN_DIR)
	rm -f $(RUST_SRC_DIR)/target/release/librust_lib.dylib
	rm -f $(GO_SRC_DIR)/go_lib.h $(GO_SRC_DIR)/libgo.dylib
	@echo "All generated files have been removed."

.PHONY: all run clean

