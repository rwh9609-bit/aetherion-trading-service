import matplotlib.pyplot as plt
import csv
from datetime import datetime
from strategies.mean_reversion import MeanReversionStrategy, MeanReversionParams

class BacktestEngine:
    def __init__(self, strategy, historical_data):
        self.strategy = strategy
        self.data = historical_data
        self.trades = []
        self.equity_curve = []
        self.cash = 10000  # Starting capital
        self.position = 0

    def execute_trade(self, action, tick):
        # Example: action = {'side': 'BUY', 'size': 1}
        if action['side'] == 'BUY' and self.cash >= tick['price'] * action['size']:
            self.position += action['size']
            self.cash -= tick['price'] * action['size']
            self.trades.append({'timestamp': tick['timestamp'], 'side': 'BUY', 'price': tick['price'], 'size': action['size']})
        elif action['side'] == 'SELL' and self.position >= action['size']:
            self.position -= action['size']
            self.cash += tick['price'] * action['size']
            self.trades.append({'timestamp': tick['timestamp'], 'side': 'SELL', 'price': tick['price'], 'size': action['size']})

    def update_equity(self, tick):
        equity = self.cash + self.position * tick['price']
        self.equity_curve.append({'timestamp': tick['timestamp'], 'equity': equity})

    def run(self):
        for tick in self.data:
            action = self.strategy.on_tick(tick)
            if action:
                self.execute_trade(action, tick)
            self.update_equity(tick)
        return self.trades, self.equity_curve

def load_historical_data(csv_path):
    data = []
    with open(csv_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            data.append({
                'timestamp': datetime.strptime(row['timestamp'], '%Y-%m-%d %H:%M:%S'),
                'price': float(row['price'])
            })
    return data

def plot_backtest_results(equity_curve, trades, save_path=None):
    # Plot equity curve
    timestamps = [e['timestamp'] for e in equity_curve]
    equities = [e['equity'] for e in equity_curve]
    plt.figure(figsize=(10, 5))
    plt.plot(timestamps, equities, label='Equity Curve')
    # Mark trades
    for trade in trades:
        color = 'g' if trade['side'] == 'BUY' else 'r'
        plt.scatter(trade['timestamp'], trade['price'], color=color, marker='o', label=trade['side'])
    plt.xlabel('Time')
    plt.ylabel('Equity / Price')
    plt.title('Backtest Results')
    plt.legend()
    plt.tight_layout()
    if save_path:
        plt.savefig(save_path)
    plt.show()

def save_to_csv(data, filename, fieldnames):
    import csv
    with open(filename, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in data:
            writer.writerow(row)

def compute_summary_stats(equity_curve, trades):
    import numpy as np
    equities = [e['equity'] for e in equity_curve]
    timestamps = [e['timestamp'] for e in equity_curve]
    total_return = (equities[-1] - equities[0]) / equities[0] if equities else 0
    max_drawdown = 0
    peak = equities[0] if equities else 0
    for eq in equities:
        if eq > peak:
            peak = eq
        dd = (peak - eq) / peak if peak else 0
        if dd > max_drawdown:
            max_drawdown = dd
    num_trades = len(trades)
    win_trades = [t for t in trades if (t['side'] == 'SELL' and t['price'] > equities[0]) or (t['side'] == 'BUY' and t['price'] < equities[0])]
    win_rate = len(win_trades) / num_trades if num_trades > 0 else 0
    return {
        'total_return_pct': round(total_return * 100, 2),
        'max_drawdown_pct': round(max_drawdown * 100, 2),
        'num_trades': num_trades,
        'win_rate_pct': round(win_rate * 100, 2)
    }

def generate_report(trades, equity_curve):
    # Save trades and equity curve to CSV
    save_to_csv(trades, 'test-results/trades.csv', ['timestamp', 'side', 'price', 'size'])
    save_to_csv(equity_curve, 'test-results/equity_curve.csv', ['timestamp', 'equity'])
    # Compute summary stats
    stats = compute_summary_stats(equity_curve, trades)
    with open('test-results/summary.txt', 'w') as f:
        for k, v in stats.items():
            f.write(f'{k}: {v}\n')
    # Save chart
    plot_backtest_results(equity_curve, trades, save_path='test-results/equity_curve.png')
    print('Report generated:')
    print(stats)

if __name__ == "__main__":
    # Example usage
    import os
    os.makedirs('test-results', exist_ok=True)
    historical_data = load_historical_data('data/BTCUSD_1min.csv')
    params = MeanReversionParams()  # Use default parameters
    strategy = MeanReversionStrategy(params)
    engine = BacktestEngine(strategy, historical_data)
    trades, equity_curve = engine.run()
    generate_report(trades, equity_curve)
