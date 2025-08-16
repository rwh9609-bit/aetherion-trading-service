package main

import (
    "context"
    "io/ioutil"
    "net/http"
    "strings"
    "testing"
    "time"

    pb "aetherion/gen"
)

// mockHTTPClient returns a function matching httpGet signature
func mockHTTPClient(t *testing.T, price string, status int) func(string) (*http.Response, error) {
    return func(url string) (*http.Response, error) {
        body := ioutil.NopCloser(strings.NewReader(`{"data":{"amount":"` + price + `"}}`))
        return &http.Response{StatusCode: status, Body: body}, nil
    }
}

func TestGetPrice(t *testing.T) {
    old := httpGet
    defer func(){ httpGet = old }()
    httpGet = mockHTTPClient(t, "54321.12", 200)

    s := newTradingServer()
    resp, err := s.GetPrice(context.Background(), &pb.Tick{Symbol: "BTC-USD"})
    if err != nil { t.Fatalf("GetPrice error: %v", err) }
    if resp.Price != 54321.12 { t.Fatalf("expected price 54321.12 got %v", resp.Price) }
}

func TestGetPriceHTTPError(t *testing.T) {
    old := httpGet
    defer func(){ httpGet = old }()
    httpGet = func(url string) (*http.Response, error) { return &http.Response{StatusCode: 500, Body: ioutil.NopCloser(strings.NewReader("oops"))}, nil }
    s := newTradingServer()
    if _, err := s.GetPrice(context.Background(), &pb.Tick{Symbol: "BTC-USD"}); err == nil {
        t.Fatalf("expected error on non-200 status")
    }
}

func TestStartStrategyCreatesAndStores(t *testing.T) {
    s := newTradingServer()
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()
    params := map[string]string{"type":"MEAN_REVERSION","threshold":"1.0","period":"1"}
    resp, err := s.StartStrategy(ctx, &pb.StrategyRequest{Symbol: "BTC-USD", Parameters: params})
    if err != nil || !resp.Success { t.Fatalf("start strategy failed: %v %v", resp, err) }
    if len(s.strategies) != 1 { t.Fatalf("expected 1 strategy stored, got %d", len(s.strategies)) }
    time.Sleep(150 * time.Millisecond)
}

func TestGetPortfolioCreatesDefault(t *testing.T) {
    s := newTradingServer()
    p, err := s.GetPortfolio(context.Background(), &pb.PortfolioRequest{AccountId: "acct1"})
    if err != nil { t.Fatalf("GetPortfolio error: %v", err) }
    if p.TotalValueUsd == 0 { t.Fatalf("expected default total value") }
    // second call should return same object (no duplication)
    p2, _ := s.GetPortfolio(context.Background(), &pb.PortfolioRequest{AccountId: "acct1"})
    if p2.TotalValueUsd != p.TotalValueUsd { t.Fatalf("expected same portfolio on subsequent call") }
}

func TestStrategyCancellation(t *testing.T) {
    s := newTradingServer()
    ctx, cancel := context.WithCancel(context.Background())
    params := map[string]string{"type":"MEAN_REVERSION","threshold":"0.5","period":"1"}
    resp, err := s.StartStrategy(ctx, &pb.StrategyRequest{Symbol: "BTC-USD", Parameters: params})
    if err != nil || !resp.Success { t.Fatalf("start strategy failed: %v %v", resp, err) }
    if len(s.strategies) != 1 { t.Fatalf("expected 1 strategy stored") }
    cancel() // cancel context
    time.Sleep(50 * time.Millisecond) // allow goroutine to observe cancellation
}

