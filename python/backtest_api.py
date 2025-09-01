from fastapi import APIRouter, Request
from fastapi import Body
from pydantic import BaseModel
from backtest_engine import BacktestEngine, load_historical_data, run_custom_strategy_backtest
from strategies.mean_reversion import MeanReversionStrategy, MeanReversionParams
from fetch_binance import fetch_binance_price
import csv
from datetime import datetime
from protos.trading_api_pb2 import CustomStrategy as CustomStrategyProto

router = APIRouter()

class BacktestCustomStrategyRequest(BaseModel):
    symbol: str
    strategy_definition: CustomStrategyProto

    model_config = {
        "arbitrary_types_allowed": True
    }

@router.post("/download_historical_data")
async def download_historical_data(request: Request):
    """Download and fill historical CSV data for a symbol using Binance API."""
    body = await request.json()
    symbol = body.get("symbol", "BTCUSD")
    # Normalize symbol for Binance
    base = symbol.replace("USDT", "").replace("USD", "")
    base = base.upper()
    binance_symbol = f"{base}USDT"
    csv_file = f"data/{base}USD_1-min_data.csv"
    import requests
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
        print(f"Fetched {price} for {symbol} at {timestamp}. CSV file: data/{symbol.replace('USDT','USD')}_1-min_data.csv")
        # csv_file = f"data/{symbol.replace('USDT','USD')}_1-min_data.csv"
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

@router.post("/backtest/custom")
async def run_custom_backtest(request_body: BacktestCustomStrategyRequest):
    print("run_custom_backtest called")
    symbol = request_body.symbol
    strategy_definition = request_body.strategy_definition

    historical_data = load_historical_data(f"data/{symbol}_1-min_data.csv")
    trades, equity_curve = run_custom_strategy_backtest(strategy_definition, historical_data)

    # Convert datetimes for JSON
    for t in trades:
        t['timestamp'] = t['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
    for e in equity_curve:
        e['timestamp'] = e['timestamp'].strftime('%Y-%m-%d %H:%M:%S')

    return {
        "trades": trades,
        "equity_curve": equity_curve
    }

@router.post("/backtest/custom")
async def run_custom_backtest(request_body: BacktestCustomStrategyRequest):
    print("run_custom_backtest called")
    symbol = request_body.symbol
    strategy_definition = request_body.strategy_definition

    historical_data = load_historical_data(f"data/{symbol}_1-min_data.csv")
    trades, equity_curve = run_custom_strategy_backtest(strategy_definition, historical_data)

    # Convert datetimes for JSON
    for t in trades:
        t['timestamp'] = t['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
    for e in equity_curve:
        e['timestamp'] = e['timestamp'].strftime('%Y-%m-%d %H:%M:%S')

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

@router.post("/stripe-webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    # Optionally: verify signature, parse event, handle logic
    # For example, you might want to check the event type
    event_type = payload.get("type")
    if event_type == "payment_intent.succeeded":
        print("Payment succeeded:", payload)
        # TODO: Handle successful payment (e.g., unlock features)
        unlock_features(payload)

    elif event_type == "payment_intent.failed":
        print("Payment failed:", payload)
        # TODO: Handle failed payment (e.g., notify user)
        notify_user(payload)
    return {"status": "ok"}

def unlock_features(payload):
    # TODO: Implement feature unlocking logic
    print("Unlocking features for user:", payload.get("user_id"))
    # Example: Update user record in database
    # user = db.get_user(payload.get("user_id"))
    # user.features.unlocked = True
    # db.save_user(user)


def notify_user(payload):
    # TODO: Implement user notification logic
    print("Notifying user of payment failure:", payload.get("user_id"))
    # Example: Send email or push notification
    # user = db.get_user(payload.get("user_id"))
    # send_notification(user, "Payment failed", "Your payment was not successful.")