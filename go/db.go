package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	pb "aetherion/gen"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type PgxPool interface {
	Exec(context.Context, string, ...interface{}) (pgconn.CommandTag, error)
	Query(context.Context, string, ...interface{}) (pgx.Rows, error)
	QueryRow(context.Context, string, ...interface{}) pgx.Row
	Ping(context.Context) error
	Close()
}

// DBService provides methods for interacting with the PostgreSQL database.
type DBService struct {
	pool PgxPool
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

// --------------------- //
// - Order Management -- //
// --------------------- //

// CREATE TABLE IF NOT EXISTS orders (
//
//	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
//	bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
//	symbol TEXT NOT NULL,
//	side TEXT NOT NULL, -- Use 'BUY' or 'SELL'
//	type TEXT NOT NULL, -- Use 'MARKET', 'LIMIT', 'STOP'
//	status TEXT NOT NULL, -- Use 'NEW', 'SUBMITTED', etc.
//	quantity_requested NUMERIC(20, 8) NOT NULL,
//	quantity_filled NUMERIC(20, 8) DEFAULT 0,
//	limit_price NUMERIC(20, 8),
//	stop_price NUMERIC(20, 8),
//	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
//	updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
//
// );
func (s *DBService) CreateOrder(
	ctx context.Context,
	id string,
	botId string,
	symbol string,
	side string,
	orderType string,
	status pb.OrderStatus,
	quantityRequested string,
	quantityFilled string,
	limitPrice string,
	stopPrice string,
) (string, error) {
	var returnedId string
	query := `INSERT INTO orders (id, bot_id, symbol, side, type, status, quantity_requested, quantity_filled, limit_price, stop_price, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id`
	err := s.pool.QueryRow(ctx, query, id, botId, symbol, side, orderType, status.String(), quantityRequested, quantityFilled, limitPrice, stopPrice).Scan(&returnedId)
	if err != nil {
		log.Error().Err(err).Msg("Failed to create order")
		return "", fmt.Errorf("failed to create order: %w", err)
	}
	log.Info().Str("order_id", returnedId).Msg("Order created successfully")
	return returnedId, nil
}

func (s *DBService) GetOrder(ctx context.Context, orderID string) (*pb.Order, error) {
	var order pb.Order
	query := `SELECT id, bot_id, symbol, side, type, status, quantity_requested, quantity_filled, limit_price, stop_price, created_at, updated_at
		FROM orders WHERE id = $1`
	err := s.pool.QueryRow(ctx, query, orderID).Scan(&order.Id, &order.BotId, &order.Symbol, &order.Side, &order.Type, &order.Status, &order.QuantityRequested, &order.QuantityFilled, &order.LimitPrice, &order.StopPrice, &order.CreatedAt, &order.UpdatedAt)
	if err != nil {
		log.Error().Err(err).Str("order_id", orderID).Msg("Failed to get order")
		return nil, fmt.Errorf("failed to get order: %w", err)
	}
	return &order, nil
}

func (s *DBService) ListOrders(ctx context.Context, botID string, limit, offset int32) ([]*pb.Order, error) {
	// If botID == "" then return because it can't be empty.
	if botID == "" {
		return nil, fmt.Errorf("botID cannot be empty")
	}
	var orders []*pb.Order
	query := `SELECT id, bot_id, symbol, side, type, status, quantity_requested, quantity_filled, limit_price, stop_price, created_at, updated_at
		FROM orders WHERE bot_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`
	rows, err := s.pool.Query(ctx, query, botID, limit, offset)
	if err != nil {
		log.Error().Err(err).Str("bot_id", botID).Msg("Failed to list orders")
		return nil, fmt.Errorf("failed to list orders: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var order pb.Order
		var sideStr, typeStr, statusStr string
		var quantityRequestedStr, quantityFilledStr, limitPriceStr, stopPriceStr string
		var createdAt, updatedAt time.Time

		if err := rows.Scan(
			&order.Id,
			&order.BotId,
			&order.Symbol,
			&sideStr,
			&typeStr,
			&statusStr,
			&quantityRequestedStr,
			&quantityFilledStr,
			&limitPriceStr,
			&stopPriceStr,
			&createdAt,
			&updatedAt,
		); err != nil {
			log.Error().Err(err).Msg("Failed to scan order")
			return nil, fmt.Errorf("failed to scan order: %w", err)
		}

		// Convert string to enum
		order.Side = pb.OrderSide(pb.OrderSide_value[sideStr])
		order.Type = pb.OrderType(pb.OrderType_value[typeStr])
		order.Status = pb.OrderStatus(pb.OrderStatus_value[statusStr])

		// Convert numeric strings to DecimalValue
		order.QuantityRequested = numericValueToDecimal(quantityRequestedStr)
		order.QuantityFilled = numericValueToDecimal(quantityFilledStr)
		order.LimitPrice = numericValueToDecimal(limitPriceStr)
		order.StopPrice = numericValueToDecimal(stopPriceStr)

		// Convert timestamps
		order.CreatedAt = timestamppb.New(createdAt)
		order.UpdatedAt = timestamppb.New(updatedAt)

		orders = append(orders, &order)
	}
	if err := rows.Err(); err != nil {
		log.Error().Err(err).Msg("Failed to iterate orders")
		return nil, fmt.Errorf("failed to iterate orders: %w", err)
	}
	return orders, nil
}

// ----------------------
// --- Bot Management ---
// ----------------------

func (s *DBService) CreateBot(ctx context.Context, bot *pb.Bot) (string, error) {
	var id string
	// Always marshal bot.State to JSON, even if empty
	stateJSON, _ := json.Marshal(bot.State)
	parametersJSON, _ := json.Marshal(bot.Parameters)
	query := `INSERT INTO bots (id, user_id, name, symbol, strategy, parameters, is_active, account_value, state)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`
	err := s.pool.QueryRow(ctx, query, bot.BotId, bot.UserId, bot.Name, bot.Symbol, bot.Strategy, parametersJSON, bot.IsActive, bot.AccountValue, stateJSON).Scan(&id)
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
func (s *DBService) GetBotsByUserID(ctx context.Context, userID string) ([]*pb.Bot, error) {
	var bots []*pb.Bot
	query := `SELECT id, user_id, name, symbol, strategy, parameters, is_active, account_value, state FROM bots WHERE user_id = $1`
	rows, err := s.pool.Query(ctx, query, userID)
	if err != nil {
		log.Error().Err(err).Str("user_id", userID).Msg("Failed to get bots by user ID")
		return nil, fmt.Errorf("failed to get bots by user ID: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var (
			id, userID, name, symbol, strategy string
			parametersStr, stateStr            string
			isActive                           bool
			accountValue                       float64
		)
		err := rows.Scan(&id, &userID, &name, &symbol, &strategy, &parametersStr, &isActive, &accountValue, &stateStr)
		if err != nil {
			log.Error().Err(err).Msg("Failed to scan bot row")
			return nil, fmt.Errorf("failed to scan bot row: %w", err)
		}
		var parameters map[string]interface{}
		if err := json.Unmarshal([]byte(parametersStr), &parameters); err != nil {
			log.Error().Err(err).Msg("Failed to unmarshal bot parameters")
			parameters = map[string]interface{}{}
		}
		var state map[string]interface{}
		if err := json.Unmarshal([]byte(stateStr), &state); err != nil {
			log.Error().Err(err).Msg("Failed to unmarshal bot state")
			state = map[string]interface{}{}
		}
		bot := &pb.Bot{
			BotId:        id,
			UserId:       userID,
			Name:         name,
			Symbol:       symbol,
			Strategy:     strategy,
			Parameters:   convertMapInterfaceToString(parameters),
			IsActive:     isActive,
			AccountValue: accountValue,
			State:        convertMapInterfaceToString(state), // <-- Add this line
		}
		bots = append(bots, bot)
	}
	return bots, nil
}

func (s *DBService) SaveBotState(ctx context.Context, botID string, state map[string]interface{}, accountValue float64) error {
	stateJSON, _ := json.Marshal(state)
	query := `UPDATE bots SET state = $1, account_value = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $2`
	_, err := s.pool.Exec(ctx, query, stateJSON, botID, accountValue)
	return err
}

func (s *DBService) LoadBotState(ctx context.Context, botID string) (map[string]interface{}, error) {
	var stateJSON string
	query := `SELECT state FROM bots WHERE id = $1`
	err := s.pool.QueryRow(ctx, query, botID).Scan(&stateJSON)
	if err != nil {
		return nil, err
	}
	var state map[string]interface{}
	json.Unmarshal([]byte(stateJSON), &state)
	return state, nil
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

func (s *DBService) SetUserRoleByStripeCustomerID(ctx context.Context, stripeCustomerID string, role string) error {
	query := `UPDATE users SET role = $1 WHERE stripe_customer_id = $2`
	_, err := s.pool.Exec(ctx, query, role, stripeCustomerID)
	if err != nil {
		log.Error().Err(err).Str("stripe_customer_id", stripeCustomerID).Msg("Failed to update user role")
		return fmt.Errorf("failed to update user role: %w", err)
	}
	log.Info().Str("stripe_customer_id", stripeCustomerID).Str("role", role).Msg("User role updated successfully")
	return nil
}

// GetPortfolioByBotID retrieves the portfolio for a given bot.
func (s *DBService) GetPortfolioByBotID(ctx context.Context, botID string) (*pb.PortfolioResponse, error) {
	portfolio := &pb.PortfolioResponse{
		Positions: []*pb.PortfolioPosition{},
	}
	query := `SELECT symbol, quantity, average_price FROM portfolios WHERE bot_id = $1`
	rows, err := s.pool.Query(ctx, query, botID)
	if err != nil {
		log.Error().Err(err).Str("bot_id", botID).Msg("Failed to get portfolio by bot ID")
		return nil, fmt.Errorf("failed to get portfolio by bot ID: %w", err)
	}
	defer rows.Close()

	var totalValue float64
	for rows.Next() {
		var symbol string
		var quantity float64
		var averagePrice float64
		if err := rows.Scan(&symbol, &quantity, &averagePrice); err != nil {
			log.Error().Err(err).Msg("Failed to scan portfolio row")
			return nil, fmt.Errorf("failed to scan portfolio row: %w", err)
		}
		portfolio.Positions = append(portfolio.Positions, &pb.PortfolioPosition{
			Symbol:       symbol,
			Quantity:     float64ToDecimalValue(quantity),
			AveragePrice: float64ToDecimalValue(averagePrice),
		})
		totalValue += quantity * averagePrice
	}

	// message PortfolioResponse {
	//     string bot_id = 1;
	//     repeated PortfolioPosition positions = 2;
	//     DecimalValue total_portfolio_value = 3;
	//     DecimalValue cash_balance = 4;
	//     google.protobuf.Timestamp updated_at = 5;
	// }
	// message PortfolioPosition {
	//     string symbol = 1;
	//     DecimalValue quantity = 2;
	//     DecimalValue average_price = 3;
	//     DecimalValue market_value = 4;
	//     DecimalValue unrealized_pnl = 5;
	//     DecimalValue exposure_pct = 6;
	// }
	portfolio.TotalPortfolioValue = float64ToDecimalValue(totalValue)
	portfolio.BotId = botID

	return portfolio, nil
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

// ------------------------- //
// --- Utility Functions --- //
// ------------------------- //

// convertMapInterfaceToString converts map[string]interface{} to map[string]string.
func convertMapInterfaceToString(m map[string]interface{}) map[string]string {
	result := make(map[string]string)
	for k, v := range m {
		result[k] = fmt.Sprintf("%v", v)
	}
	return result
}

//	message DecimalValue {
//	    int64 units = 1;   // Whole part
//	    sfixed32 nanos = 2; // Fractional part, -999,999,999 .. +999,999,999
//	}
//
// float64ToDecimalValue converts a float64 to a *pb.DecimalValue.
func float64ToDecimalValue(val float64) *pb.DecimalValue {
	return &pb.DecimalValue{
		Units: int64(val),
		Nanos: int32((val - float64(int64(val))) * 1e9),
	}
}
