package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/url"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// Event types for market data
type EventType string

const (
	EventPriceTick EventType = "price_tick"
)

// PriceTick represents a normalized price update
type PriceTick struct {
	Symbol string
	Price  float64
	Ts     time.Time
}

// Event is a generic wrapper
type Event struct {
	Type EventType
	Data interface{}
}

// EventBus provides pub/sub for market events
type EventBus struct {
	mu          sync.RWMutex
	subscribers map[int]chan Event
	nextID      int
}

func NewEventBus() *EventBus {
	return &EventBus{subscribers: make(map[int]chan Event)}
}

func (b *EventBus) Subscribe(buffer int) (int, <-chan Event) {
	b.mu.Lock()
	defer b.mu.Unlock()
	id := b.nextID
	b.nextID++
	ch := make(chan Event, buffer)
	b.subscribers[id] = ch
	return id, ch
}

func (b *EventBus) Unsubscribe(id int) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if ch, ok := b.subscribers[id]; ok {
		close(ch)
		delete(b.subscribers, id)
	}
}

func (b *EventBus) Publish(evt Event) {
	b.mu.RLock()
	defer b.mu.RUnlock()
	for _, ch := range b.subscribers {
		select {
		case ch <- evt:
		default: // drop if subscriber slow
		}
	}
}

// Coinbase WebSocket minimal ticker handling
// Using legacy feed for simplicity: wss://ws-feed.exchange.coinbase.com

type coinbaseSub struct {
	Type     string        `json:"type"`
	Channels []interface{} `json:"channels"`
}

type coinbaseTicker struct {
	Type      string `json:"type"`
	ProductID string `json:"product_id"`
	Price     string `json:"price"`
	Time      string `json:"time"`
}

// CoinbaseFeed manages a single websocket connection with dynamic subscriptions.
type CoinbaseFeed struct {
	mu         sync.Mutex
	conn       *websocket.Conn
	bus        *EventBus
	subscribed map[string]bool
	onPrice    func(sym string, price float64)
	ctx        context.Context
	cancel     context.CancelFunc
	restarting bool
}

func NewCoinbaseFeed(bus *EventBus, onPrice func(string, float64)) *CoinbaseFeed {
	ctx, cancel := context.WithCancel(context.Background())
	return &CoinbaseFeed{
		bus:        bus,
		subscribed: make(map[string]bool),
		onPrice:    onPrice,
		ctx:        ctx,
		cancel:     cancel,
	}
}

// Start establishes connection and begins read loop. Non-blocking.
func (f *CoinbaseFeed) Start(initial []string) {
	for _, s := range initial {
		f.subscribed[s] = true
	}
	go f.run()
}

// Stop gracefully stops feed.
func (f *CoinbaseFeed) Stop() {
	f.cancel()
	f.mu.Lock()
	if f.conn != nil {
		_ = f.conn.Close()
	}
	f.mu.Unlock()
}

// EnsureSymbol subscribes if not already.
func (f *CoinbaseFeed) EnsureSymbol(symbol string) error {
	f.mu.Lock()
	if f.subscribed[symbol] {
		f.mu.Unlock()
		return nil
	}
	f.subscribed[symbol] = true
	c := f.conn
	f.mu.Unlock()
	if c != nil {
		sub := coinbaseSub{Type: "subscribe", Channels: []interface{}{map[string]interface{}{"name": "ticker", "product_ids": []string{symbol}}}}
		return c.WriteJSON(sub)
	}
	return nil
}

// RemoveSymbol unsubscribes if present.
func (f *CoinbaseFeed) RemoveSymbol(symbol string) error {
	f.mu.Lock()
	if !f.subscribed[symbol] {
		f.mu.Unlock()
		return nil
	}
	delete(f.subscribed, symbol)
	c := f.conn
	f.mu.Unlock()
	if c != nil {
		unsub := coinbaseSub{Type: "unsubscribe", Channels: []interface{}{map[string]interface{}{"name": "ticker", "product_ids": []string{symbol}}}}
		return c.WriteJSON(unsub)
	}
	return nil
}

func (f *CoinbaseFeed) run() {
	backoff := time.Second
	for {
		if err := f.connectAndServe(); err != nil {
			if errors.Is(err, context.Canceled) || f.ctx.Err() != nil {
				return
			}
			log.Printf("[marketdata] feed error: %v (reconnecting in %s)", err, backoff)
			select {
			case <-time.After(backoff):
			case <-f.ctx.Done():
				return
			}
			if backoff < 30*time.Second {
				backoff *= 2
			}
			continue
		}
		return
	}
}

func (f *CoinbaseFeed) connectAndServe() error {
	u := url.URL{Scheme: "wss", Host: "ws-feed.exchange.coinbase.com"}
	c, _, err := websocket.DefaultDialer.Dial(u.String(), nil)
	if err != nil {
		return err
	}
	f.mu.Lock()
	f.conn = c
	subs := make([]string, 0, len(f.subscribed))
	for s := range f.subscribed {
		subs = append(subs, s)
	}
	f.mu.Unlock()
	// initial subscribe
	if len(subs) > 0 {
		initSub := coinbaseSub{Type: "subscribe", Channels: []interface{}{map[string]interface{}{"name": "ticker", "product_ids": subs}}}
		if err := c.WriteJSON(initSub); err != nil {
			return err
		}
	}
	c.SetReadLimit(1 << 20)
	c.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.SetPongHandler(func(string) error { c.SetReadDeadline(time.Now().Add(60 * time.Second)); return nil })
	pingTicker := time.NewTicker(30 * time.Second)
	defer pingTicker.Stop()
	defer c.Close()
	for {
		select {
		case <-f.ctx.Done():
			return context.Canceled
		case <-pingTicker.C:
			_ = c.WriteControl(websocket.PingMessage, []byte("ping"), time.Now().Add(5*time.Second))
		default:
			c.SetReadDeadline(time.Now().Add(60 * time.Second))
			_, msg, err := c.ReadMessage()
			if err != nil {
				return err
			}
			var tk coinbaseTicker
			if err := json.Unmarshal(msg, &tk); err != nil {
				continue
			}
			if tk.Type != "ticker" || tk.Price == "" {
				continue
			}
			var p float64
			if err := json.Unmarshal([]byte(tk.Price), &p); err != nil {
				continue
			}
			if f.onPrice != nil {
				f.onPrice(tk.ProductID, p)
			}
			f.bus.Publish(Event{Type: EventPriceTick, Data: PriceTick{Symbol: tk.ProductID, Price: p, Ts: time.Now()}})
		}
	}
}
