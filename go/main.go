package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"strconv"
	"sync"
	"time"

	"google.golang.org/grpc/keepalive"

	pb "aetherion-trading-service/gen/protos"
	"container/heap"

	"github.com/google/uuid"
	"github.com/improbable-eng/grpc-web/go/grpcweb"
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
func getCoinbasePrice(symbol string) (float64, error) {
	// Coinbase uses symbol format like BTC-USD
	url := fmt.Sprintf("https://api.coinbase.com/v2/prices/%s/spot", symbol)
	resp, err := http.Get(url)
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
}

func newTradingServer() *tradingServer {
	return &tradingServer{
		orderBooks:    make(map[string]*OrderBookManager),
		portfolios:    make(map[string]*pb.Portfolio),
		activeSymbols: make(map[string]bool),
		strategies:    make(map[string]*Strategy),
	}
}

// GetPrice returns the current price for a symbol
func (s *tradingServer) GetPrice(ctx context.Context, req *pb.Tick) (*pb.Tick, error) {
	price, err := getCoinbasePrice(req.Symbol)
	if err != nil {
		return nil, fmt.Errorf("failed to get price: %w", err)
	}

	return &pb.Tick{
		Symbol:      req.Symbol,
		Price:       price,
		TimestampNs: time.Now().UnixNano(),
	}, nil
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

func main() {
	// Enable debug logging
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	// Create a gRPC server with custom options
	grpcServer := grpc.NewServer(
		grpc.KeepaliveParams(keepalive.ServerParameters{
			MaxConnectionIdle: 5 * time.Minute,
			Time:              20 * time.Second,
			Timeout:           1 * time.Second,
		}),
	)

	// Create and register our trading service
	tradingService := newTradingServer()
	pb.RegisterTradingServiceServer(grpcServer, tradingService)

	// Create a gRPC-Web wrapper around the gRPC server
	wrappedGrpc := grpcweb.WrapServer(grpcServer,
		grpcweb.WithOriginFunc(func(origin string) bool {
			// Allow requests from the React frontend
			return origin == "http://localhost:3000" || origin == "http://localhost:3001"
		}),
		grpcweb.WithAllowedRequestHeaders([]string{
			"X-User-Agent",
			"X-Grpc-Web",
			"Content-Type",
			"Content-Length",
			"Accept",
			"Accept-Encoding",
			"X-CSRF-Token",
			"Authorization",
		}),
		grpcweb.WithWebsockets(true),
		grpcweb.WithWebsocketOriginFunc(func(r *http.Request) bool {
			return true
		}),
		grpcweb.WithCorsForRegisteredEndpointsOnly(false),
	)

	// Create an HTTP mux for handling both gRPC and gRPC-Web
	mux := http.NewServeMux()

	// Handle gRPC and gRPC-Web requests
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Enable CORS for all requests
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, X-User-Agent, X-Grpc-Web")
		w.Header().Set("Access-Control-Expose-Headers", "grpc-status, grpc-message, grpc-encoding, grpc-accept-encoding")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		if wrappedGrpc.IsGrpcWebRequest(r) || wrappedGrpc.IsAcceptableGrpcCorsRequest(r) {
			wrappedGrpc.ServeHTTP(w, r)
			return
		}

		// Handle health check
		if r.URL.Path == "/health" {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("healthy"))
			return
		}

		http.NotFound(w, r)
	})

	// Start HTTP server with gRPC-Web support
	log.Printf("Starting server on :8080...")
	if err := http.ListenAndServe(":8080", mux); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
