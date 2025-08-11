import requests
import time
import json

def fetch_binance_price(symbol="BTCUSDT"):
    """Fetch current price from either Binance or Coinbase API"""
    try:
        # Try Coinbase first
        cb_symbol = "BTC-USD" if symbol == "BTCUSDT" else symbol.replace("USDT", "-USD")
        cb_url = f"https://api.coinbase.com/v2/prices/{cb_symbol}/spot"
        resp = requests.get(cb_url)
        resp.raise_for_status()
        data = resp.json()
        price = float(data["data"]["amount"])
        print("Successfully fetched price from Coinbase")
        return price
    except requests.exceptions.RequestException as e:
        print(f"Error fetching price from Coinbase: {str(e)}")
        
        # Fallback to Binance
        print("Trying Binance API...")
        try:
            url = f"https://api.binance.com/api/v3/ticker/price?symbol={symbol}"
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
            }
            resp = requests.get(url, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            price = float(data["price"])
            print("Successfully fetched price from Binance")
            return price
        except requests.exceptions.RequestException as e:
            print(f"Error fetching price from Binance: {str(e)}")
            raise Exception("Failed to fetch price from both Coinbase and Binance")
        
        # Fallback to Coinbase
        try:
            # Convert BTCUSDT to BTC-USD format
            cb_symbol = "BTC-USD" if symbol == "BTCUSDT" else symbol.replace("USDT", "-USD")
            cb_url = f"https://api.coinbase.com/v2/prices/{cb_symbol}/spot"
            resp = requests.get(cb_url)
            resp.raise_for_status()
            data = resp.json()
            price = float(data["data"]["amount"])
            print("Successfully fetched price from Coinbase")
            return price
        except requests.exceptions.RequestException as e:
            print(f"Error fetching price from Coinbase: {str(e)}")
            raise Exception("Failed to fetch price from both Binance and Coinbase")

if __name__ == "__main__":
    print("Fetching live BTC/USDT price...")
    for _ in range(10):
        try:
            price = fetch_binance_price()
            print(f"BTC/USDT: ${price:,.2f}")
        except Exception as e:
            print(f"Error: {str(e)}")
        time.sleep(2)
