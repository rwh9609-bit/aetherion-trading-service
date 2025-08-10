mod orderbook_ffi;

#[no_mangle]
pub extern "C" fn greet_from_rust() {
	orderbook_ffi::rust_strategy_demo();
}
