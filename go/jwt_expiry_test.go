package main

import (
    "context"
    "testing"
    "time"

    pb "github.com/rwh9609-bit/aetherion/gen"
)

// Simple expiry test: temporarily adjust Login to shorter lifetime via monkey patch pattern not available; instead we directly inspect issued token's exp window.
// Here we simulate by creating server and logging in, then asserting exp is roughly 1h ahead.
func TestLoginTokenExpiryApproximatelyOneHour(t *testing.T) {
    srv := newAuthServer("secret")
    _, _ = srv.Register(context.Background(), &pb.RegisterRequest{Username: "u", Password: "p"})
    resp, err := srv.Login(context.Background(), &pb.AuthRequest{Username: "u", Password: "p"})
    if err != nil || !resp.Success || resp.ExpiresAtUnix == 0 { t.Fatalf("login failed: %v %v", resp, err) }
    exp := time.Unix(resp.ExpiresAtUnix, 0)
    diff := time.Until(exp)
    if diff < 59*time.Minute || diff > 61*time.Minute { t.Fatalf("expected exp ~1h, got %v", diff) }
}
