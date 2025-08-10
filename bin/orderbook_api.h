// C++ order book API header for FFI
#ifndef ORDERBOOK_API_H
#define ORDERBOOK_API_H

#ifdef __cplusplus
extern "C" {
#endif

int ob_add_order(double price, int qty, int is_buy);
int ob_cancel_order(int id);
void ob_get_top_of_book(int is_buy, double* price, int* qty, int* id);

#ifdef __cplusplus
}
#endif

#endif // ORDERBOOK_API_H
