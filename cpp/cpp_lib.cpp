#include <iostream>
#include "go_lib.h"
#include <string>

// A C++ internal function. Its name can be mangled.
void greet_from_cpp() {
    std::cout << "Hello from C++!" << std::endl;
}

// --- Order Book Implementation ---
#include <vector>
#include <algorithm>

struct Order {
    int id;
    double price;
    int qty;
    bool is_buy;
};

class OrderBook {
public:
    std::vector<Order> orders;
    int next_id = 1;

    int add_order(double price, int qty, bool is_buy) {
        orders.push_back({next_id, price, qty, is_buy});
        return next_id++;
    }
    bool cancel_order(int id) {
        auto it = std::remove_if(orders.begin(), orders.end(), [id](const Order& o){ return o.id == id; });
        if (it != orders.end()) {
            orders.erase(it, orders.end());
            return true;
        }
        return false;
    }
    // Returns best price and qty for buy/sell (is_buy=true for bid, false for ask)
    Order get_top_of_book(bool is_buy) {
        Order best = {0, is_buy ? 0.0 : 1e12, 0, is_buy};
        for (const auto& o : orders) {
            if (o.is_buy == is_buy) {
                if ((is_buy && o.price > best.price) || (!is_buy && o.price < best.price)) {
                    best = o;
                }
            }
        }
        return best;
    }
};

static OrderBook g_orderbook;

// Declare the external function from Rust.
extern "C" void greet_from_rust();

// Order book C API (must be top-level, extern "C", and visible)
extern "C" __attribute__((visibility("default")))
int ob_add_order(double price, int qty, int is_buy) {
    return g_orderbook.add_order(price, qty, is_buy);
}

extern "C" __attribute__((visibility("default")))
int ob_cancel_order(int id) {
    return g_orderbook.cancel_order(id) ? 1 : 0;
}

extern "C" __attribute__((visibility("default")))
void ob_get_top_of_book(int is_buy, double* price, int* qty, int* id) {
    Order o = g_orderbook.get_top_of_book(is_buy);
    *price = o.price;
    *qty = o.qty;
    *id = o.id;
}

// Existing demo function
extern "C" void master_greet() {
    std::cout << "\n";
    std::string cat_art = R"(
      /\_/\
     ( o.o )  ♡
      > ^ <
     /  -  \
    / | | | \
   /  | | |  \
   |  | | |  |
   \_|_|_|_/_/
      )"
      "\n";
    std::cout << cat_art;
    std::cout << "Starting multi-language greeting..." << std::endl;
    greet_from_cpp();
    greet_from_go();
    greet_from_rust();
    std::cout << "All languages have greeted successfully!" << std::endl;
}
