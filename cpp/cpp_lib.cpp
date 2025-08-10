#include <iostream>
#include "go_lib.h"
#include <string>

// A C++ internal function. Its name can be mangled.
void greet_from_cpp() {
    std::cout << "Hello from C++!" << std::endl;
}

// --- Risk Management ---

const int MAX_POSITION = 100; // Maximum position size




// --- Order Book Implementation ---
#include <vector>
#include <algorithm>

struct Order {
    int id;
    double price;
    int qty;
    bool is_buy;
};

struct Trade {
    int buy_order_id;
    int sell_order_id;
    double price;
    int qty;
};
class OrderBook {
public:

    // Make orders public for testing purposes
    std::vector<Order> orders;
    int next_id = 1;

    int add_order(double price, int qty, bool is_buy) {
        // 1. Perform risk check first on the original order quantity.
        if (!check_position_limit(qty, is_buy)) {
            std::cout << "Position limit exceeded. Order rejected." << std::endl;
            return 0; // Indicate order rejection
        }

        // 2. If risk check passes, proceed with matching.
        Order new_order = {next_id, price, qty, is_buy};
        match_order(new_order);
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

    // Match incoming order with existing orders. 
    bool match_order(Order& new_order) {
        std::vector<Trade> trades;
        bool order_filled = false;

        for (auto it = orders.begin(); it != orders.end(); ) {
            Order& existing_order = *it;
            // Corrected matching logic:
            // - A buy order's price must be >= an existing sell order's price.
            // - A sell order's price must be <= an existing buy order's price.
            bool prices_cross = (new_order.is_buy && new_order.price >= existing_order.price) ||
                                (!new_order.is_buy && new_order.price <= existing_order.price);
            if (new_order.is_buy != existing_order.is_buy && prices_cross) {
                 //Match!
                int trade_qty = std::min(new_order.qty, existing_order.qty);
                trades.push_back({new_order.id, existing_order.id, existing_order.price, trade_qty});

                new_order.qty -= trade_qty;
                existing_order.qty -= trade_qty;

                if (existing_order.qty == 0) {
                    it = orders.erase(it);
                } else {
                    ++it;
                }

                if (new_order.qty == 0) {
                    order_filled = true;
                    break;
                }
            } else {
                 ++it;
            }
        }

        if (!order_filled) {
            orders.push_back(new_order);
        }
        
        for (const auto& trade : trades) {
            std::cout << "Trade executed: buy_order_id=" << trade.buy_order_id
                      << ", sell_order_id=" << trade.sell_order_id
                      << ", price=" << trade.price << ", qty=" << trade.qty << std::endl;
        }
        return true;
    }

	bool check_position_limit(int qty, bool is_buy) {
        int current_position = 0;
        for (const auto& o : orders) {
            if (o.is_buy) {
                current_position += o.qty;
            } else {
                current_position -= o.qty;
            }
        }

        int new_position = current_position + (is_buy ? qty : -qty);
        return std::abs(new_position) <= MAX_POSITION;
    }

    bool reduce_order(int id, int qty_to_reduce) {
        auto it = std::find_if(orders.begin(), orders.end(), [id](const Order& o){ return o.id == id; });
        if (it != orders.end()) {
            if(qty_to_reduce > it->qty){
                return false;
            }
            it->qty -= qty_to_reduce;
            if (it->qty == 0) {
                orders.erase(it);
            }

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
extern "C" __attribute__((visibility("default")))
void ob_clear() {
    g_orderbook.orders.clear();
    g_orderbook.next_id = 1;
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
