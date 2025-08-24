package main

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
	pb "github.com/rwh9609-bit/multilanguage/go/gen"
)

// DBService provides methods for interacting with the PostgreSQL database.
type DBService struct {
	pool *pgxpool.Pool
}

// NewDBService creates a new DBService instance.
func NewDBService(connStr string) (*DBService, error) {
	config, err := pgxpool.ParseConfig(connStr)
	if err != nil {
		log.Error().Err(err).Msg("Failed to parse DB connection string")
		return nil, fmt.Errorf("failed to parse DB connection string: %w", err)
	}

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		log.Error().Err(err).Msg("Failed to create DB connection pool")
		return nil, fmt.Errorf("failed to create DB connection pool: %w", err)
	}

	// Ping the database to verify the connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	log.Info().Msg("Successfully connected to PostgreSQL database.")
	return &DBService{pool: pool}, nil
}

// Close closes the database connection pool.
func (s *DBService) Close() {
	s.pool.Close()
	log.Info().Msg("Database connection pool closed.")
}

// ----------------------
// --- Bot Management ---
// ----------------------

func (s *DBService) CreateBot(ctx context.Context, bot *pb.Bot) (string, error) {
	var id string
	query := `INSERT INTO bots (id, user_id, name, symbol, strategy, parameters, is_active, account_value) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`
	err := s.pool.QueryRow(ctx, query, bot.BotId, bot.UserId, bot.Name, bot.Symbol, bot.Strategy, bot.Parameters, bot.IsActive, bot.AccountValue).Scan(&id)
	if err != nil {
		log.Error().Err(err).Msg("Failed to create bot")
		return "", fmt.Errorf("failed to create bot: %w", err)
	}
	log.Info().Str("bot_id", id).Msg("Bot created successfully")
	return id, nil
}

func (s *DBService) DeleteBot(ctx context.Context, botID string) error {
	query := `DELETE FROM bots WHERE id = $1`
	_, err := s.pool.Exec(ctx, query, botID)
	if err != nil {
		log.Error().Err(err).Str("bot_id", botID).Msg("Failed to delete bot")
		return fmt.Errorf("failed to delete bot: %w", err)
	}
	log.Info().Str("bot_id", botID).Msg("Bot deleted successfully")
	return nil
}

// -----------------------
// --- User Management ---
// -----------------------

func (s *DBService) CreateUser(ctx context.Context, username, passwordHash string) (string, error) {
	id := uuid.New().String()
	query := `INSERT INTO users (id, username, password_hash) VALUES ($1, $2, $3) RETURNING id`
	err := s.pool.QueryRow(ctx, query, id, username, passwordHash).Scan(&id)
	if err != nil {
		log.Error().Err(err).Msg("Failed to create user")
		return "", fmt.Errorf("failed to create user: %w", err)
	}
	return id, nil
}

// ---------------------------- //
// --- Portfolio Management --- //
// ---------------------------- //

// CREATE TABLE IF NOT EXISTS portfolios (
//     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
//     bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
//     symbol TEXT NOT NULL,
//     quantity NUMERIC(20, 8) NOT NULL,
//     average_price NUMERIC(20, 8) NOT NULL,
//     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
//     updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
//     UNIQUE(bot_id, symbol)
// );

// message PortfolioRequest {
//     string account_id = 1;
// }

//	message Portfolio {
//	    map<string, double> positions = 1;  // Map of symbol to quantity
//	    double total_value_usd = 2;
//	    optional double last_price_change = 3;  // Last observed price change percentage
//	    string bot_id = 4;
//	}
//
// SavePortfolio saves or updates a user's portfolio.

// func (s *DBService) SavePortfolio(ctx context.Context, portfolio *pb.Portfolio) error {
// 	query := `
// 		INSERT INTO portfolios (id, bot_id, symbol, quantity, average_price, created_at, updated_at)
// 		VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
// 		ON CONFLICT (bot_id, symbol) DO UPDATE
// 		SET quantity = EXCLUDED.quantity,
// 			average_price = EXCLUDED.average_price,
// 			updated_at = CURRENT_TIMESTAMP
// 	`
// 	_, err := s.pool.Exec(ctx, query, portfolio.Positions, portfolio.TotalValueUsd, portfolio.LastPriceChange, portfolio.BotId)
// 	if err != nil {
// 		log.Error().Err(err).Msg("Failed to save portfolio")
// 		return fmt.Errorf("failed to save portfolio: %w", err)
// 	}
// 	return nil
// }

// --------------------------- //
// --- Strategy Management --- //
// --------------------------- //

// SaveStrategy saves a new strategy or updates an existing one.
func (s *DBService) SaveStrategy(ctx context.Context, strategy *Strategy) (string, error) {
	var id string
	query := `
		INSERT INTO strategies (id, user_id, symbol, type, parameters, is_active, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
		ON CONFLICT (id) DO UPDATE
		SET symbol = EXCLUDED.symbol,
			type = EXCLUDED.type,
			parameters = EXCLUDED.parameters,
			is_active = EXCLUDED.is_active,
			updated_at = CURRENT_TIMESTAMP
		RETURNING id
	`
	err := s.pool.QueryRow(ctx, query, strategy.ID, strategy.UserID, strategy.Symbol, strategy.StrategyType, strategy.Parameters, strategy.IsActive).Scan(&id)
	if err != nil {
		log.Error().Err(err).Msg("Failed to save strategy")
		return "", fmt.Errorf("failed to save strategy: %w", err)
	}
	return id, nil
}

// GetStrategyByID retrieves a strategy by its ID.
func (s *DBService) GetStrategyByID(ctx context.Context, strategyID string) (*Strategy, error) {
	var strategy Strategy
	query := `SELECT id, user_id, symbol, type, parameters, is_active, created_at, updated_at FROM strategies WHERE id = $1`
	err := s.pool.QueryRow(ctx, query, strategyID).Scan(&strategy.ID, &strategy.UserID, &strategy.Symbol, &strategy.StrategyType, &strategy.Parameters, &strategy.IsActive, &strategy.CreatedAt, &strategy.UpdatedAt)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get strategy by ID")
		return nil, fmt.Errorf("failed to get strategy by ID: %w", err)
	}
	return &strategy, nil
}

// GetStrategiesByUserID retrieves all strategies for a given user.
func (s *DBService) GetStrategiesByUserID(ctx context.Context, userID string) ([]*Strategy, error) {
	var strategies []*Strategy
	query := `SELECT id, user_id, symbol, type, parameters, is_active, created_at, updated_at FROM strategies WHERE user_id = $1`
	rows, err := s.pool.Query(ctx, query, userID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get strategies by user ID")
		return nil, fmt.Errorf("failed to get strategies by user ID: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var strat Strategy
		if err := rows.Scan(&strat.ID, &strat.UserID, &strat.Symbol, &strat.StrategyType, &strat.Parameters, &strat.IsActive, &strat.CreatedAt, &strat.UpdatedAt); err != nil {
			log.Error().Err(err).Msg("Failed to scan strategy row")
			return nil, fmt.Errorf("failed to scan strategy row: %w", err)
		}
		strategies = append(strategies, &strat)
	}
	return strategies, nil
}

// --------------------- //
// --- Trade History --- //
// --------------------- //

// 	CREATE TABLE IF NOT EXISTS trades (
//     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
//     bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
//     symbol TEXT NOT NULL,
//     side TEXT NOT NULL,
//     quantity NUMERIC(20, 8) NOT NULL,
//     price NUMERIC(20, 8) NOT NULL,
//     executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
// );
// message Trade {
//     string trade_id = 1;
//     string symbol = 2;
//     string side = 3;
//     double quantity = 4;
//     double price = 5;
//     int64 executed_at = 6;
//     string strategy_id = 7;
//     string bot_id = 8;
// }

// RecordTrade inserts a new trade record.
func (s *DBService) RecordTrade(ctx context.Context, trade *pb.Trade) error {
	query := `
		INSERT INTO trades (id, bot_id, symbol, side, quantity, price, executed_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	_, err := s.pool.Exec(ctx, query, trade.TradeId, trade.Symbol, trade.Side, trade.Quantity, trade.Price, trade.ExecutedAt, trade.StrategyId, trade.BotId)
	if err != nil {
		log.Error().Err(err).Msg("Failed to record trade")
		return fmt.Errorf("failed to record trade: %w", err)
	}
	return nil
}

func (s *DBService) GetTradesByBotID(ctx context.Context, botID string) ([]*pb.Trade, error) {
	if botID == "" {
		return nil, fmt.Errorf("botID cannot be empty")
	}
	var trades []*pb.Trade
	query := `SELECT id, bot_id, symbol, side, quantity, price, executed_at FROM trades WHERE bot_id = $1 ORDER BY executed_at DESC`
	rows, err := s.pool.Query(ctx, query, botID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get trades by bot ID")
		return nil, fmt.Errorf("failed to get trades by bot ID: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var t pb.Trade
		if err := rows.Scan(&t.TradeId, &t.BotId, &t.Symbol, &t.Side, &t.Quantity, &t.Price, &t.ExecutedAt); err != nil {
			log.Error().Err(err).Msg("Failed to scan trade row")
			return nil, fmt.Errorf("failed to scan trade row: %w", err)
		}
		trades = append(trades, &t)
	}
	return trades, nil
}
