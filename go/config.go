package main

import (
    "os"
    "time"
    "fmt"
    "strconv"
    "strings"
)

// AppConfig centralizes runtime configuration.
type AppConfig struct {
    GRPCListenAddr string
    HTTPHealthAddr string
    AuthSecret string
    AuthPreviousSecret string
    Env string
    PostgresDSN string
    LogLevel string
    ShutdownGracePeriod time.Duration
    RequestTimeout time.Duration
    DefaultSymbols []string
}

func loadConfig() (*AppConfig, error) {
    cfg := &AppConfig{
        GRPCListenAddr: getEnv("GRPC_LISTEN_ADDR", ":50051"),
        HTTPHealthAddr: getEnv("HTTP_HEALTH_ADDR", ":8090"),
        Env: getEnv("GO_ENV", "development"),
        PostgresDSN: os.Getenv("POSTGRES_DSN"),
        LogLevel: getEnv("LOG_LEVEL", "info"),
    }
    // Timeouts
    rtStr := getEnv("REQUEST_TIMEOUT_MS", "5000")
    if ms, err := strconv.Atoi(rtStr); err == nil && ms > 0 { cfg.RequestTimeout = time.Duration(ms) * time.Millisecond } else { cfg.RequestTimeout = 5 * time.Second }
    gpStr := getEnv("SHUTDOWN_GRACE_SECONDS", "15")
    if sec, err := strconv.Atoi(gpStr); err == nil && sec > 0 { cfg.ShutdownGracePeriod = time.Duration(sec) * time.Second } else { cfg.ShutdownGracePeriod = 15 * time.Second }

    // Secrets
    cfg.AuthSecret = os.Getenv("AUTH_SECRET")
    if cfg.AuthSecret == "" && cfg.Env != "production" {
        // ephemeral dev secret created in main if empty; validation deferred
    }
    cfg.AuthPreviousSecret = os.Getenv("AUTH_PREVIOUS_SECRET")

    // Symbols (comma-separated)
    rawSyms := os.Getenv("DEFAULT_SYMBOLS")
    if rawSyms == "" {
        cfg.DefaultSymbols = []string{"BTC-USD","ETH-USD","SOL-USD","ILV-USD"}
    } else {
        parts := strings.Split(rawSyms, ",")
        for _, p := range parts { if s := strings.TrimSpace(p); s != "" { cfg.DefaultSymbols = append(cfg.DefaultSymbols, s) } }
        if len(cfg.DefaultSymbols) == 0 { cfg.DefaultSymbols = []string{"BTC-USD","ETH-USD","SOL-USD","ILV-USD"} }
    }
    return cfg, cfg.validate()
}

func (c *AppConfig) validate() error {
    if c.Env == "production" {
        if len(c.AuthSecret) < 32 { return fmt.Errorf("AUTH_SECRET must be set and >=32 chars in production") }
    }
    return nil
}

func getEnv(key, def string) string {
    v := os.Getenv(key)
    if v == "" { return def }
    return v
}
