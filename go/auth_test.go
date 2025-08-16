package main

import (
    "context"
    "os"
    "testing"
    "time"

    pb "github.com/rwh9609-bit/multilanguage/go/gen"
    "github.com/golang-jwt/jwt/v5"
    "google.golang.org/grpc/metadata"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
    "google.golang.org/grpc"
)

func TestAuthRegisterAndLogin(t *testing.T) {
    srv := newAuthServer("testsecret")
    resp, err := srv.Register(context.Background(), &pb.RegisterRequest{Username: "alice", Password: "password"})
    if err != nil || !resp.Success {
        t.Fatalf("expected successful register got resp=%v err=%v", resp, err)
    }
    resp2, _ := srv.Register(context.Background(), &pb.RegisterRequest{Username: "alice", Password: "password"})
    if resp2.Success {
        t.Fatalf("expected duplicate register to fail")
    }
    loginResp, err := srv.Login(context.Background(), &pb.AuthRequest{Username: "alice", Password: "password"})
    if err != nil || !loginResp.Success || loginResp.Token == "" {
        t.Fatalf("expected successful login got resp=%v err=%v", loginResp, err)
    }
    if loginResp.ExpiresAtUnix <= time.Now().Unix() {
        t.Fatalf("expected future expiration")
    }
    bad, _ := srv.Login(context.Background(), &pb.AuthRequest{Username: "alice", Password: "bad"})
    if bad.Success {
        t.Fatalf("expected failed login with bad password")
    }
}

func TestAuthUnaryInterceptor(t *testing.T) {
    secret := []byte("intersecret")
    interceptor := authUnaryInterceptor(secret)
    handler := func(ctx context.Context, req interface{}) (interface{}, error) { return "ok", nil }

    if _, err := interceptor(context.Background(), nil, &grpc.UnaryServerInfo{FullMethod: "/trading.AuthService/Login"}, handler); err != nil {
        t.Fatalf("login path should bypass auth: %v", err)
    }

    _, err := interceptor(context.Background(), nil, &grpc.UnaryServerInfo{FullMethod: "/trading.TradingService/StartStrategy"}, handler)
    if status.Code(err) != codes.Unauthenticated {
        t.Fatalf("expected unauthenticated error, got %v", err)
    }

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"sub": "bob", "exp": time.Now().Add(time.Hour).Unix()})
    signed, _ := token.SignedString(secret)
    md := metadata.New(map[string]string{"authorization": "Bearer " + signed})
    ctx := metadata.NewIncomingContext(context.Background(), md)
    if val, err := interceptor(ctx, nil, &grpc.UnaryServerInfo{FullMethod: "/trading.TradingService/StartStrategy"}, handler); err != nil || val != "ok" {
        t.Fatalf("expected success with valid token got val=%v err=%v", val, err)
    }

    badmd := metadata.New(map[string]string{"authorization": "Bearer deadbeef"})
    badctx := metadata.NewIncomingContext(context.Background(), badmd)
    if _, err := interceptor(badctx, nil, &grpc.UnaryServerInfo{FullMethod: "/trading.TradingService/StartStrategy"}, handler); status.Code(err) != codes.Unauthenticated {
        t.Fatalf("expected unauthenticated for bad token got %v", err)
    }

    os.Setenv("AUTH_DISABLED", "1")
    defer os.Unsetenv("AUTH_DISABLED")
    if val, err := interceptor(context.Background(), nil, &grpc.UnaryServerInfo{FullMethod: "/trading.TradingService/StartStrategy"}, handler); err != nil || val != "ok" {
        t.Fatalf("expected bypass success when AUTH_DISABLED=1, got val=%v err=%v", val, err)
    }
}

func TestHashPasswordAndVerify(t *testing.T) {
    h := hashPassword("pw")
    if !verifyPassword(h, "pw") { t.Fatalf("expected verify success") }
    if verifyPassword(h, "other") { t.Fatalf("expected verify failure for different password") }
    // multiple hashes of same pw should differ due to salt
    h2 := hashPassword("pw")
    if h == h2 { t.Fatalf("expected different hashes for same password due to salting") }
}
