import ctypes
import os

# Get the directory of the current script
script_dir = os.path.dirname(os.path.abspath(__file__))
lib_path = os.path.join(script_dir, "..", "bin", "libcpp.dylib")

# Load the shared library
# On macOS, shared libraries have the .dylib extension
try:
	lib = ctypes.CDLL(lib_path)
	print("Shared library loaded successfully.")

	# Call the C++ function
	lib.master_greet()
except OSError as e:
	print(f"Error loading shared librar: {e}")
	print("Ensure the C++ code has been compiled and the library exists.")
