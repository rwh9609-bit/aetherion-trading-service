package main

import (
    "context"
    "errors"
    "os"
    "testing"
    "time"
    pb "aetherion-trading-service/gen"
    tc "github.com/testcontainers/testcontainers-go"
    tpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
)

// TestPostgresUserAndBotIntegration spins up a disposable Postgres and exercises user + bot persistence.
// Skipped unless RUN_DB_TESTS=1 to avoid requiring Docker for default test runs.
func TestPostgresUserAndBotIntegration(t *testing.T) {
    if os.Getenv("RUN_DB_TESTS") != "1" { t.Skip("set RUN_DB_TESTS=1 to run integration test") }

    // Preflight: skip if docker socket and DOCKER_HOST both unavailable.
    if _, err := os.Stat("/var/run/docker.sock"); (errors.Is(err, os.ErrNotExist) || err != nil) && os.Getenv("DOCKER_HOST") == "" {
        t.Skip("docker not available; skipping integration test")
    }

    ctx := context.Background()
    pgContainer, err := tpostgres.RunContainer(ctx,
        tpostgres.WithDatabase("aetherion"),
        tpostgres.WithUsername("postgres"),
        tpostgres.WithPassword("postgres"),
        tpostgres.WithInitScripts(),
        tc.WithImage("postgres:16-alpine"),
    )
    if err != nil { t.Skipf("unable to start postgres container (skipping): %v", err) }
    defer func(){ _ = pgContainer.Terminate(ctx) }()

    dsn, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
    if err != nil { t.Fatalf("connection string error: %v", err) }
    os.Setenv("POSTGRES_DSN", dsn)
    defer os.Unsetenv("POSTGRES_DSN")

    // Auth server (postgres-backed)
    auth := newAuthServer("supersecret_supersecret_supersecret_32bytes")
    rresp, err := auth.Register(ctx, &pb.RegisterRequest{Username: "alice", Password: "pw"})
    if err != nil || !rresp.Success { t.Fatalf("register failed: %v %v", rresp, err) }
    lresp, err := auth.Login(ctx, &pb.AuthRequest{Username: "alice", Password: "pw"})
    if err != nil || !lresp.Success || lresp.Token == "" { t.Fatalf("login failed: %v %v", lresp, err) }

    // Bot registry (postgres-backed)
    reg := newBotRegistry()
    trading := newTradingServer()
    botSvc := newBotServiceServer(reg, trading)
    cResp, err := botSvc.CreateBot(ctx, &pb.CreateBotRequest{Name: "bot1", Symbol: "BTC-USD", Strategy: "MEAN_REVERSION", Parameters: map[string]string{"threshold":"1"}})
    if err != nil || !cResp.Success { t.Fatalf("create bot failed: %v %v", cResp, err) }
    list, _ := botSvc.ListBots(ctx, &pb.Empty{})
    if len(list.Bots) != 1 { t.Fatalf("expected 1 bot got %d", len(list.Bots)) }
    startResp, _ := botSvc.StartBot(ctx, &pb.BotIdRequest{Id: cResp.Id})
    if !startResp.Success { t.Fatalf("start bot failed: %v", startResp) }
    time.Sleep(50 * time.Millisecond)
    stopResp, _ := botSvc.StopBot(ctx, &pb.BotIdRequest{Id: cResp.Id})
    if !stopResp.Success { t.Fatalf("stop bot failed: %v", stopResp) }
}
