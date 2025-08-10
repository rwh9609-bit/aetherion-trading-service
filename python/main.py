import requests
import time
def fetch_binance_price(symbol="BTCUSDT"):
	url = "https://api.coinbase.com/v2/prices/BTC-USD/spot"
	resp = requests.get(url)
	resp.raise_for_status()
	return float(resp.json()["data"]["amount"])
import ctypes
import ctypes
import os


# Get the directory of the current script
script_dir = os.path.dirname(os.path.abspath(__file__))
bin_dir = os.path.abspath(os.path.join(script_dir, "..", "bin"))
libcpp_path = os.path.join(bin_dir, "libcpp.dylib")
libgo_path = os.path.join(bin_dir, "libgo.dylib")
librust_path = os.path.join(bin_dir, "librust_lib.dylib")


try:
	# Load provider first (libcpp), then consumers (librust, libgo)
	mode = ctypes.RTLD_GLOBAL if hasattr(ctypes, 'RTLD_GLOBAL') else None
	lib = ctypes.CDLL(libcpp_path, mode=mode) if mode else ctypes.CDLL(libcpp_path)
	ctypes.CDLL(librust_path, mode=mode) if mode else ctypes.CDLL(librust_path)
	ctypes.CDLL(libgo_path, mode=mode) if mode else ctypes.CDLL(libgo_path)
	print("Shared library loaded successfully.")

	# Set argument and return types for order book functions
	lib.ob_add_order.argtypes = [ctypes.c_double, ctypes.c_int, ctypes.c_int]
	lib.ob_add_order.restype = ctypes.c_int

	lib.ob_cancel_order.argtypes = [ctypes.c_int]
	lib.ob_cancel_order.restype = ctypes.c_int

	lib.ob_get_top_of_book.argtypes = [ctypes.c_int, ctypes.POINTER(ctypes.c_double), ctypes.POINTER(ctypes.c_int), ctypes.POINTER(ctypes.c_int)]
	lib.ob_get_top_of_book.restype = None

	# Demo: Add a buy and a sell order
	buy_id = lib.ob_add_order(101.5, 10, 1)
	sell_id = lib.ob_add_order(102.0, 5, 0)
	print(f"Added buy order id={buy_id}, sell order id={sell_id}")

	# Query top of book for buy (bid)
	price = ctypes.c_double()
	qty = ctypes.c_int()
	oid = ctypes.c_int()
	lib.ob_get_top_of_book(1, ctypes.byref(price), ctypes.byref(qty), ctypes.byref(oid))
	print(f"Top of book (bid): id={oid.value}, price={price.value}, qty={qty.value}")

	# Query top of book for sell (ask)
	lib.ob_get_top_of_book(0, ctypes.byref(price), ctypes.byref(qty), ctypes.byref(oid))
	print(f"Top of book (ask): id={oid.value}, price={price.value}, qty={qty.value}")

	# Cancel the buy order
	result = lib.ob_cancel_order(buy_id)
	print(f"Cancel buy order result: {result}")

	# Query top of book for buy again
	lib.ob_get_top_of_book(1, ctypes.byref(price), ctypes.byref(qty), ctypes.byref(oid))
	print(f"Top of book (bid) after cancel: id={oid.value}, price={price.value}, qty={qty.value}")

	# --- Live Coinbase Integration Demo ---
	print("\n--- Live Coinbase Price Feed Demo ---")
	price = ctypes.c_double()
	qty = ctypes.c_int()
	oid = ctypes.c_int()
	for i in range(1):
		live_price = fetch_binance_price()
		live_price = fetch_binance_price()
		print(f"[{i+1}] Added buy order at Coinbase BTC-USD price {live_price} (order id={order_id})")
		lib.ob_get_top_of_book(1, ctypes.byref(price), ctypes.byref(qty), ctypes.byref(oid))
		print(f"Top of book (bid): id={oid.value}, price={price.value}, qty={qty.value}")
		time.sleep(2)
	# Call the original demo
	lib.master_greet()
except OSError as e:
	print(f"Error loading shared library: {e}")
	print("Ensure the C++ code has been compiled and the library exists.")
