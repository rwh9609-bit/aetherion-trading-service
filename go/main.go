package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net"
	"net/http"
	"strconv"
	"sync"
	"time"
	"os"
	"os/signal"
	"syscall"

	"google.golang.org/grpc/keepalive"

	"container/heap"

	pb "aetherion-trading-service/gen"

	"github.com/google/uuid"
	"google.golang.org/grpc"
)

// PriceLevel is defined in orderbook.go

// OrderBookSide is defined in orderbook.go

func (h OrderBookSide) Len() int           { return len(h) }
func (h OrderBookSide) Less(i, j int) bool { return h[i].Price < h[j].Price }
func (h OrderBookSide) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }

func (h *OrderBookSide) Push(x interface{}) {
	*h = append(*h, x.(PriceLevel))
}

func (h *OrderBookSide) Pop() interface{} {
	old := *h
	n := len(old)
	x := old[n-1]
	*h = old[0 : n-1]
	return x
}

// OrderBookManager is defined in orderbook.go

func (ob *OrderBookManager) AddBid(price, size float64) {
	ob.mu.Lock()
	defer ob.mu.Unlock()
	heap.Push(ob.bids, PriceLevel{Price: price, Size: size})
}

func (ob *OrderBookManager) AddAsk(price, size float64) {
	ob.mu.Lock()
	defer ob.mu.Unlock()
	heap.Push(ob.asks, PriceLevel{Price: price, Size: size})
}

func (ob *OrderBookManager) GetTopLevels(numLevels int) ([]*pb.OrderBookEntry, []*pb.OrderBookEntry) {
	ob.mu.RLock()
	defer ob.mu.RUnlock()

	bids := make([]*pb.OrderBookEntry, 0, numLevels)
	asks := make([]*pb.OrderBookEntry, 0, numLevels)

	// Get top bids
	for i := 0; i < numLevels && i < len(*ob.bids); i++ {
		bid := (*ob.bids)[i]
		bids = append(bids, &pb.OrderBookEntry{
			Price: bid.Price,
			Size:  bid.Size,
		})
	}

	// Get top asks
	for i := 0; i < numLevels && i < len(*ob.asks); i++ {
		ask := (*ob.asks)[i]
		asks = append(asks, &pb.OrderBookEntry{
			Price: ask.Price,
			Size:  ask.Size,
		})
	}

	return bids, asks
}

// Define a struct to unmarshal the JSON response from Coinbase
type CoinbasePriceResponse struct {
	Data struct {
		Amount string `json:"amount"`
	}
}

// Function to fetch price from Coinbase REST API
// httpGet is a package-level variable to allow test overrides
var httpGet = http.Get

func getCoinbasePrice(symbol string) (float64, error) {
	// Coinbase uses symbol format like BTC-USD
	url := fmt.Sprintf("https://api.coinbase.com/v2/prices/%s/spot", symbol)
	resp, err := httpGet(url)
	if err != nil {
		return 0, fmt.Errorf("failed to fetch price from Coinbase: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := ioutil.ReadAll(resp.Body)
		return 0, fmt.Errorf("coinbase API returned non-OK status: %d, body: %s", resp.StatusCode, string(bodyBytes))
	}

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return 0, fmt.Errorf("failed to read Coinbase API response body: %w", err)
	}

	var priceResponse CoinbasePriceResponse
	err = json.Unmarshal(body, &priceResponse)
	if err != nil {
		return 0, fmt.Errorf("failed to unmarshal Coinbase API response: %w", err)
	}

	price, err := strconv.ParseFloat(priceResponse.Data.Amount, 64)
	if err != nil {
		return 0, fmt.Errorf("failed to parse price string to float: %w", err)
	}

	return price, nil
}

// OrderBook represents a market's order book
type OrderBook struct {
	Bids []OrderBookEntry
	Asks []OrderBookEntry
}

// OrderBookEntry represents a single order in the book
type OrderBookEntry struct {
	Price float64
	Size  float64
}

// Strategy represents an active trading strategy
type Strategy struct {
	ID           string
	Symbol       string
	StrategyType string
	Parameters   map[string]string
	IsActive     bool
	CreatedAt    time.Time
	mu           sync.Mutex
}

func (s *Strategy) Run(ctx context.Context, server *tradingServer) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Initialize strategy-specific parameters
	threshold, _ := strconv.ParseFloat(s.Parameters["threshold"], 64)
	period, _ := strconv.Atoi(s.Parameters["period"])

	// Create a ticker for the specified period
	ticker := time.NewTicker(time.Duration(period) * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			s.IsActive = false
			return
		case <-ticker.C:
			if !s.IsActive {
				return
			}

			// Get current price from your price source
			price, err := getCoinbasePrice(s.Symbol)
			if err != nil {
				log.Printf("Error getting price for %s: %v", s.Symbol, err)
				continue
			}

			// Implement strategy logic here based on StrategyType
			switch s.StrategyType {
			case "MEAN_REVERSION":
				// Example mean reversion logic
				// You would typically calculate moving average here
				// and compare with current price
				log.Printf("Running mean reversion strategy for %s at price %.2f (threshold: %.2f)", s.Symbol, price, threshold)
			case "MOMENTUM":
				// Implement momentum strategy logic
				log.Printf("Running momentum strategy for %s at price %.2f", s.Symbol, price)
			default:
				log.Printf("Unknown strategy type: %s", s.StrategyType)
			}
		}
	}
}

// server implements the TradingService
type tradingServer struct {
	pb.UnimplementedTradingServiceServer
	orderBooks    map[string]*OrderBookManager // symbol -> order book
	portfolios    map[string]*pb.Portfolio     // account -> portfolio
	activeSymbols map[string]bool              // currently tracked symbols
	strategies    map[string]*Strategy         // active strategies
	mu            sync.RWMutex                 // protects concurrent access
	eventBus     *EventBus
	lastPrices   map[string]float64
	priceMu      sync.RWMutex
	feed         *CoinbaseFeed // market data feed controller (injected)
}

func newTradingServer() *tradingServer {
	return &tradingServer{
		orderBooks:    make(map[string]*OrderBookManager),
		portfolios:    make(map[string]*pb.Portfolio),
		activeSymbols: make(map[string]bool),
		strategies:    make(map[string]*Strategy),
		eventBus:     NewEventBus(),
		lastPrices:   make(map[string]float64),
	}
}


// GetPrice returns the current price for a symbol
func (s *tradingServer) GetPrice(ctx context.Context, req *pb.Tick) (*pb.Tick, error) {
	// Use cached websocket price if present
	s.priceMu.RLock()
	price, ok := s.lastPrices[req.Symbol]
	s.priceMu.RUnlock()
	if !ok {
		p, err := getCoinbasePrice(req.Symbol)
		if err != nil {
			return nil, fmt.Errorf("failed to get price: %w", err)
		}
		price = p
		s.priceMu.Lock(); s.lastPrices[req.Symbol] = price; s.priceMu.Unlock()
	}
	return &pb.Tick{Symbol: req.Symbol, Price: price, TimestampNs: time.Now().UnixNano()}, nil
}

// StartStrategy is a standard RPC call
func (s *tradingServer) StartStrategy(ctx context.Context, req *pb.StrategyRequest) (*pb.StatusResponse, error) {
	// Create a new strategy instance
	strategy := &Strategy{
		ID:           uuid.New().String(),
		Symbol:       req.Symbol,
		StrategyType: req.Parameters["type"],
		Parameters:   req.Parameters,
		IsActive:     true,
		CreatedAt:    time.Now(),
	}

	// Store the strategy in the server's strategies map
	s.mu.Lock()
	s.strategies[strategy.ID] = strategy
	s.mu.Unlock()

	// Start strategy-specific processing in a goroutine
	go func() {
		strategy.Run(ctx, s)
	}()

	return &pb.StatusResponse{
		Success: true,
		Message: fmt.Sprintf("Strategy started with ID: %s", strategy.ID),
	}, nil
}

// StopStrategy stops a running strategy
func (s *tradingServer) StopStrategy(ctx context.Context, req *pb.StrategyRequest) (*pb.StatusResponse, error) {
	fmt.Printf("[Go Server] Stopping strategy %s for %s\n", req.StrategyId, req.Symbol)

	s.mu.Lock()
	delete(s.activeSymbols, req.Symbol)
	s.mu.Unlock()

	return &pb.StatusResponse{Success: true, Message: "Strategy stopped"}, nil
}

// GetPortfolio returns the current portfolio status
func (s *tradingServer) GetPortfolio(ctx context.Context, req *pb.PortfolioRequest) (*pb.Portfolio, error) {
	s.mu.RLock()
	portfolio, exists := s.portfolios[req.AccountId]
	s.mu.RUnlock()

	if !exists {
		// Create a new portfolio with some mock data
		portfolio = &pb.Portfolio{
			Positions: map[string]float64{
				"BTC": 1.5,
				"USD": 50000.0,
			},
			TotalValueUsd: 100000.0,
		}
		s.mu.Lock()
		s.portfolios[req.AccountId] = portfolio
		s.mu.Unlock()
	}

	return portfolio, nil
}

// StreamOrderBook streams order book updates
func (s *tradingServer) StreamOrderBook(req *pb.OrderBookRequest, stream pb.TradingService_StreamOrderBookServer) error {
	symbol := req.Symbol

	s.mu.Lock()
	if _, exists := s.orderBooks[symbol]; !exists {
		s.orderBooks[symbol] = NewOrderBookManager()
	}
	manager := s.orderBooks[symbol]
	s.mu.Unlock()

	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-stream.Context().Done():
			return nil
		case <-ticker.C:
			// Get the current price to simulate order book around it
			price, err := getCoinbasePrice(symbol)
			if err != nil {
				log.Printf("Error getting price for %s: %v", symbol, err)
				continue
			}

			// Simulate some orders around the current price
			manager.AddBid(price-10, 1.2)
			manager.AddBid(price-20, 2.5)
			manager.AddBid(price-30, 3.0)
			manager.AddAsk(price+10, 1.0)
			manager.AddAsk(price+20, 2.0)
			manager.AddAsk(price+30, 1.5)

			bids, asks := manager.GetTopLevels(10)

			// Convert to protobuf message
			orderBook := &pb.OrderBook{
				Symbol: symbol,
				Bids:   make([]*pb.OrderBookEntry, len(bids)),
				Asks:   make([]*pb.OrderBookEntry, len(asks)),
			}

			for i, bid := range bids {
				orderBook.Bids[i] = &pb.OrderBookEntry{
					Price: bid.Price,
					Size:  bid.Size,
				}
			}

			for i, ask := range asks {
				orderBook.Asks[i] = &pb.OrderBookEntry{
					Price: ask.Price,
					Size:  ask.Size,
				}
			}

			if err := stream.Send(orderBook); err != nil {
				return err
			}
		}
	}
}

// SubscribeTicks is a server-streaming RPC
func (s *tradingServer) SubscribeTicks(req *pb.StrategyRequest, stream pb.TradingService_SubscribeTicksServer) error {
	fmt.Printf("[Go Server] Client subscribed to ticks for %s\n", req.Symbol)
	// In a real app, this would connect to an exchange feed.
	// Here, we fetch real price from Coinbase.
	for {
		// Coinbase uses symbol format like BTC-USD
		coinbaseSymbol := req.Symbol

		price, err := getCoinbasePrice(coinbaseSymbol)
		if err != nil {
			log.Printf("Error fetching price for %s: %v", coinbaseSymbol, err)
			time.Sleep(1 * time.Second) // Wait before retrying
			continue
		}

		tick := &pb.Tick{
			Symbol:      req.Symbol,
			Price:       price, // Use the fetched real price
			TimestampNs: time.Now().UnixNano(),
		}
		if err := stream.Send(tick); err != nil {
			return err
		}
		time.Sleep(100 * time.Millisecond) // Send ticks every 100ms
	}
}

// StreamPrice streams cached websocket-derived ticks via internal event bus (low latency)
func (s *tradingServer) StreamPrice(req *pb.TickStreamRequest, stream pb.TradingService_StreamPriceServer) error {
	// Immediate send of last known price if we have it
	if req.Symbol != "" {
		s.priceMu.RLock(); p, ok := s.lastPrices[req.Symbol]; s.priceMu.RUnlock()
		if ok {
			_ = stream.Send(&pb.Tick{Symbol: req.Symbol, Price: p, TimestampNs: time.Now().UnixNano()})
		}
	}
	id, ch := s.eventBus.Subscribe(256)
	defer s.eventBus.Unsubscribe(id)
	for {
		select {
		case <-stream.Context().Done():
			return nil
		case evt := <-ch:
			if evt.Type != EventPriceTick { continue }
			tick := evt.Data.(PriceTick)
			if req.Symbol != "" && tick.Symbol != req.Symbol { continue }
			if err := stream.Send(&pb.Tick{Symbol: tick.Symbol, Price: tick.Price, TimestampNs: tick.Ts.UnixNano()}); err != nil {
				return err
			}
		}
	}
}

// AddSymbol adds a symbol to the dynamic websocket feed
func (s *tradingServer) AddSymbol(ctx context.Context, req *pb.SymbolRequest) (*pb.StatusResponse, error) {
	sym := req.Symbol
	if sym == "" { return &pb.StatusResponse{Success:false, Message:"symbol required"}, nil }
	if s.feed == nil { return &pb.StatusResponse{Success:false, Message:"feed not initialized"}, nil }
	if err := s.feed.EnsureSymbol(sym); err != nil {
		return &pb.StatusResponse{Success:false, Message: err.Error()}, nil
	}
	return &pb.StatusResponse{Success:true, Message: "symbol added"}, nil
}

// RemoveSymbol removes a symbol from the dynamic websocket feed
func (s *tradingServer) RemoveSymbol(ctx context.Context, req *pb.SymbolRequest) (*pb.StatusResponse, error) {
	sym := req.Symbol
	if sym == "" { return &pb.StatusResponse{Success:false, Message:"symbol required"}, nil }
	if s.feed == nil { return &pb.StatusResponse{Success:false, Message:"feed not initialized"}, nil }
	if err := s.feed.RemoveSymbol(sym); err != nil {
		return &pb.StatusResponse{Success:false, Message: err.Error()}, nil
	}
	return &pb.StatusResponse{Success:true, Message: "symbol removed"}, nil
}

// ListSymbols returns current subscribed symbols (from feed internal state)
func (s *tradingServer) ListSymbols(ctx context.Context, _ *pb.Empty) (*pb.SymbolList, error) {
	if s.feed == nil { return &pb.SymbolList{Symbols: []string{}}, nil }
	s.feed.mu.Lock(); symbols := make([]string,0,len(s.feed.subscribed)); for sym := range s.feed.subscribed { symbols = append(symbols, sym) }; s.feed.mu.Unlock()
	return &pb.SymbolList{Symbols: symbols}, nil
}

func main() {
	// Enable debug logging
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	// Load auth secret from environment (export AUTH_SECRET=your-secret)
	secret := os.Getenv("AUTH_SECRET")
	if secret == "" {
		secret = "dev-insecure-default"
		log.Println("WARNING: AUTH_SECRET not set; using insecure default secret. Do NOT use in production.")
	}
	// Create a gRPC server with custom options
	grpcServer := grpc.NewServer(
		grpc.KeepaliveParams(keepalive.ServerParameters{
			MaxConnectionIdle: 5 * time.Minute,
			Time:              20 * time.Second,
			Timeout:           1 * time.Second,
		}),
		grpc.UnaryInterceptor(authUnaryInterceptor([]byte(secret))),
	)

	// Create and register our trading service
	tradingService := newTradingServer()
	pb.RegisterTradingServiceServer(grpcServer, tradingService)

	// Market data feed (dynamic)
	feedSymbols := []string{"BTC-USD", "ETH-USD", "SOL-USD"}
	feed := NewCoinbaseFeed(tradingService.eventBus, func(sym string, price float64) {
		tradingService.priceMu.Lock(); tradingService.lastPrices[sym] = price; tradingService.priceMu.Unlock()
	})
	feed.Start(feedSymbols)
	log.Printf("Market data feed controller started for symbols: %v", feedSymbols)
	tradingService.feed = feed

	// Auth service
	authSvc := newAuthServer(secret)
	pb.RegisterAuthServiceServer(grpcServer, authSvc)

	// Start gRPC server with graceful shutdown
	lis, err := net.Listen("tcp", "0.0.0.0:50051")
	if err != nil { log.Fatalf("Failed to listen on :50051: %v", err) }

	stopCh := make(chan os.Signal, 1)
	signal.Notify(stopCh, syscall.SIGINT, syscall.SIGTERM)

	serverErrCh := make(chan error, 1)
	go func() {
		log.Printf("Starting gRPC server on :50051...")
		serverErrCh <- grpcServer.Serve(lis)
	}()

	select {
	case sig := <-stopCh:
		log.Printf("Received signal %v: initiating graceful shutdown", sig)
	case err := <-serverErrCh:
		if err != nil { log.Printf("gRPC server error: %v", err) }
	}

	// Graceful stop
	feed.Stop()
	log.Println("Market data feed stopped")
	grpcServer.GracefulStop()
	log.Println("gRPC server stopped")
}
