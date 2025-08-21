package main

import (
	"context"
	"fmt"
	"time"

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

// --- Bot Management ---
func (s *DBService) CreateBot(ctx context.Context, bot *pb.BotConfig) (string, error) {
	var id string
	query := `INSERT INTO bots (id, user_id, name, symbol, strategy, parameters, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`
	err := s.pool.QueryRow(ctx, query, bot.BotId, bot.UserId, bot.Name, bot.Symbol, bot.Strategy, bot.Parameters, bot.IsActive).Scan(&id)
	if err != nil {
		log.Error().Err(err).Msg("Failed to create bot")
		return "", fmt.Errorf("failed to create bot: %w", err)
	}
	log.Info().Str("bot_id", id).Msg("Bot created successfully")
	return id, nil
}

// CreateUser inserts a new user into the database.
func (s *DBService) CreateUser(ctx context.Context, username, passwordHash string) (string, error) {
	var id string
	query := `INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id`
	err := s.pool.QueryRow(ctx, query, username, passwordHash).Scan(&id)
	if err != nil {
		log.Error().Err(err).Msg("Failed to create user")
		return "", fmt.Errorf("failed to create user: %w", err)
	}
	return id, nil
}

// GetUserByUsername retrieves a user by their username.
func (s *DBService) GetUserByUsername(ctx context.Context, username string) (*User, error) {
	var user User
	query := `SELECT id, username, password_hash, created_at FROM users WHERE username = $1`
	err := s.pool.QueryRow(ctx, query, username).Scan(&user.ID, &user.Username, &user.PasswordHash, &user.CreatedAt)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get user by username")
		return nil, fmt.Errorf("failed to get user by username: %w", err)
	}
	return &user, nil
}

// --- Portfolio Management ---

// SavePortfolio saves or updates a user's portfolio.
func (s *DBService) SavePortfolio(ctx context.Context, portfolio *Portfolio) error {
	query := `
		INSERT INTO portfolios (id, user_id, symbol, quantity, average_price, updated_at)
		VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
		ON CONFLICT (user_id, symbol) DO UPDATE
		SET quantity = EXCLUDED.quantity,
			average_price = EXCLUDED.average_price,
			updated_at = CURRENT_TIMESTAMP
	`
	_, err := s.pool.Exec(ctx, query, portfolio.ID, portfolio.UserID, portfolio.Symbol, portfolio.Quantity, portfolio.AveragePrice)
	if err != nil {
		log.Error().Err(err).Msg("Failed to save portfolio")
		return fmt.Errorf("failed to save portfolio: %w", err)
	}
	return nil
}

// GetPortfolioByUserID retrieves a user's portfolio.
func (s *DBService) GetPortfolioByUserID(ctx context.Context, userID string) ([]*Portfolio, error) {
	var portfolios []*Portfolio
	query := `SELECT id, user_id, symbol, quantity, average_price, created_at, updated_at FROM portfolios WHERE user_id = $1`
	rows, err := s.pool.Query(ctx, query, userID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get portfolio by user ID")
		return nil, fmt.Errorf("failed to get portfolio by user ID: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var p Portfolio
		if err := rows.Scan(&p.ID, &p.UserID, &p.Symbol, &p.Quantity, &p.AveragePrice, &p.CreatedAt, &p.UpdatedAt); err != nil {
			log.Error().Err(err).Msg("Failed to scan portfolio row")
			return nil, fmt.Errorf("failed to scan portfolio row: %w", err)
		}
		portfolios = append(portfolios, &p)
	}
	return portfolios, nil
}

// --- Strategy Management ---

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

// --- Trade History ---

// RecordTrade inserts a new trade record.
func (s *DBService) RecordTrade(ctx context.Context, trade *Trade) error {
	query := `
		INSERT INTO trades (id, user_id, strategy_id, symbol, side, quantity, price, pnl)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := s.pool.Exec(ctx, query, trade.ID, trade.UserID, trade.StrategyID, trade.Symbol, trade.Side, trade.Quantity, trade.Price, trade.PnL)
	if err != nil {
		log.Error().Err(err).Msg("Failed to record trade")
		return fmt.Errorf("failed to record trade: %w", err)
	}
	return nil
}

// GetTradesByUserID retrieves trade history for a user.
func (s *DBService) GetTradesByUserID(ctx context.Context, userID string) ([]*Trade, error) {
	if userID == "" {
		return nil, fmt.Errorf("userID cannot be empty")
	}
	var trades []*Trade
	query := `SELECT id, user_id, strategy_id, symbol, side, quantity, price, executed_at, pnl FROM trades WHERE user_id = $1 ORDER BY executed_at DESC`
	rows, err := s.pool.Query(ctx, query, userID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get trades by user ID")
		return nil, fmt.Errorf("failed to get trades by user ID: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var t Trade
		if err := rows.Scan(&t.ID, &t.UserID, &t.StrategyID, &t.Symbol, &t.Side, &t.Quantity, &t.Price, &t.ExecutedAt, &t.PnL); err != nil {
			log.Error().Err(err).Msg("Failed to scan trade row")
			return nil, fmt.Errorf("failed to scan trade row: %w", err)
		}
		trades = append(trades, &t)
	}
	return trades, nil
}

// Define structs for database models (these should ideally be in a separate models.go file)
type User struct {
	ID           string
	Username     string
	PasswordHash string
	CreatedAt    time.Time
}

type Portfolio struct {
	ID           string
	UserID       string
	Symbol       string
	Quantity     float64
	AveragePrice float64
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type Trade struct {
	ID         string
	UserID     string
	StrategyID string // Nullable
	Symbol     string
	Side       string
	Quantity   float64
	Price      float64
	ExecutedAt time.Time
	PnL        float64 // Nullable
}
