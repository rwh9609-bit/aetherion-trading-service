import unittest
from python.backtest_engine import BacktestEngine, load_historical_data
from python.strategies.mean_reversion import MeanReversionStrategy, MeanReversionParams

class TestBacktestEngine(unittest.TestCase):
    def test_no_trades_when_no_signal(self):
        # All prices the same, should result in no trades
        data = [
            {'timestamp': '2025-08-16 00:00:00', 'price': 100},
            {'timestamp': '2025-08-16 00:01:00', 'price': 100},
            {'timestamp': '2025-08-16 00:02:00', 'price': 100},
            {'timestamp': '2025-08-16 00:03:00', 'price': 100},
        ]
        strategy = MeanReversionStrategy(params=MeanReversionParams())
        engine = BacktestEngine(strategy, data)
        trades, equity_curve = engine.run()
        self.assertEqual(len(trades), 0)
        self.assertEqual(len(equity_curve), len(data))

    def test_trade_and_equity_update(self):
        # Simulate a price spike to trigger a trade
        data = [
            {'timestamp': '2025-08-16 00:00:00', 'price': 100},
            {'timestamp': '2025-08-16 00:01:00', 'price': 120},
            {'timestamp': '2025-08-16 00:02:00', 'price': 80},
            {'timestamp': '2025-08-16 00:03:00', 'price': 100},
        ]
        params = MeanReversionParams(lookback_period=2, entry_std_dev=0.5)
        strategy = MeanReversionStrategy(params=params)
        engine = BacktestEngine(strategy, data)
        trades, equity_curve = engine.run()
        # At least one trade should occur
        self.assertTrue(len(trades) >= 1)
        # Equity should change after trade
        equities = [e['equity'] for e in equity_curve]
        self.assertTrue(any(e != equities[0] for e in equities[1:]))
    def setUp(self):
        # Simple synthetic data for testing
        self.data = [
            {'timestamp': '2025-08-16 00:00:00', 'price': 100},
            {'timestamp': '2025-08-16 00:01:00', 'price': 101},
            {'timestamp': '2025-08-16 00:02:00', 'price': 99},
            {'timestamp': '2025-08-16 00:03:00', 'price': 102},
        ]
        self.strategy = MeanReversionStrategy(params=MeanReversionParams())
        self.engine = BacktestEngine(self.strategy, self.data)

    def test_run_returns_trades_and_equity(self):
        trades, equity_curve = self.engine.run()
        self.assertIsInstance(trades, list)
        self.assertIsInstance(equity_curve, list)

    def test_equity_curve_length(self):
        _, equity_curve = self.engine.run()
        self.assertEqual(len(equity_curve), len(self.data))

    def test_trade_execution(self):
        trades, _ = self.engine.run()
        # Trades should be a list of dicts with required keys
        for trade in trades:
            self.assertIn('side', trade)
            self.assertIn('price', trade)
            self.assertIn('size', trade)

if __name__ == "__main__":
    unittest.main()
