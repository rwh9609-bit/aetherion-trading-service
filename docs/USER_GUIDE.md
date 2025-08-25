# User Guide

This guide walks you through using the Aetherion Trading Platform to monitor markets, manage risk, and execute trading strategies.

## Getting Started

### First Login

1.  **Open the Platform**
    *   Development: Go to `http://localhost:3000` in your browser.
    *   Production: Go to `https://aetherion.cloud`.
2.  **Create Account**
    *   Click "Get Started" → "Register".
    *   Enter your desired username and password, then click "Register".
3.  **Access Dashboard**
    *   After registration, you will be logged in and redirected to the main dashboard.

## Dashboard Overview

The main dashboard consists of several components:

*   **Symbol Manager:** Add and remove symbols to monitor.
*   **Price Chart:** View real-time price data for the selected symbol.
*   **Risk Metrics:** Monitor your portfolio's Value at Risk (VaR) and other risk metrics.
*   **Strategy Control:** Configure and run trading strategies.
*   **Order Book:** View the real-time order book for the selected symbol.

## Trading Strategies

Aetherion comes with a built-in mean reversion strategy.

### Mean Reversion Strategy

1.  **How It Works:** This strategy enters a position when the price deviates significantly from its moving average and exits when the price reverts to the mean.
2.  **Parameters:**
    *   **Lookback Period:** The number of periods to use for calculating the moving average.
    *   **Entry Std Dev:** The number of standard deviations from the mean to trigger an entry.
    *   **Exit Std Dev:** The number of standard deviations from the mean to trigger an exit.
3.  **Execution:**
    *   Set the parameters in the Strategy Control panel.
    *   Choose a symbol.
    *   Click "Start Strategy".

### Backtesting

The Aetherion platform includes a backtesting feature that allows you to test your trading strategies against historical data. This can help you evaluate the performance of a strategy before deploying it with live capital.

To use the backtester, navigate to the "Backtest" page, select a strategy and a date range, and run the simulation.

## Account Management

*   **Account Information:** Click "Account" in the top navigation to view your portfolio, trading history, and performance.
*   **Logout:** Click "Account" → "Logout" to end your session.

## Troubleshooting

If you encounter any issues, please check the following:

*   Ensure all backend services are running.
*   Verify your network connectivity.
*   Check the browser's developer console for any error messages.