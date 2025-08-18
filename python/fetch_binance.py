import requests
import time
import json

def fetch_binance_price(symbol="BTCUSDT"):
    """Fetch current price from either Binance or Coinbase API"""
    # Normalize symbol for Binance and Coinbase
    # Supported coins for demo: BTC, ETH, SOL, ILV
    supported = {"BTC", "ETH", "SOL", "ILV"}
    base = symbol.replace("USDT", "").replace("USD", "")
    base = base.upper()
    if base not in supported:
        raise Exception(f"Symbol '{base}' is not supported.")
    binance_symbol = f"{base}USDT"
    coinbase_symbol = f"{base}-USD"
    # Try Coinbase first
    try:
        cb_url = f"https://api.coinbase.com/v2/prices/{coinbase_symbol}/spot"
        resp = requests.get(cb_url)
        if resp.status_code != 200:
            print(f"Coinbase API response for {coinbase_symbol}: {resp.text}")
        resp.raise_for_status()
        data = resp.json()
        price = float(data["data"]["amount"])
        print(f"Successfully fetched price for {base} from Coinbase")
        return price
    except requests.exceptions.RequestException as e:
        print(f"Error fetching price from Coinbase: {str(e)}")
        # Fallback to Binance
        print("Trying Binance API...")
        try:
            url = f"https://api.binance.com/api/v3/ticker/price?symbol={binance_symbol}"
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
            }
            resp = requests.get(url, headers=headers)
            if resp.status_code != 200:
                print(f"Binance API response for {binance_symbol}: {resp.text}")
            resp.raise_for_status()
            data = resp.json()
            price = float(data["price"])
            print(f"Successfully fetched price for {base} from Binance")
            return price
        except requests.exceptions.RequestException as e:
            print(f"Error fetching price from Binance: {str(e)}")
            raise Exception(f"Symbol '{base}' is supported, but no price available from Coinbase or Binance. Last responses logged above.")

import csv
from datetime import datetime

CSV_FILE = "data/BTCUSD_1min.csv"

def append_price_to_csv(price, timestamp):
    with open(CSV_FILE, mode="a", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([timestamp, price])

if __name__ == "__main__":
    print("Streaming live BTC/USDT price to CSV every minute...")
    while True:
        try:
            price = fetch_binance_price()
            timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
            append_price_to_csv(price, timestamp)
            print(f"{timestamp}, BTC/USDT: ${price:,.2f}")
        except Exception as e:
            print(f"Error: {str(e)}")
        time.sleep(60)
