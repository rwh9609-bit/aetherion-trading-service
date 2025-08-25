# Aetherion API Documentation

This document provides an overview of the gRPC API for the Aetherion Trading Platform. All services and messages are defined in the `protos/trading_api.proto` file.

## Production Endpoint

*   **URL:** `https://api.aetherion.cloud`
*   **Protocol:** gRPC-Web over HTTPS

## Services

The Aetherion API is organized into the following services:

*   [AuthService](#authservice)
*   [TradingService](#tradingservice)
*   [BotService](#botservice)
*   [RiskService](#riskservice)
*   [PortfolioService](#portfolioservice)
*   [OrderService](#orderservice)
*   [Backtesting API (REST)](#backtesting-api-rest)

### AuthService

Handles user authentication and registration.

*   **RPCs:** `Register`, `Login`, `GetUser`, `RefreshToken`
*   **Authentication:** The `Login` and `Register` RPCs return a JWT token. This token must be included in the `authorization` metadata header for all other RPC calls (e.g., `authorization: Bearer <token>`).

### TradingService

Provides core trading functionalities.

*   **RPCs:** `StreamOrderBook`, `GetPrice`, `StartStrategy`, `StopStrategy`, `SubscribeTicks`, `StreamPrice`, `AddSymbol`, `RemoveSymbol`, `ListSymbols`, `GetMomentum`
*   **Momentum Metrics:** The `GetMomentum` RPC returns a list of momentum metrics for various symbols, including price changes, volatility, and a composite momentum score.

### BotService

Manages the lifecycle of trading bots.

*   **RPCs:** `CreateBot`, `GetBot`, `UpdateBot`, `DeleteBot`, `ListBots`, `StartBot`, `StopBot`, `GetBotStatus`, `StreamBotStatus`
*   **Bot Lifecycle:**
    1.  `CreateBot`: Creates a new bot and returns its ID.
    2.  `StartBot`: Starts a bot's trading strategy.
    3.  `GetBotStatus`: Retrieves the current status of a bot.
    4.  `StopBot`: Stops a bot's trading strategy.

### RiskService

Performs risk calculations.

*   **RPCs:** `CalculateVaR`
*   **Value at Risk (VaR):** The `CalculateVaR` RPC calculates the potential loss of a portfolio based on a given confidence level and time horizon.

### PortfolioService

Provides access to portfolio information.

*   **RPCs:** `GetPortfolio`, `StreamPortfolio`, `GetPerformanceHistory`

### OrderService

Manages trading orders.

*   **RPCs:** `CreateOrder`, `CancelOrder`, `GetOrder`, `GetTradeHistory`, `ListOrders`

### Backtesting API (REST)

The backtesting API is a separate REST API provided by the `backend` service (a Python FastAPI application). It allows you to test your trading strategies against historical data.

*   **Framework:** FastAPI
*   **Documentation:** The API documentation is available through the FastAPI instance itself (usually at `/docs` or `/redoc`).