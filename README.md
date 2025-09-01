# Aetherion Platform

Modular trading platform with:
- Trading service (Go, gRPC on 50051, HTTP on 8081)
- Risk service (Rust, gRPC on 50052)
- Backend API (Python/FastAPI on 8000) for Stripe + backtests
- Orchestrator (Python) for bot signals and risk‑gated orders
- Envoy (edge proxy: 80/443/8080, admin 9901) for gRPC‑Web and routing
- Frontend (React + Nginx)
- Postgres

## Architecture

- Browser (React) ↔ Envoy (gRPC‑Web/HTTP)
- Envoy → trading (gRPC) and risk (gRPC), backend (HTTP)
- Orchestrator → trading + risk (gRPC) and Binance HTTP
- Backend → trading (gRPC) for subscription upgrades
- Postgres for trading service state

Ports:
- Envoy: 80, 443, 8080 (grpc‑web), 9901 (admin)
- Trading (Go): 50051 (gRPC), 8081 (HTTP)
- Risk (Rust): 50052 (gRPC)
- Backend (FastAPI): 8000
- Frontend (Nginx): 80

## Prerequisites

- Docker Desktop (Mac)
- Stripe account (API key + webhook secret)
- .env file with required variables (see below)

## Environment

Create `.env` in repo root based on this template:

```dotenv
# Stripe
STRIPE_API_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App URLs
FRONTEND_BASE_URL=http://localhost:3000
REACT_APP_GRPC_HOST=http://localhost:8080

# Trading service
AUTH_SECRET=change_me
POSTGRES_PASSWORD=postgres
POSTGRES_DSN=postgres://postgres:${POSTGRES_PASSWORD}@postgres:5432/aetherion?sslmode=disable

# Stripe pricing (frontend)
REACT_APP_STRIPE_PRICE_ID_MONTHLY=price_...
REACT_APP_STRIPE_CHEAP_PRICE_ID_MONTHLY=price_...
REACT_APP_STRIPE_PRICE_ID_YEARLY=price_...
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Orchestrator
ORCHESTRATOR_USER_ID=your-user-id
GO_SERVICE_ADDR=trading:50051
RUST_SERVICE_ADDR=risk:50052
```

## Quickstart

1) Build and run:
- docker compose up -d --build

2) Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Envoy gRPC‑Web: http://localhost:8080
- Envoy admin: http://localhost:9901
- Trading HTTP: http://localhost:8081

3) Stripe webhook (local):
- Expose backend: stripe listens to https endpoint
  - stripe listen --forward-to localhost:8000/stripe-webhook

## Key endpoints

Backend (FastAPI):
- POST /api/create-checkout-session
- POST /stripe-webhook (returns 200; processes in background)
- GET /healthz
- Backtest routes (TBD in python/backtest_api.py)

Trading (Go):
- /healthz on 8081
- gRPC services: TradingService, AuthService, BotService, OrderService, RiskService proxy to Rust

Envoy:
- /trading.* via grpc‑web on 8080 and 443
- /api/* and /stripe-webhook to backend

## Development

- Python backend:
  - cd python && uvicorn app:app --host 0.0.0.0 --port 8000 --reload
- Frontend:
  - cd frontend && npm install && npm start
- Linting:
  - Python: ruff + mypy; Go: golangci-lint; Rust: clippy
- Tests: pytest, go test, cargo test

## Deployment notes

- Expose Envoy 80/443 behind a cloud LB
- Use real TLS certs (Let’s Encrypt or ACM)
- Configure Docker/GitHub Actions for CI/CD (build, scan, push, deploy)
- Store secrets in a vault or Docker/K8s secrets

## Troubleshooting

- 404 /healthz from Envoy backend cluster → ensure backend implements GET /healthz (it does)
- 404 /success on backend → now 307 redirect to FRONTEND_BASE_URL/success
- gRPC failures → ensure trading exposes 50051 in compose and Envoy cluster points to trading:50051
- CSV not found for orchestrator → volume mount and filename must match

## Security

- CORS allowed origins restricted; CSP set in Nginx and Envoy
- Set allow_credentials only when required
- Rotate AUTH_SECRET and Stripe keys; avoid logging secrets