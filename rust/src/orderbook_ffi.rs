//! Rust FFI bindings for the C++ order book

extern "C" {
    pub fn ob_add_order(price: f64, qty: i32, is_buy: i32) -> i32;
    pub fn ob_cancel_order(id: i32) -> i32;
    pub fn ob_get_top_of_book(is_buy: i32, price: *mut f64, qty: *mut i32, id: *mut i32);
}

pub fn rust_strategy_demo() {
    unsafe {
        let buy_id = ob_add_order(101.5, 10, 1);
        let sell_id = ob_add_order(102.0, 5, 0);
        println!("[Rust] Added buy order id={}, sell order id={}", buy_id, sell_id);

        let mut price = 0.0f64;
        let mut qty = 0i32;
        let mut oid = 0i32;
        ob_get_top_of_book(1, &mut price, &mut qty, &mut oid);
        println!("[Rust] Top of book (bid): id={}, price={}, qty={}", oid, price, qty);

        ob_get_top_of_book(0, &mut price, &mut qty, &mut oid);
        println!("[Rust] Top of book (ask): id={}, price={}, qty={}", oid, price, qty);

        let result = ob_cancel_order(buy_id);
        println!("[Rust] Cancel buy order result: {}", result);

        ob_get_top_of_book(1, &mut price, &mut qty, &mut oid);
        println!("[Rust] Top of book (bid) after cancel: id={}, price={}, qty={}", oid, price, qty);
    }
}

