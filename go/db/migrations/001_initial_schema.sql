-- Drop tables in order of dependency to avoid foreign key errors
DROP TABLE IF EXISTS trades CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS portfolio_history CASCADE;
DROP TABLE IF EXISTS portfolios CASCADE;
DROP TABLE IF EXISTS strategies CASCADE;
DROP TABLE IF EXISTS bot_performance_snapshots CASCADE;
DROP TABLE IF EXISTS bots CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS market_data CASCADE;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

----------------------------------------------------------------
-- CORE USER & BOT TABLES
----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- <-- CORRECTED: Changed from TEXT to UUID for consistency
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT, -- <-- ADDED: Useful for users to remember bot's purpose
    symbols TEXT[] NOT NULL,
    strategy_name TEXT NOT NULL, -- Example: 'MeanReversion', 'GoldenCross'
    strategy_parameters JSONB NOT NULL, -- Parameters for the chosen strategy
    initial_account_value NUMERIC(20, 8) NOT NULL DEFAULT 100000,
    current_account_value NUMERIC(20, 8) NOT NULL DEFAULT 100000,
    is_active BOOLEAN DEFAULT TRUE,
    is_live BOOLEAN DEFAULT FALSE, -- <-- ADDED: Differentiates between paper trading and live trading bots
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

----------------------------------------------------------------
-- PORTFOLIO & PERFORMANCE TRACKING
----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    quantity NUMERIC(20, 8) NOT NULL,
    average_price NUMERIC(20, 8) NOT NULL,
    market_value NUMERIC(20, 8), -- <-- ADDED: Current market value, can be updated periodically
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (bot_id, symbol) -- <-- CORRECTED: Changed from (user_id, symbol)
);

CREATE TABLE IF NOT EXISTS portfolio_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    snapshot_time TIMESTAMP WITH TIME ZONE NOT NULL,
    quantity NUMERIC(20, 8) NOT NULL,
    average_price NUMERIC(20, 8) NOT NULL,
    market_value NUMERIC(20, 8) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (portfolio_id, snapshot_time)
);

-- ADDED: A new table to track historical portfolio snapshots for analysis
CREATE TABLE IF NOT EXISTS bot_performance_snapshots (
    id BIGSERIAL PRIMARY KEY, -- Use BIGSERIAL for high-frequency time-series data
    bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    snapshot_time TIMESTAMP WITH TIME ZONE NOT NULL,
    equity_value NUMERIC(20, 8) NOT NULL, -- Total value of cash + holdings
    cash_balance NUMERIC(20, 8) NOT NULL,
    pnl NUMERIC(20, 8) NOT NULL DEFAULT 0,
    UNIQUE(bot_id, snapshot_time)
);


----------------------------------------------------------------
-- ORDER & TRADE LIFECYCLE
-- This is a critical addition for a robust system.
----------------------------------------------------------------

-- ADDED: The 'orders' table tracks the INTENTION to trade.
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
    type TEXT NOT NULL CHECK (type IN ('MARKET', 'LIMIT', 'STOP')),
    quantity_requested NUMERIC(20, 8) NOT NULL,
    quantity_filled NUMERIC(20, 8) DEFAULT 0,
    limit_price NUMERIC(20, 8), -- For LIMIT orders
    stop_price NUMERIC(20, 8), -- For STOP orders
    status TEXT NOT NULL CHECK (status IN ('NEW', 'SUBMITTED', 'PARTIALLY_FILLED', 'FILLED', 'CANCELED', 'REJECTED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- REVISED: The 'trades' table now tracks the EXECUTION of an order.
CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE, -- <-- CHANGED: Trades belong to an order
    bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL, -- 'BUY' or 'SELL', inherited from order
    quantity NUMERIC(20, 8) NOT NULL,
    price NUMERIC(20, 8) NOT NULL,
    commission NUMERIC(20, 8) DEFAULT 0, -- <-- ADDED: Important for accurate PnL
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    pnl_realized NUMERIC(20, 8) -- PnL is only realized on a closing trade
);


----------------------------------------------------------------
-- MARKET DATA (For Backtesting & Analysis)
----------------------------------------------------------------

-- ADDED: A table to store historical market data (candlesticks).
CREATE TABLE IF NOT EXISTS market_data (
    id BIGSERIAL PRIMARY KEY,
    symbol TEXT NOT NULL,
    timeframe TEXT NOT NULL, -- e.g., '1m', '5m', '1h', '1D'
    open_time TIMESTAMP WITH TIME ZONE NOT NULL,
    open_price NUMERIC(20, 8) NOT NULL,
    high_price NUMERIC(20, 8) NOT NULL,
    low_price NUMERIC(20, 8) NOT NULL,
    close_price NUMERIC(20, 8) NOT NULL,
    volume NUMERIC(20, 8) NOT NULL,
    close_time TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE(symbol, timeframe, open_time)
);

----------------------------------------------------------------
-- INDEXES FOR PERFORMANCE
----------------------------------------------------------------

-- Indexes on foreign keys and commonly queried columns
CREATE INDEX IF NOT EXISTS idx_bots_user_id ON bots (user_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_bot_id ON portfolios (bot_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_bot_id_time ON bot_performance_snapshots (bot_id, snapshot_time DESC);
CREATE INDEX IF NOT EXISTS idx_orders_bot_id ON orders (bot_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_trades_order_id ON trades (order_id);
CREATE INDEX IF NOT EXISTS idx_trades_bot_id ON trades (bot_id);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades (symbol);
CREATE INDEX IF NOT EXISTS idx_market_data_symbol_timeframe_time ON market_data (symbol, timeframe, open_time DESC);
