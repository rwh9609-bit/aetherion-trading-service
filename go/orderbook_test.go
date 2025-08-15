package main

import "testing"

func TestOrderBookManagerBasics(t *testing.T) {
    ob := NewOrderBookManager()
    ob.AddBid(100, 1)
    ob.AddBid(101, 2)
    ob.AddAsk(105, 1.5)
    ob.AddAsk(106, 0.7)
    bids, asks := ob.GetTopLevels(5)
    if len(bids) != 2 || len(asks) != 2 {
        t.Fatalf("expected 2 bids & 2 asks got %d %d", len(bids), len(asks))
    }
    if bids[0].Price == 0 || asks[0].Price == 0 { t.Fatalf("expected prices to be populated") }
}
