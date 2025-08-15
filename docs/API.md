# API Overview

Primary external interaction is via gRPC/gRPC-Web. Proto files: `protos/trading_api.proto`, `protos/bot.proto`.

## Services

- TradingService: pricing, order book, momentum, portfolio, strategies, symbols
- BotService: lifecycle for stored bots (create/list/start/stop/status)
- AuthService: user registration + JWT issuance
- RiskService: (Rust) risk calculations (future expansion placeholder in current proto set)

## Authentication

- Register and Login return JWT token (HS256). Token supplied via `authorization: Bearer <token>` metadata header.
- `AUTH_DISABLED=1` environment variable bypasses auth (development only).

## Bot Lifecycle

1. CreateBot -> returns bot id
2. StartBot -> launches linked strategy (stores strategy_id into bot parameters)
3. GetBotStatus -> returns active flag + parameters
4. StopBot -> attempts strategy stop (best-effort) and marks inactive

## Strategy Start Parameters

`StrategyRequest` expects `parameters["type"]` specifying strategy implementation, with optional `threshold` / `period` values.

## Momentum Metrics

`GetMomentum` returns server-computed metrics over 1m/5m windows plus volatility and composite `momentum_score`.

See proto comments for field details.
