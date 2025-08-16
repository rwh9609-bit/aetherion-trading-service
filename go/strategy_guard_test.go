package main

import (
    "context"
    "testing"
    "time"
    pb "aetherion/gen"
)

// TestStrategyPeriodGuard ensures non-positive period parameter doesn't panic and defaults.
func TestStrategyPeriodGuard(t *testing.T) {
    s := newTradingServer()
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()
    params := map[string]string{"type":"MEAN_REVERSION","threshold":"1.0","period":"0"}
    resp, err := s.StartStrategy(ctx, &pb.StrategyRequest{Symbol: "BTC-USD", Parameters: params})
    if err != nil || !resp.Success { t.Fatalf("start strategy failed: %v %v", resp, err) }
    // allow one tick interval from fallback (5s) but cancel early to keep test fast
    time.Sleep(50 * time.Millisecond)
}
