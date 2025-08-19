package main

import (
	"context"
	"testing"

	pb "github.com/rwh9609-bit/multilanguage/go/gen"
)

// helper to invoke trade and return response
func execTrade(t *testing.T, s *tradingServer, req *pb.TradeRequest) *pb.TradeResponse {
	t.Helper()
	resp, err := s.ExecuteTrade(context.Background(), req)
	if err != nil {
		t.Fatalf("ExecuteTrade error: %v", err)
	}
	return resp
}

func TestExecuteTradeBuySellHappyPath(t *testing.T) {
	s := newTradingServer()
	// BUY 10 TEST-USD @ 100
	buy := &pb.TradeRequest{Symbol: "TEST-USD", Side: "BUY", Size: 10, Price: 100}
	resp := execTrade(t, s, buy)
	if !resp.Accepted {
		t.Fatalf("expected buy accepted, got %+v", resp)
	}
	portfolios, err := s.db.GetPortfolioByUserID(context.Background(), "default-user-id")
	if err != nil {
		t.Fatalf("failed to get portfolio: %v", err)
	}
	var usd, pos float64
	for _, p := range portfolios {
		if p.Symbol == "USD" {
			usd = p.Quantity
		}
		if p.Symbol == "TEST-USD" {
			pos = p.Quantity
		}
	}
	if pos != 10 {
		t.Errorf("expected position 10 got %v", pos)
	}
	if usd != 100000-100*10 {
		t.Errorf("unexpected USD balance %v", usd)
	}

	// SELL 5 @ 110
	sell := &pb.TradeRequest{Symbol: "TEST-USD", Side: "SELL", Size: 5, Price: 110}
	resp2 := execTrade(t, s, sell)
	if !resp2.Accepted {
		t.Fatalf("expected sell accepted, got %+v", resp2)
	}
	portfolios2, err := s.db.GetPortfolioByUserID(context.Background(), "default-user-id")
	if err != nil {
		t.Fatalf("failed to get portfolio: %v", err)
	}
	var usd2, pos2 float64
	for _, p := range portfolios2 {
		if p.Symbol == "USD" {
			usd2 = p.Quantity
		}
		if p.Symbol == "TEST-USD" {
			pos2 = p.Quantity
		}
	}
	if pos2 != 5 {
		t.Errorf("expected remaining position 5 got %v", pos2)
	}
	if usd2 != usd+5*110 {
		t.Errorf("unexpected USD after sell %v", usd2)
	}
}

func TestExecuteTradeInsufficientUSD(t *testing.T) {
	s := newTradingServer()
	// attempt BUY too large
	resp := execTrade(t, s, &pb.TradeRequest{Symbol: "BTC-USD", Side: "BUY", Size: 2000, Price: 100})
	if resp.Accepted {
		t.Fatalf("expected rejection for insufficient USD")
	}
}

func TestExecuteTradeInvalidSide(t *testing.T) {
	s := newTradingServer()
	resp := execTrade(t, s, &pb.TradeRequest{Symbol: "BTC-USD", Side: "HOLD", Size: 1, Price: 100})
	if resp.Accepted {
		t.Fatalf("expected rejection for invalid side")
	}
}

func TestExecuteTradeInsufficientPosition(t *testing.T) {
	s := newTradingServer()
	// attempt SELL without holdings
	resp := execTrade(t, s, &pb.TradeRequest{Symbol: "ETH-USD", Side: "SELL", Size: 1, Price: 2000})
	if resp.Accepted {
		t.Fatalf("expected rejection for insufficient position")
	}
}
