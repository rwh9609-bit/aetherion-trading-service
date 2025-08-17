from fastapi import APIRouter, Request
from python.backtest_engine import BacktestEngine, load_historical_data
from python.strategies.mean_reversion import MeanReversionStrategy, MeanReversionParams

router = APIRouter()

@router.get("/marketdata")
async def get_market_data(symbol: str = "BTCUSD"):
    # Load historical data and return as JSON
    data = load_historical_data(f"data/{symbol}_1min.csv")
    # Convert datetime to string for JSON serialization
    for tick in data:
        tick['timestamp'] = tick['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
    return {"symbol": symbol, "data": data}

@router.post("/backtest")
async def run_backtest(request: Request):
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