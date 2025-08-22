import numpy as np
from typing import Dict, Optional
from dataclasses import dataclass
from datetime import datetime

@dataclass
class MeanReversionParams:
    """A container for all configurable strategy parameters."""
    lookback_period: int = 20      # Period for calculating moving average
    entry_std_dev: float = 2.0     # Z-score threshold for entering a position
    exit_std_dev: float = 0.5      # Z-score threshold for exiting a position
    max_position_size: float = 0.1 # Maximum position size as a fraction of account value
    stop_loss_pct: float = 0.02    # 2% stop loss
    risk_per_trade_pct: float = 0.01 # 1% of account value to risk per trade

class MeanReversionStrategy:
    """
    Implements a mean reversion trading strategy with risk management.

    The strategy enters a position when the price deviates significantly from its
    historical mean (measured by Z-score) and exits when it reverts back
    or hits a stop-loss.
    """
    def __init__(self, params: MeanReversionParams, backfill_prices: Optional[list[float]] = None):
        """
        Initializes the strategy with given parameters and optional historical prices.
        """
        self.params = params
        self.prices: list[float] = []
        self.position: float = 0.0  # Current position size. >0 for long, <0 for short.
        self.entry_price: Optional[float] = None
        self.stop_loss_price: Optional[float] = None # Persistent stop-loss price for the current position

        if backfill_prices:
            # Pre-populate price history to avoid a long warm-up period.
            self.prices = backfill_prices[-self.params.lookback_period:]

    def _calculate_zscore(self, price: float) -> float:
        """
        Calculates the Z-score of the current price relative to the lookback period.
        A Z-score measures how many standard deviations a data point is from the mean.
        """
        self.prices.append(price)
        # Maintain a rolling window of prices
        if len(self.prices) > self.params.lookback_period:
            self.prices.pop(0)
            
        # We need enough data to calculate a meaningful Z-score
        if len(self.prices) < self.params.lookback_period:
            return 0.0
            
        price_series = np.array(self.prices)
        mean = np.mean(price_series)
        std = np.std(price_series)

        # Avoid division by zero if all prices in the lookback period are the same
        if std == 0:
            return 0.0
        
        return (price - mean) / std

    def _calculate_position_size(self, price: float, account_value: float) -> float:
        """
        Calculates the position size based on the risk-per-trade parameter.
        The size is capped to avoid over-concentration.
        """
        if account_value <= 0:
            return 0.0 # Cannot trade with no or negative capital
            
        # Amount of capital to risk on this single trade
        risk_amount = account_value * self.params.risk_per_trade_pct
        # The dollar amount of the stop-loss per unit of the asset
        stop_loss_amount_per_unit = price * self.params.stop_loss_pct
        
        if stop_loss_amount_per_unit == 0:
            return 0.0

        # Position size is the total risk amount divided by the risk per unit
        position_size = risk_amount / stop_loss_amount_per_unit
        
        # Cap the position size to the maximum allowed
        max_size_in_units = (account_value * self.params.max_position_size) / price
        
        return min(position_size, max_size_in_units)

    def generate_signal(self, price: float, account_value: float) -> Dict[str, any]:
        """
        Processes a new price tick and generates a trading signal (buy, sell, or hold).
        This is the main logic hub for the strategy.
        """
        zscore = self._calculate_zscore(price)
        
        signal = {
            'timestamp': datetime.now().isoformat(),
            'price': price,
            'zscore': zscore,
            'action': 'hold', # Default action is to do nothing
            'size': 0.0,
            'reason': ''
        }
        
        # --- Exit Logic ---
        # First, check if we have a position that needs to be exited.
        if self.position != 0:
            # 1. Stop-Loss Check
            is_long = self.position > 0
            stop_loss_triggered = (is_long and self.stop_loss_price is not None and price <= self.stop_loss_price) or \
                                  (not is_long and self.stop_loss_price is not None and price >= self.stop_loss_price)

            if stop_loss_triggered:
                signal['action'] = 'sell' if is_long else 'buy'
                signal['size'] = abs(self.position)
                signal['reason'] = 'stop_loss'
                self.position = 0.0
                self.entry_price = None
                self.stop_loss_price = None
                return signal

            # 2. Mean Reversion (Take Profit) Check
            exit_condition_met = (is_long and zscore >= -self.params.exit_std_dev) or \
                                 (not is_long and zscore <= self.params.exit_std_dev)

            if exit_condition_met:
                signal['action'] = 'sell' if is_long else 'buy'
                signal['size'] = abs(self.position)
                signal['reason'] = 'mean_reversion'
                self.position = 0.0
                self.entry_price = None
                self.stop_loss_price = None
                return signal

        # --- Entry Logic ---
        # If we don't have a position, check for a new entry signal.
        # We must have enough historical data to make a decision.
        elif len(self.prices) >= self.params.lookback_period:
            position_size = self._calculate_position_size(price, account_value)
            
            if position_size == 0: # Can't enter a trade if size is zero
                return signal

            # Long Entry Signal
            if zscore < -self.params.entry_std_dev:
                signal['action'] = 'buy'
                signal['size'] = position_size
                signal['reason'] = 'zscore_entry'
                self.position = position_size
                self.entry_price = price
                self.stop_loss_price = price * (1 - self.params.stop_loss_pct)
            
            # Short Entry Signal
            elif zscore > self.params.entry_std_dev:
                signal['action'] = 'sell'
                signal['size'] = position_size
                signal['reason'] = 'zscore_entry'
                self.position = -position_size # Negative for a short position
                self.entry_price = price
                self.stop_loss_price = price * (1 + self.params.stop_loss_pct)

        return signal
