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
# (Recommended) Set up a Python virtual environment:
python3 -m venv venv
source venv/bin/activate
pip install requests

# Then run the demo:
make run
```
This will:
- Build Go, Rust, and C++ shared libraries
- Run the Python demo script, which:
  - Loads the C++ order book
  - Calls Go and Rust strategies
  - Fetches live BTC-USD prices from Coinbase
  - Prints all cross-language output

### Example Output
```
Shared library loaded successfully.
Added buy order id=1, sell order id=2
Top of book (bid): id=1, price=101.5, qty=10
Top of book (ask): id=2, price=102.0, qty=5
Cancel buy order result: 1
Top of book (bid) after cancel: id=0, price=0.0, qty=0

--- Live Coinbase Price Feed Demo ---
[1] Added buy order at Coinbase BTC-USD price 116647.305 (order id=3)
Top of book (bid): id=3, price=116647.305, qty=1
[2] Added buy order at Coinbase BTC-USD price 116647.305 (order id=4)
Top of book (bid): id=3, price=116647.305, qty=1
[3] Added buy order at Coinbase BTC-USD price 116647.305 (order id=5)
Top of book (bid): id=3, price=116647.305, qty=1
[4] Added buy order at Coinbase BTC-USD price 116647.305 (order id=6)
Top of book (bid): id=3, price=116647.305, qty=1
[5] Added buy order at Coinbase BTC-USD price 116647.305 (order id=7)
Top of book (bid): id=3, price=116647.305, qty=1
[6] Added buy order at Coinbase BTC-USD price 116648.67 (order id=8)
Top of book (bid): id=8, price=116648.67, qty=1
[7] Added buy order at Coinbase BTC-USD price 116648.67 (order id=9)
Top of book (bid): id=8, price=116648.67, qty=1
[8] Added buy order at Coinbase BTC-USD price 116648.67 (order id=10)
Top of book (bid): id=8, price=116648.67, qty=1
[9] Added buy order at Coinbase BTC-USD price 116647.535 (order id=11)
Top of book (bid): id=8, price=116648.67, qty=1
[10] Added buy order at Coinbase BTC-USD price 116648.67 (order id=12)
Top of book (bid): id=8, price=116648.67, qty=1

  /\_/\
     ( o.o )  ♡
  > ^ <
     /  -  \
    / | | | \
   /  | | |  \
   |  | | |  |
   \_|_|_|_/_/
      
Starting multi-language greeting...
Hello from C++!
Hello from Go!
[Go] Added buy order id=13, sell order id=14
[Go] Top of book (bid): id=8, price=116648.67, qty=1
[Go] Top of book (ask): id=2, price=102.00, qty=5
[Go] Cancel buy order result: 1
[Go] Top of book (bid) after cancel: id=8, price=116648.67, qty=1
[Rust] Added buy order id=15, sell order id=16
[Rust] Top of book (bid): id=8, price=116648.67, qty=1
[Rust] Top of book (ask): id=2, price=102, qty=5
[Rust] Cancel buy order result: 1
[Rust] Top of book (bid) after cancel: id=8, price=116648.67, qty=1
All languages have greeted successfully!
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
- If you see `ModuleNotFoundError: No module named 'requests'`, ensure you have activated your virtual environment and run `pip install requests`.

## License
MIT
