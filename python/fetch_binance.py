import requests
import time

def fetch_binance_price(symbol="BTCUSDT"):
    url = f"https://api.binance.com/api/v3/ticker/price?symbol={symbol}"
    resp = requests.get(url)
    resp.raise_for_status()
    return float(resp.json()["price"])

if __name__ == "__main__":
    print("Fetching live BTC/USDT price from Binance...")
    for _ in range(10):
        price = fetch_binance_price()
        print(f"BTC/USDT: {price}")
        time.sleep(2)
