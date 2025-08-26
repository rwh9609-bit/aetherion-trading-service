package main

import (
	"context"
	"testing"

	pb "aetherion/gen"

	"github.com/pashagolub/pgxmock/v2"
	"github.com/stretchr/testify/assert"
)

func TestGetBotsByUserID(t *testing.T) {
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatal(err)
	}
	defer mock.Close()

	dbService := &DBService{pool: mock}

	userID := "test-user-id"
	rows := pgxmock.NewRows([]string{"id", "user_id", "name", "symbol", "strategy", "parameters", "is_active", "account_value"}).
		AddRow("bot1", userID, "Test Bot 1", "BTC/USD", "Mean Reversion", "{\"threshold\":1.0}", true, 1000.0)

	mock.ExpectQuery(`SELECT id, user_id, name, symbol, strategy, parameters, is_active, account_value FROM bots WHERE user_id = \$1`).WithArgs(userID).WillReturnRows(rows)

	bots, err := dbService.GetBotsByUserID(context.Background(), userID)

	assert.NoError(t, err)
	assert.Len(t, bots, 1)
	assert.Equal(t, "bot1", bots[0].BotId)
	assert.Equal(t, "Test Bot 1", bots[0].Name)
}

func TestGetPortfolioByBotID(t *testing.T) {
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatal(err)
	}
	defer mock.Close()

	dbService := &DBService{pool: mock}

	botID := "test-bot-id"
	rows := pgxmock.NewRows([]string{"symbol", "quantity", "average_price"}).
		AddRow("BTC/USD", 1.5, 50000.0)

	mock.ExpectQuery(`SELECT symbol, quantity, average_price FROM portfolios WHERE bot_id = \$1`).WithArgs(botID).WillReturnRows(rows)

	portfolio, err := dbService.GetPortfolioByBotID(context.Background(), botID)

	assert.NoError(t, err)
	assert.NotNil(t, portfolio)
	assert.Equal(t, botID, portfolio.BotId)
	assert.Equal(t, 1.5, decimalValueToFloat64(portfolio.Positions[0].Quantity))
	assert.Equal(t, 50000.0, decimalValueToFloat64(portfolio.Positions[0].AveragePrice))
	assert.Equal(t, 75000.0, decimalValueToFloat64(portfolio.TotalPortfolioValue))
}

func decimalValueToFloat64(d *pb.DecimalValue) float64 {
	if d == nil {
		return 0
	}
	return float64(d.Units) + float64(d.Nanos)/1e9
}
