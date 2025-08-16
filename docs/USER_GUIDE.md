# User Guide (2024)

---
## Open Source & Developer Community

This user guide is for an open-source project. We welcome contributors! See DEVELOPER.md and the Careers page for details.

---

This guide walks you through using the Aetherion Trading Platform to monitor markets, manage risk, and execute trading strategies. For latest stack and updates, see About/Update pages in the UI.

## Getting Started

### First Login

1. **Open the Platform**
   - Development: Go to `http://localhost:3000` in your browser
   - Production: Go to `https://aetherion.cloud` (API: `https://api.aetherion.cloud`)
   - Landing page appears
2. **Create Account**
   - Click "Get Started" → "Register"
   - Enter username/password, click "Register"
3. **Access Dashboard**
   - After registration, you are logged in and see the dashboard

## 2025-08: HTTPS & Security Upgrade

Production endpoints now use HTTPS with Let’s Encrypt certificates for all domains. If you see SSL or CORS errors, check for duplicate domains in envoy.yaml and verify certificate paths and permissions.
## Dashboard Overview

Main dashboard components:

### Symbol Manager

- **Add Symbols**: Type symbol (e.g., "BTC-USD"), click "Add"
- **Remove Symbols**: Click X to remove
- **Select Symbol**: Click to view data

### Price Chart

- Real-time price streaming for selected symbol
- Live/Snapshot indicator for data freshness
- Auto-updates with new market data

### Risk Metrics

- Portfolio Value at Risk (VaR)
- Risk calculations based on positions
- Real-time updates

### Strategy Control

- Configure/start trading strategies
- Set parameters:
   - Lookback period
   - Entry/exit thresholds
   - Position sizing
   - Risk limits

### Order Book

- Real-time order book for selected symbol
- Current bids/asks
- Continuous updates

## Managing Risk

### Setting Risk Parameters

1. Go to Strategy Control
2. Configure:
   - Max Position Size
   - Stop Loss
   - Risk per Trade
3. Monitor Risk Metrics panel
   - VaR shows potential loss
   - Adjust positions if risk is high

### Understanding VaR

- **Value at Risk (VaR)**: Potential loss measure
- **Confidence Level**: Probability loss won't exceed VaR
- **Time Horizon**: Risk calculation period
- **Portfolio Impact**: Total risk exposure

## Trading Strategies

### Mean Reversion Strategy

Built-in mean reversion strategy:

1. **How It Works**:
   - Analyzes price deviations from moving average
   - Enters when price moves from mean
   - Exits when price returns
2. **Key Parameters**:
   - Lookback Period (default: 20)
   - Entry Std Dev (default: 2.0)
   - Exit Std Dev (default: 0.5)
3. **Start Strategy**:
   - Set parameters in Strategy Control
   - Choose symbol
   - Click "Start Strategy"
   - Monitor performance

### Custom Strategies

For custom strategies, see [Developer Guide](../DEVELOPER.md).

## Account Management

### Account Information

- Click "Account" in top navigation
- View portfolio, trading history, performance
- Update settings

### Logging Out

- Click "Account" → "Logout" to end session

## Monitoring Performance

### Real-time Updates

- All data auto-updates
- No refresh needed
- Live indicators show connection status

## Troubleshooting

- If you see CORS or login errors, check that Envoy is running and not blocked by nginx.
- See About/Update pages for latest stack and troubleshooting tips.

### Key Metrics to Watch
- **Current P&L**: Profit/loss on open positions
- **Portfolio Value**: Total account value
- **Risk Exposure**: Current VaR and risk metrics
- **Active Positions**: Open trades and their status

## Troubleshooting

### Connection Issues
- Check that all backend services are running
- Verify network connectivity
- Look for error messages in the interface

### Data Not Updating
- Check the Live/Snapshot indicator on price chart
- Verify symbol is properly added to feed
- Ensure market is open and trading

### Strategy Not Working
- Verify parameters are set correctly
- Check that symbol has sufficient price history
- Monitor risk limits aren't blocking trades

## Tips for Success

1. **Start Small**: Begin with small position sizes to learn the system
2. **Monitor Risk**: Keep VaR within acceptable limits
3. **Diversify**: Don't concentrate all risk in one symbol
4. **Stay Informed**: Monitor market conditions and news
5. **Test Strategies**: Understand how strategies behave before committing large amounts

## Support

If you encounter issues or have questions:
- Check the [Developer Documentation](../DEVELOPER.md) for technical details
- Review error messages carefully
- Ensure all system requirements are met
- Open an issue on GitHub for bug reports

---

**Ready to start trading?** Return to the [main README](../README.md) or explore the [API documentation](API.md) for integration details.
