// models.go
package main

import (
	"sync"
	"time"
)

type Strategy struct {
	ID           string
	UserID       string
	BotId        string
	Symbol       string
	StrategyType string
	Parameters   map[string]string
	IsActive     bool
	CreatedAt    time.Time
	UpdatedAt    time.Time
	mu           sync.Mutex
}
