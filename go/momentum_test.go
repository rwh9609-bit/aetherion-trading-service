package main

import (
    "context"
    "testing"
    "time"
    pb "aetherion-trading-service/gen"
)

// helper to build hist points
func addHist(s *tradingServer, sym string, times []time.Time, prices []float64) {
    s.histMu.Lock()
    arr := make([]histPoint, len(times))
    for i := range times { arr[i] = histPoint{ts: times[i], price: prices[i]} }
    s.priceHist[sym] = arr
    s.histMu.Unlock()
    // also set lastPrices so empty symbol request picks it up
    s.priceMu.Lock(); s.lastPrices[sym] = prices[len(prices)-1]; s.priceMu.Unlock()
}

func TestGetMomentumBasicAndSorting(t *testing.T) {
    s := newTradingServer()
    now := time.Now()
    // Symbol A with mild upward movement (smaller jumps to reduce volatility penalty)
    timesA := []time.Time{ now.Add(-5 * time.Minute), now.Add(-1 * time.Minute), now }
    pricesA := []float64{100, 100.5, 101}
    addHist(s, "A-USD", timesA, pricesA)
    // Symbol B flat
    timesB := []time.Time{ now.Add(-5 * time.Minute), now.Add(-1 * time.Minute), now }
    pricesB := []float64{100, 100, 100}
    addHist(s, "B-USD", timesB, pricesB)

    resp, err := s.GetMomentum(context.Background(), &pb.MomentumRequest{Symbols: []string{"A-USD","B-USD"}})
    if err != nil { t.Fatalf("GetMomentum error: %v", err) }
    if len(resp.Metrics) != 2 { t.Fatalf("expected 2 metrics got %d", len(resp.Metrics)) }
    // locate metrics for assertions
    var a, b *pb.MomentumMetric
    for _, m := range resp.Metrics { if m.Symbol == "A-USD" { a = m } else if m.Symbol == "B-USD" { b = m } }
    if a == nil || b == nil { t.Fatalf("missing metrics for symbols: %+v", resp.Metrics) }
    if a.LastPrice != 101 { t.Fatalf("expected A last price 101 got %v", a.LastPrice) }
    if a.PctChange_5M <= 0 { t.Fatalf("expected positive 5m change for A") }
    if b.PctChange_5M != 0 { t.Fatalf("expected zero 5m change for B") }
}

func TestGetMomentumDefaultSymbols(t *testing.T) {
    s := newTradingServer()
    now := time.Now()
    addHist(s, "C-USD", []time.Time{now.Add(-5*time.Minute), now.Add(-1*time.Minute), now}, []float64{50,50,50})
    // request with no explicit symbols should include C-USD
    resp, err := s.GetMomentum(context.Background(), &pb.MomentumRequest{})
    if err != nil { t.Fatalf("GetMomentum error: %v", err) }
    if len(resp.Metrics) != 1 { t.Fatalf("expected 1 metric got %d", len(resp.Metrics)) }
    if resp.Metrics[0].Symbol != "C-USD" { t.Fatalf("expected C-USD symbol got %s", resp.Metrics[0].Symbol) }
}
