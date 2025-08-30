from fastapi import APIRouter, Request
router = APIRouter()
from backtest_engine import BacktestEngine, load_historical_data
from strategies.mean_reversion import MeanReversionStrategy, MeanReversionParams
from fetch_binance import fetch_binance_price
import csv
from datetime import datetime
@router.post("/download_historical_data")
async def download_historical_data(request: Request):
    """Download and fill historical CSV data for a symbol using Binance API."""
    from fastapi import APIRouter, Request
    from backtest_engine import BacktestEngine, load_historical_data
    from strategies.mean_reversion import MeanReversionStrategy, MeanReversionParams
    from fetch_binance import fetch_binance_price
    import csv
    from datetime import datetime

    router = APIRouter()
    body = await request.json()
    symbol = body.get("symbol", "BTCUSD")
    # Normalize symbol for Binance
    base = symbol.replace("USDT", "").replace("USD", "")
    base = base.upper()
    binance_symbol = f"{base}USDT"
    csv_file = f"data/{base}USD_1min.csv"
    import requests
    import csv
    from datetime import datetime
    # Download last 1000 1m klines from Binance
    url = f"https://api.binance.com/api/v3/klines?symbol={binance_symbol}&interval=1m&limit=1000"
    try:
        resp = requests.get(url)
        resp.raise_for_status()
        klines = resp.json()
        with open(csv_file, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["timestamp", "price"])
            for k in klines:
                ts = datetime.utcfromtimestamp(k[0]//1000).strftime("%Y-%m-%d %H:%M:%S")
                price = float(k[4]) # close price
                writer.writerow([ts, price])
        return {"status": "success", "rows": len(klines), "file": csv_file}
    except Exception as e:
        return {"status": "error", "error": str(e)}
from fastapi import APIRouter, Request
from fastapi import Body
from backtest_engine import BacktestEngine, load_historical_data
from strategies.mean_reversion import MeanReversionStrategy, MeanReversionParams
from fetch_binance import fetch_binance_price
import csv
from datetime import datetime

router = APIRouter()

@router.post("/fetch_live_data")
async def fetch_live_data(request: Request, symbol: str = None):
    """Fetch latest price and append to CSV. Accepts symbol from query or POST body."""
    print("fetch_live_data called")
    # Try to get symbol from query string
    query_symbol = symbol
    # Try to get symbol from POST body (JSON)
    try:
        body = await request.json()
        body_symbol = body.get("symbol")
    except Exception:
        body_symbol = None
    # Prefer body symbol if present, else query symbol, else default
    symbol = body_symbol or query_symbol or "BTCUSDT"
    """Fetch latest price and append to CSV."""
    try:
        price = fetch_binance_price(symbol)
        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        print(f"Fetched {price} for {symbol} at {timestamp}. CSV file: data/{symbol.replace('USDT','USD')}_1min.csv")
        # csv_file = f"data/{symbol.replace('USDT','USD')}_1min.csv"
        # with open(csv_file, mode="a", newline="", encoding="utf-8") as f:
        #     writer = csv.writer(f)
        #     writer.writerow([timestamp, price])
        return {"timestamp": timestamp, "price": price, "status": "success"}
    except Exception as e:
        return {"error": str(e), "status": "error"}

@router.get("/marketdata")
async def get_market_data(symbol: str = "BTCUSD"):
    print(f"get_market_data called for {symbol}")
    # Load historical data and return as JSON
    try:
        data = load_historical_data(f"data/{symbol}_1min.csv")
    except FileNotFoundError:
        return {"symbol": symbol, "data": [], "error": f"No data file found for {symbol}"}
    # Convert datetime to string for JSON serialization
    for tick in data:
        tick['timestamp'] = tick['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
    return {"symbol": symbol, "data": data}

@router.post("/backtest")
async def run_backtest(request: Request):
    print("run_backtest called")
    body = await request.json()
    symbol = body.get("symbol", "BTCUSD")
    params = MeanReversionParams(**body.get("params", {}))
    strategy = MeanReversionStrategy(params=params)
    historical_data = load_historical_data(f"data/{symbol}_1min.csv")
    engine = BacktestEngine(strategy, historical_data)
    trades, equity_curve = engine.run()
    # Convert datetimes for JSON
    for t in trades:
        t['timestamp'] = t['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
    for e in equity_curve:
        e['timestamp'] = e['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
    return {"trades": trades, "equity_curve": equity_curve}


@router.post("/api/backtest")
async def backtest_blocks(request: Request):
    """
    Accepts a list of strategy blocks from the frontend,
    parses them, runs a generic backtest, and returns results.
    """
    body = await request.json()
    blocks = body.get("blocks", [])
    symbol = body.get("symbol", "BTCUSD")

    # Example: Parse blocks into strategy rules
    indicators = []
    signals = []
    actions = []

    for block in blocks:
        if block["type"] == "Indicator":
            indicators.append(block["config"])
        elif block["type"] == "Signal":
            signals.append(block["config"])
        elif block["type"] == "Action":
            actions.append(block["config"])

    # TODO: Use indicators, signals, actions to build a strategy
    # For demonstration, just print them
    print("Parsed Indicators:", indicators)
    print("Parsed Signals:", signals)
    print("Parsed Actions:", actions)

    # Example: Run a dummy backtest (replace with your engine)
    # historical_data = load_historical_data(f"data/{symbol}_1min.csv")
    # strategy = GenericStrategy(indicators, signals, actions)
    # engine = BacktestEngine(strategy, historical_data)
    # trades, equity_curve = engine.run()
    # For now, return a dummy result
    result = {
        "profit": 1234,
        "trades": 42,
        "winRate": "67%",
        "indicators": indicators,
        "signals": signals,
        "actions": actions
    }
    return result

@router.post("/api/deploy")
async def deploy_blocks(request: Request):
    """
    Accepts a list of strategy blocks from the frontend,
    deploys the strategy as a live bot.
    """
    body = await request.json()
    blocks = body.get("blocks", [])
    # TODO: Parse blocks and deploy logic
    # For now, return a dummy success
    return {"success": True, "message": "Strategy deployed"}