import numpy as np
from typing import Dict, Tuple, Optional
from dataclasses import dataclass
import pandas as pd
from datetime import datetime, timedelta

@dataclass
class MeanReversionParams:
    lookback_period: int = 20  # Period for calculating moving average
    entry_std_dev: float = 2.0  # Number of standard deviations for entry
    exit_std_dev: float = 0.5   # Number of standard deviations for exit
    max_position_size: float = 0.1  # Maximum position size in base currency
    stop_loss_pct: float = 0.02  # 2% stop loss
    risk_per_trade_pct: float = 0.01  # 1% risk per trade

class MeanReversionStrategy:
    def __init__(self, params: MeanReversionParams):
        self.params = params
        self.prices: list[float] = []
        self.position: float = 0
        self.entry_price: Optional[float] = None
        
    def calculate_zscore(self, price: float) -> float:
        """Calculate z-score of current price relative to lookback period."""
        self.prices.append(price)
        if len(self.prices) > self.params.lookback_period:
            self.prices.pop(0)
            
        if len(self.prices) < self.params.lookback_period:
            return 0.0
            
        price_series = np.array(self.prices)
        mean = np.mean(price_series)
        std = np.std(price_series)
        
        return (price - mean) / std if std > 0 else 0.0
        
    def calculate_position_size(self, price: float, account_value: float) -> float:
        """Calculate position size based on risk parameters."""
        risk_amount = account_value * self.params.risk_per_trade_pct
        stop_loss_amount = price * self.params.stop_loss_pct
        
        # Position size based on risk
        position_size = risk_amount / stop_loss_amount
        
        # Cap at max position size
        return min(position_size, self.params.max_position_size)
        
    def on_tick(self, tick: Dict) -> Optional[Dict]:
        """Process a market tick and decide action (buy/sell/hold) as a dictionary."""
        price = tick.get('price')
        account_value = tick.get('account_value', 10000)
        if price is None:
            return None
        zscore = self.calculate_zscore(price)
        action = {
            'side': None,
            'size': 0.0,
            'price': price,
            'zscore': zscore,
            'stop_loss': None
        }
        if self.position == 0:
            if zscore < -self.params.entry_std_dev:
                self.position = self.calculate_position_size(price, account_value)
                self.entry_price = price
                action['side'] = 'BUY'
                action['size'] = self.position
                action['stop_loss'] = price * (1 - self.params.stop_loss_pct)
                return action
            elif zscore > self.params.entry_std_dev:
                self.position = -self.calculate_position_size(price, account_value)
                self.entry_price = price
                action['side'] = 'SELL'
                action['size'] = abs(self.position)
                action['stop_loss'] = price * (1 + self.params.stop_loss_pct)
                return action
        else:
            # Exit conditions
            if abs(zscore) < self.params.exit_std_dev:
                action['side'] = 'EXIT'
                action['size'] = abs(self.position)
                self.position = 0
                self.entry_price = None
                return action
        action['side'] = 'HOLD'
        return action
        
    def generate_signal(self, price: float, account_value: float) -> Dict[str, any]:
        """Generate trading signal based on mean reversion strategy."""
        zscore = self.calculate_zscore(price)
        
        signal = {
            'timestamp': datetime.now().isoformat(),
            'price': price,
            'zscore': zscore,
            'action': 'hold',
            'size': 0.0,
            'stop_loss': None
        }
        
        # No signal until we have enough price history
        if len(self.prices) < self.params.lookback_period:
            return signal
            
        if self.position == 0:  # No position, look for entry
            if zscore > self.params.entry_std_dev:  # Short signal
                signal['action'] = 'sell'
                position_size = self.calculate_position_size(price, account_value)
                signal['size'] = position_size
                signal['stop_loss'] = price * (1 + self.params.stop_loss_pct)
                self.position = -position_size
                self.entry_price = price
                
            elif zscore < -self.params.entry_std_dev:  # Long signal
                signal['action'] = 'buy'
                position_size = self.calculate_position_size(price, account_value)
                signal['size'] = position_size
                signal['stop_loss'] = price * (1 - self.params.stop_loss_pct)
                self.position = position_size
                self.entry_price = price
                
        else:  # Have position, look for exit
            # Check stop loss
            if self.position > 0 and price < signal['stop_loss']:  # Long position
                signal['action'] = 'sell'
                signal['size'] = abs(self.position)
                self.position = 0
                self.entry_price = None
                
            elif self.position < 0 and price > signal['stop_loss']:  # Short position
                signal['action'] = 'buy'
                signal['size'] = abs(self.position)
                self.position = 0
                self.entry_price = None
                
            # Check mean reversion exit
            elif (self.position > 0 and zscore > -self.params.exit_std_dev) or \
                 (self.position < 0 and zscore < self.params.exit_std_dev):
                signal['action'] = 'sell' if self.position > 0 else 'buy'
                signal['size'] = abs(self.position)
                self.position = 0
                self.entry_price = None
                
        return signal
