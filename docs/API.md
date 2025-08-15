# API Overview

Primary external interaction is via gRPC/gRPC-Web. Proto files: `protos/trading_api.proto`, `protos/bot.proto`.

## Services

- TradingService: pricing, order book, momentum, portfolio, strategies, symbols, trade execution
- BotService: lifecycle for stored bots (create/list/start/stop/status)
- AuthService: user registration + JWT issuance
- RiskService: (Rust) risk calculations (Monte Carlo VaR; now supports confidence & horizon parameters)

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

## Trade Execution (Experimental)

`ExecuteTrade(TradeRequest) -> TradeResponse` performs a simplified portfolio update held in-memory.

Fields (TradeRequest):

- symbol (string) e.g. `BTC-USD`
- side (string) `BUY` or `SELL`
- size (double) base asset quantity
- price (double) optional; if 0 server fetches current price

Response (TradeResponse):

- accepted (bool)
- message (string)
- executed_price (double)
- pnl (double) placeholder (future realized PnL tracking)

Balances tracked in a single demo portfolio keyed to `default` account. No persistence or fee model yet.

## Value at Risk (VaR)

`CalculateVaR(VaRRequest)` now accepts:

- current_portfolio (Portfolio)
- risk_model (string) e.g. `monte_carlo`
- confidence_level (double) default 0.95 if omitted
- horizon_days (double) default 1

Current Rust implementation simulates 10k returns using historical volatility approximation (or fallback 2%). Future enhancements will scale volatility by horizon and return richer response fields.
