from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict
from backtest_engine import BacktestEngine, load_historical_data, run_custom_strategy_backtest
from strategies.mean_reversion import MeanReversionStrategy, MeanReversionParams
from fetch_binance import fetch_binance_price
import csv
from datetime import datetime
# from protos.trading_api_pb2 import CustomStrategy as CustomStrategyProto  # not needed for request parsing

router = APIRouter()

class BacktestCustomStrategyRequest(BaseModel):
    # Match the frontend payload exactly: { symbol: 'BTCUSD', strategy_definition: {...} }
    symbol: str
    strategy_definition: dict
    model_config = ConfigDict(arbitrary_types_allowed=True)

@router.post("/download_historical_data")
async def download_historical_data(request: Request):
    """Download and fill historical CSV data for a symbol using Binance API."""
    body = await request.json()
    symbol = body.get("symbol", "BTCUSD")
    base = symbol.replace("USDT", "").replace("USD", "").upper()
    binance_symbol = f"{base}USDT"
    csv_file = f"data/{base}USD_1-min_data.csv"
    import requests
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
                price = float(k[4])  # close price
                writer.writerow([ts, price])
        return {"status": "success", "rows": len(klines), "file": csv_file}
    except Exception as e:
        return {"status": "error", "error": str(e)}

@router.post("/fetch_live_data")
async def fetch_live_data(request: Request, symbol: str = None):
    print("fetch_live_data called")
    try:
        body = await request.json()
        body_symbol = body.get("symbol")
    except Exception:
        body_symbol = None
    symbol = body_symbol or symbol or "BTCUSDT"
    try:
        price = fetch_binance_price(symbol)
        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        print(f"Fetched {price} for {symbol} at {timestamp}. CSV file: data/{symbol.replace('USDT','USD')}_1-min_data.csv")
        return {"timestamp": timestamp, "price": price, "status": "success"}
    except Exception as e:
        return {"error": str(e), "status": "error"}

@router.get("/marketdata")
async def get_market_data(symbol: str = "BTCUSD"):
    print(f"get_market_data called for {symbol}")
    try:
        data = load_historical_data(f"data/{symbol}_1-min_data.csv")
    except FileNotFoundError:
        return JSONResponse(status_code=404, content={"symbol": symbol, "data": [], "error": f"No data file found for {symbol}"})
    for tick in data:
        tick['timestamp'] = tick['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
    return {"symbol": symbol, "data": data}

@router.post("/backtest/custom")
async def run_custom_backtest(request_body: BacktestCustomStrategyRequest):
    print("run_custom_backtest called")
    symbol = request_body.symbol
    strategy_definition = request_body.strategy_definition

    try:
        historical_data = load_historical_data(f"data/{symbol}_1-min_data.csv")
    except FileNotFoundError:
        return JSONResponse(status_code=404, content={"error": f"Historical data not found for {symbol}. Call /download_historical_data first.", "symbol": symbol})

    trades, equity_curve = run_custom_strategy_backtest(strategy_definition, historical_data)

    for t in trades:
        t['timestamp'] = t['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
    for e in equity_curve:
        e['timestamp'] = e['timestamp'].strftime('%Y-%m-%d %H:%M:%S')

    return {
        "trades": trades,
        "equity_curve": equity_curve
    }

@router.post("/api/backtest")
async def backtest_blocks(request: Request):
    body = await request.json()
    blocks = body.get("blocks", [])
    symbol = body.get("symbol", "BTCUSD")
    indicators, signals, actions = [], [], []
    for block in blocks:
        if block["type"] == "Indicator":
            indicators.append(block["config"])
        elif block["type"] == "Signal":
            signals.append(block["config"])
        elif block["type"] == "Action":
            actions.append(block["config"])
    result = {
        "profit": 1234,
        "trades": 42,
        "winRate": "67%",
        "indicators": indicators,
        "signals": signals,
        "actions": actions,
        "symbol": symbol,
    }
    return result

# Note: Stripe webhook is defined in app.py; avoid defining another here to prevent conflicts.