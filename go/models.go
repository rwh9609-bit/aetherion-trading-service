// models.go
package main

import (
	"sync"
	"time"
)

type User struct {
	ID               string    `json:"id"`
	Username         string    `json:"username"`
	Email            string    `json:"email"`
	PasswordHash     string    `json:"-"`
	StripeCustomerID string    `json:"stripe_customer_id"`
	SubscriptionID   string    `json:"subscription_id"`
	CreatedAt        time.Time `json:"created_at"`
}

type Product struct {
	ID                   string   `json:"id"`
	Name                 string   `json:"name"`
	StripeProductID      string   `json:"stripe_product_id"`
	PriceMonthly         float64  `json:"price_monthly"`
	StripePriceIDMonthly string   `json:"stripe_price_id_monthly"`
	PriceYearly          float64  `json:"price_yearly"`
	StripePriceIDYearly  string   `json:"stripe_price_id_yearly"`
	Features             []string `json:"features"`
}

type Subscription struct {
	ID                   string    `json:"id"`
	UserID               string    `json:"user_id"`
	ProductID            string    `json:"product_id"`
	StripeSubscriptionID string    `json:"stripe_subscription_id"`
	Status               string    `json:"status"`
	CurrentPeriodStart   time.Time `json:"current_period_start"`
	CurrentPeriodEnd     time.Time `json:"current_period_end"`
	CreatedAt            time.Time `json:"created_at"`
	UpdatedAt            time.Time `json:"updated_at"`
}

type Strategy struct {
	ID           string
	UserID       string
	Symbol       string
	StrategyType string
	Parameters   map[string]string
	IsActive     bool
	CreatedAt    time.Time
	UpdatedAt    time.Time
	mu           sync.Mutex
}
