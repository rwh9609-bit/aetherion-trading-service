# Multilanguage Fintech Engine

A high-performance, cross-language trading engine demo integrating C++, Python, Rust, and Go.

## Features
- **Ultra-fast C++ order book** with C API (add, cancel, query orders)
- **Python orchestration**: run strategies, backtests, and analytics
- **Rust & Go strategy modules**: plug in compiled strategies for speed and safety
- **Full FFI integration**: all languages can call the C++ core and each other
- **Automated build**: Makefile builds all shared libraries and runs the demo

## Quick Start

### Prerequisites
- macOS (tested), Linux may work with minor changes
- Python 3
- Go 1.21+
- Rust (stable)
- C++ compiler (g++/clang++)

### Build & Run
```sh
# Clone the repo
# cd multilanguage
make run
```
This will:
- Build Go, Rust, and C++ shared libraries
- Run the Python demo script, which:
  - Loads the C++ order book
  - Calls Go and Rust strategies
  - Prints all cross-language output

### Example Output
```
Added buy order id=1, sell order id=2
Top of book (bid): id=1, price=101.5, qty=10
Top of book (ask): id=2, price=102.0, qty=5
Cancel buy order result: 1
Top of book (bid) after cancel: id=0, price=0.0, qty=0
[Go] Added buy order id=3, sell order id=4
[Go] Top of book (bid): id=3, price=103.5, qty=20
[Go] Top of book (ask): id=4, price=104.0, qty=15
[Go] Cancel buy order result: 1
[Go] Top of book (bid) after cancel: id=0, price=0.0, qty=0
[Rust] Added buy order id=5, sell order id=6
[Rust] Top of book (bid): id=5, price=101.5, qty=10
[Rust] Top of book (ask): id=6, price=102.0, qty=5
[Rust] Cancel buy order result: 1
[Rust] Top of book (bid) after cancel: id=0, price=0.0, qty=0
```

## Project Structure
- `cpp/` — C++ order book core
- `go/` — Go FFI and strategy
- `rust/` — Rust FFI and strategy
- `python/` — Python orchestrator/demo
- `bin/` — Compiled shared libraries
- `Makefile` — Automated build/run

## How to Add Your Own Strategy
- **Go**: Implement a new function in `go/orderbook_ffi.go` and export it with `//export`.
- **Rust**: Add a new function in `rust/src/orderbook_ffi.rs` and export with `#[no_mangle]`.
- **Python**: Call the C++ API directly or use ctypes to call Go/Rust.

## Advanced Usage
- Plug in real market data or backtest with historical data
- Extend the order book with more features (matching, persistence)
- Add analytics, risk checks, or logging in any language

## Troubleshooting
- On macOS, DYLD_LIBRARY_PATH must include the `bin/` directory (the Makefile handles this)
- If you see symbol errors, ensure all libraries are rebuilt (`make clean && make run`)

## License
MIT
