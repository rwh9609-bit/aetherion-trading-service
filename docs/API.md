# API Overview (2024)

Primary external interaction: gRPC/gRPC-Web. Proto files: `protos/trading_api.proto`, `protos/bot.proto`.

## Services
- TradingService: pricing, order book, momentum, portfolio, strategies, symbols, trade execution
- BotService: lifecycle for stored bots (create/list/start/stop/status)
- AuthService: user registration + JWT issuance
- RiskService: (Rust) risk calculations (Monte Carlo VaR, confidence/horizon params)

## Authentication
- Register/Login return JWT token (HS256). Supply via `authorization: Bearer <token>` metadata header.
- `AUTH_DISABLED=1` bypasses auth (dev only).

## Bot Lifecycle
1. CreateBot → returns bot id
2. StartBot → launches strategy, stores `strategy_id`
3. GetBotStatus → returns active flag + parameters
4. StopBot → attempts strategy stop, marks inactive

## Strategy Start Parameters
`StrategyRequest` expects `parameters["type"]` (strategy implementation), optional `threshold`/`period` values.

## Momentum Metrics
`GetMomentum` returns metrics over 1m/5m windows, volatility, composite `momentum_score`.
See proto comments for field details.

## Trade Execution (Experimental)
`ExecuteTrade(TradeRequest) → TradeResponse` updates demo portfolio in-memory.
Fields (TradeRequest):
- symbol (string) e.g. `BTC-USD`
- side (string) `BUY` or `SELL`
- size (double) base asset quantity
- price (double) optional; if 0, server fetches current price
Response (TradeResponse):
- accepted (bool)
- message (string)
- executed_price (double)
- pnl (double) placeholder
Balances: single demo portfolio, no persistence/fees yet.

## Value at Risk (VaR)
`CalculateVaR(VaRRequest)` accepts:
- current_portfolio (Portfolio)
- risk_model (string) e.g. `monte_carlo`
- confidence_level (double, default 0.95)
- horizon_days (double, default 1)
Rust implementation: simulates 10k returns using historical volatility (fallback 2%). Future: richer fields, horizon scaling.

## Troubleshooting
- If you see CORS or login errors, check Envoy is running and not blocked by nginx.
- See About/Update pages for latest stack and troubleshooting tips.
