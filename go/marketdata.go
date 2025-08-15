package main

import (
    "context"
    "encoding/json"
    "log"
    "sync"
    "time"
    "net/url"
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

func startCoinbaseTicker(ctx context.Context, bus *EventBus, symbols []string, onPrice func(sym string, price float64)) {
    // TODO: Support dynamic add/remove of symbols; currently requires restart with new symbol slice
    go func() {
        // Reconnect loop
        for {
            if err := runOnce(ctx, bus, symbols, onPrice); err != nil {
                log.Printf("[marketdata] feed error: %v (reconnecting in 3s)", err)
                select {
                case <-time.After(3 * time.Second):
                case <-ctx.Done():
                    return
                }
            } else {
                return // normal exit
            }
        }
    }()
}

func runOnce(ctx context.Context, bus *EventBus, symbols []string, onPrice func(sym string, price float64)) error {
    u := url.URL{Scheme: "wss", Host: "ws-feed.exchange.coinbase.com"}
    c, _, err := websocket.DefaultDialer.Dial(u.String(), nil)
    if err != nil { return err }
    defer c.Close()

    // Build subscription object
    channels := []interface{}{map[string]interface{}{"name": "ticker", "product_ids": symbols}}
    sub := coinbaseSub{Type: "subscribe", Channels: channels}
    if err := c.WriteJSON(sub); err != nil { return err }

    c.SetReadLimit(1 << 20)
    c.SetReadDeadline(time.Now().Add(60 * time.Second))
    c.SetPongHandler(func(string) error { c.SetReadDeadline(time.Now().Add(60 * time.Second)); return nil })

    pingTicker := time.NewTicker(30 * time.Second)
    defer pingTicker.Stop()

    for {
        select {
        case <-ctx.Done():
            return nil
        case <-pingTicker.C:
            _ = c.WriteControl(websocket.PingMessage, []byte("ping"), time.Now().Add(5*time.Second))
        default:
            c.SetReadDeadline(time.Now().Add(60 * time.Second))
            _, msg, err := c.ReadMessage()
            if err != nil { return err }
            var tk coinbaseTicker
            if err := json.Unmarshal(msg, &tk); err != nil { continue }
            if tk.Type != "ticker" || tk.Price == "" { continue }
            // Parse price
            var p float64
            if err := json.Unmarshal([]byte(tk.Price), &p); err != nil { continue }
            onPrice(tk.ProductID, p)
            bus.Publish(Event{Type: EventPriceTick, Data: PriceTick{Symbol: tk.ProductID, Price: p, Ts: time.Now()}})
        }
    }
}
