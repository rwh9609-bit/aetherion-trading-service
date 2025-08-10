//go:build darwin

package main

/*
#cgo CFLAGS: -I../bin
#cgo LDFLAGS: -L../bin -Wl,-undefined,dynamic_lookup
#include "orderbook_api.h"
*/
import "C"
import "fmt"

//export go_strategy_demo
func go_strategy_demo() {
	buyID := C.ob_add_order(103.5, 20, 1)
	sellID := C.ob_add_order(104.0, 15, 0)
	fmt.Printf("[Go] Added buy order id=%d, sell order id=%d\n", int(buyID), int(sellID))

	var price C.double
	var qty C.int
	var oid C.int
	C.ob_get_top_of_book(1, &price, &qty, &oid)
	fmt.Printf("[Go] Top of book (bid): id=%d, price=%.2f, qty=%d\n", int(oid), float64(price), int(qty))

	C.ob_get_top_of_book(0, &price, &qty, &oid)
	fmt.Printf("[Go] Top of book (ask): id=%d, price=%.2f, qty=%d\n", int(oid), float64(price), int(qty))

	result := C.ob_cancel_order(buyID)
	fmt.Printf("[Go] Cancel buy order result: %d\n", int(result))

	C.ob_get_top_of_book(1, &price, &qty, &oid)
	fmt.Printf("[Go] Top of book (bid) after cancel: id=%d, price=%.2f, qty=%d\n", int(oid), float64(price), int(qty))
}
