package main

import (
    "testing"
    pb "github.com/rwh9609-bit/aetherion/gen"
    "context"
)

// helper to invoke trade and return response
func execTrade(t *testing.T, s *tradingServer, req *pb.TradeRequest) *pb.TradeResponse {
    t.Helper()
    resp, err := s.ExecuteTrade(context.Background(), req)
    if err != nil { t.Fatalf("ExecuteTrade error: %v", err) }
    return resp
}

func TestExecuteTradeBuySellHappyPath(t *testing.T) {
    s := newTradingServer()
    // BUY 10 TEST-USD @ 100
    buy := &pb.TradeRequest{Symbol: "TEST-USD", Side: "BUY", Size: 10, Price: 100}
    resp := execTrade(t, s, buy)
    if !resp.Accepted { t.Fatalf("expected buy accepted, got %+v", resp) }
    s.mu.RLock(); usd := s.portfolios["default"].Positions["USD"]; pos := s.portfolios["default"].Positions["TEST-USD"]; s.mu.RUnlock()
    if pos != 10 { t.Errorf("expected position 10 got %v", pos) }
    if usd != 100000 - 100*10 { t.Errorf("unexpected USD balance %v", usd) }

    // SELL 5 @ 110
    sell := &pb.TradeRequest{Symbol: "TEST-USD", Side: "SELL", Size: 5, Price: 110}
    resp2 := execTrade(t, s, sell)
    if !resp2.Accepted { t.Fatalf("expected sell accepted, got %+v", resp2) }
    s.mu.RLock(); usd2 := s.portfolios["default"].Positions["USD"]; pos2 := s.portfolios["default"].Positions["TEST-USD"]; s.mu.RUnlock()
    if pos2 != 5 { t.Errorf("expected remaining position 5 got %v", pos2) }
    if usd2 != usd + 5*110 { t.Errorf("unexpected USD after sell %v", usd2) }
}

func TestExecuteTradeInsufficientUSD(t *testing.T) {
    s := newTradingServer()
    // attempt BUY too large
    resp := execTrade(t, s, &pb.TradeRequest{Symbol: "BTC-USD", Side: "BUY", Size: 2000, Price: 100})
    if resp.Accepted { t.Fatalf("expected rejection for insufficient USD") }
}

func TestExecuteTradeInvalidSide(t *testing.T) {
    s := newTradingServer()
    resp := execTrade(t, s, &pb.TradeRequest{Symbol: "BTC-USD", Side: "HOLD", Size: 1, Price: 100})
    if resp.Accepted { t.Fatalf("expected rejection for invalid side") }
}

func TestExecuteTradeInsufficientPosition(t *testing.T) {
    s := newTradingServer()
    // attempt SELL without holdings
    resp := execTrade(t, s, &pb.TradeRequest{Symbol: "ETH-USD", Side: "SELL", Size: 1, Price: 2000})
    if resp.Accepted { t.Fatalf("expected rejection for insufficient position") }
}
