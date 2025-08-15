# User Guide

This guide will walk you through using the Aetherion Trading Platform to monitor markets, manage risk, and execute trading strategies.

## Getting Started

### First Login

1. **Open the Platform**
   - Development: Navigate to `http://localhost:3000` in your web browser
   - Production: Navigate to `https://app.aetherion.cloud`
   - You'll see the Aetherion landing page

2. **Create Your Account**
   - Click "Get Started" 
   - Choose "Register" tab
   - Enter your desired username and password
   - Click "Register"

3. **Access the Dashboard**
   - After registration, you'll automatically be logged in
   - You'll see the main trading dashboard

## Dashboard Overview

The main dashboard contains several key components:

### Symbol Manager
- **Add Symbols**: Type a symbol (e.g., "BTC-USD") and click "Add"
- **Remove Symbols**: Click the X on any symbol chip to remove it
- **Select Symbol**: Click on any symbol chip to view its data

### Price Chart
- Shows real-time price streaming for the selected symbol
- Live/Snapshot indicator shows data freshness
- Automatically updates as new market data arrives

### Risk Metrics
- Displays current portfolio Value at Risk (VaR)
- Shows risk calculations based on your positions
- Updates in real-time as positions change

### Strategy Control
- Configure and start trading strategies
- Set parameters like:
  - Lookback period (how many price points to analyze)
  - Entry/exit thresholds (when to buy/sell)
  - Position sizing (how much to trade)
  - Risk limits (maximum loss tolerance)

### Order Book
- Real-time order book data for the selected symbol
- Shows current bids (buyers) and asks (sellers)
- Updates continuously with market movements

## Managing Risk

### Setting Risk Parameters

1. **Navigate to Strategy Control**
2. **Configure Risk Settings**:
   - **Max Position Size**: Maximum percentage of portfolio per trade
   - **Stop Loss**: Automatic loss limit as percentage
   - **Risk per Trade**: Maximum portfolio percentage at risk per trade

3. **Monitor Risk Metrics**
   - Check the Risk Metrics panel regularly
   - VaR shows potential loss over time period
   - Adjust position sizes if risk is too high

### Understanding VaR
- **Value at Risk (VaR)**: Statistical measure of potential loss
- **Confidence Level**: Probability that loss won't exceed VaR
- **Time Horizon**: Period over which risk is calculated
- **Portfolio Impact**: Shows total portfolio risk exposure

## Trading Strategies

### Mean Reversion Strategy

The platform includes a built-in mean reversion strategy:

1. **How It Works**:
   - Analyzes price deviations from moving average
   - Enters positions when price moves significantly from mean
   - Exits when price returns toward average

2. **Key Parameters**:
   - **Lookback Period**: Number of price bars to analyze (default: 20)
   - **Entry Std Dev**: How many standard deviations from mean to enter (default: 2.0)
   - **Exit Std Dev**: When to exit position (default: 0.5)

3. **Starting the Strategy**:
   - Set your parameters in Strategy Control
   - Choose your symbol
   - Click "Start Strategy"
   - Monitor performance in real-time

### Custom Strategies

For advanced users wanting to implement custom strategies, see the [Developer Guide](../DEVELOPER.md).

## Account Management

### Account Information
- Click "Account" in the top navigation
- View your current portfolio
- See trading history and performance
- Update account settings

### Logging Out
- Click "Account" → "Logout" to securely end your session
- You'll be returned to the landing page

## Monitoring Performance

### Real-time Updates
- All data updates automatically
- No need to refresh the page
- Live indicators show connection status

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
