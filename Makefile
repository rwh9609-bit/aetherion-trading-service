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

all: $(CPP_LIB)

# Create the bin directory if it doesn't exist
$(BIN_DIR):
	@mkdir -p $(BIN_DIR)

# This is the most reliable way to build the Go shared library.
# We build inside the source directory, which is where the header file is guaranteed to be created,
# and then copy both the library and the header to the bin directory.
$(GO_LIB) $(GO_HEADER): $(GO_SRC_DIR)/go_lib.go | $(BIN_DIR)
	@echo "Building Go shared library..."
	cd $(GO_SRC_DIR) && \
	go build -buildmode=c-shared -o libgo.dylib go_lib.go && \
	cp libgo.dylib ../$(GO_LIB) && \
	cp libgo.h ../$(GO_HEADER)

# Build the Rust shared library
$(RUST_LIB): $(RUST_SRC_DIR)/src/lib.rs $(RUST_SRC_DIR)/Cargo.toml | $(BIN_DIR)
	@echo "Building Rust shared library..."
	cd $(RUST_SRC_DIR) && cargo build --release
	@cp $(RUST_SRC_DIR)/target/release/librust_lib.dylib $(RUST_LIB)

# Build the C++ shared library, linking against the Go and Rust libraries
$(CPP_LIB): $(GO_LIB) $(GO_HEADER) $(RUST_LIB) $(CPP_SRC_DIR)/cpp_lib.cpp | $(BIN_DIR)
	@echo "Building C++ shared library..."
	g++ -shared -fPIC -o $(CPP_LIB) $(CPP_SRC_DIR)/cpp_lib.cpp \
		-I$(BIN_DIR) -L$(BIN_DIR) -lgo -lrust_lib -Wl,-rpath,.

# The `run` target first builds all dependencies, then runs the Python script.
run: $(CPP_LIB)
	@echo "Running Python script..."
	ABS_BIN_DIR=$(shell cd $(BIN_DIR) && pwd)
	DYLD_LIBRARY_PATH=$(shell cd $(BIN_DIR) && pwd) python3 $(PYTHON_SRC_DIR)/main.py

# The `clean` target removes all generated files
clean:
	@echo "Cleaning up..."
	rm -rf $(BIN_DIR)
	rm -f $(RUST_SRC_DIR)/target/release/librust_lib.dylib
	rm -f $(GO_SRC_DIR)/go_lib.h $(GO_SRC_DIR)/libgo.dylib
	@echo "All generated files have been removed."

.PHONY: all run clean

