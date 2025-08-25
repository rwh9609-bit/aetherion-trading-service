package main

import (
	"container/heap"
	"sync"
)

// PriceLevel represents a price level in the order book
type PriceLevel struct {
	Price float64
	Size  float64
}

// OrderBookSide is a min/max heap of price levels
type OrderBookSide []PriceLevel

// OrderBookManager manages the order book for a symbol
type OrderBookManager struct {
	Mu   sync.RWMutex
	Bids *OrderBookSide
	Asks *OrderBookSide
}

func NewOrderBookManager() *OrderBookManager {
	bids := &OrderBookSide{}
	asks := &OrderBookSide{}
	heap.Init(bids)
	heap.Init(asks)
	return &OrderBookManager{
		 Bids: bids,
		 Asks: asks,
	}
}

// Removed duplicate GetTopLevels method to resolve redeclaration error.
