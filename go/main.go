package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net"
	"net/http"
	"strconv"
	"sync"
	"time"
	"os"
	"os/signal"
	"syscall"
	"math"
	"crypto/rand"
	"encoding/hex"
	"container/heap"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"google.golang.org/grpc"
	"google.golang.org/grpc/keepalive"
	"github.com/google/uuid"
	pb "github.com/rwh9609-bit/aetherion/gen"
)

// timeoutUnary enforces a per-request timeout if parent has none.
func timeoutUnary(d time.Duration) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		if _, hasDeadline := ctx.Deadline(); !hasDeadline && d > 0 {
			var cancel context.CancelFunc
			ctx, cancel = context.WithTimeout(ctx, d)
			defer cancel()
		}
		return handler(ctx, req)
	}
}

// chainUnary composes multiple unary interceptors into a single interceptor.
func chainUnary(interceptors ...grpc.UnaryServerInterceptor) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		// Build the chain in reverse
		wrapped := handler
		for i := len(interceptors) - 1; i >= 0; i-- {
			current := interceptors[i]
			next := wrapped
			wrapped = func(c context.Context, r interface{}) (interface{}, error) {
				return current(c, r, info, next)
			}
		}
		return wrapped(ctx, req)
	}
}

// PriceLevel & OrderBookSide definitions are in orderbook.go, but we reassert interface methods here
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
	if period <= 0 {
		period = 5 // sane fallback to avoid zero/negative panic
	}

	// Create a ticker for the specified period (validated >0)
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
	// in-memory price history for momentum metrics: symbol -> slice of (ts, price)
	histMu       sync.RWMutex
	priceHist    map[string][]histPoint
}

type histPoint struct {
	ts time.Time
	price float64
}

func newTradingServer() *tradingServer {
	return &tradingServer{
		orderBooks:    make(map[string]*OrderBookManager),
		portfolios:    make(map[string]*pb.Portfolio),
		activeSymbols: make(map[string]bool),
		strategies:    make(map[string]*Strategy),
		eventBus:     NewEventBus(),
		lastPrices:   make(map[string]float64),
	priceHist:    make(map[string][]histPoint),
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
		Id: strategy.ID,
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

// --- Bot Management RPCs ---

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
			// record into history for momentum metrics
			s.histMu.Lock()
			hp := histPoint{ts: tick.Ts, price: tick.Price}
			arr := append(s.priceHist[tick.Symbol], hp)
			// drop entries older than 6 minutes to bound memory
			cutoff := time.Now().Add(-6 * time.Minute)
			idx := 0
			for i:=len(arr)-1; i>=0; i-- { if arr[i].ts.Before(cutoff) { idx = i+1; break } }
			if idx > 0 { arr = arr[idx:] }
			s.priceHist[tick.Symbol] = arr
			s.histMu.Unlock()
		}
	}
}

// GetMomentum aggregates short-term momentum metrics server-side similar to frontend scanner
func (s *tradingServer) GetMomentum(ctx context.Context, req *pb.MomentumRequest) (*pb.MomentumResponse, error) {
	// determine symbol set
	symbols := req.GetSymbols()
	if len(symbols) == 0 {
		s.priceMu.RLock(); for sym := range s.lastPrices { symbols = append(symbols, sym) }; s.priceMu.RUnlock()
	}
	now := time.Now()
	oneMin := now.Add(-1 * time.Minute)
	fiveMin := now.Add(-5 * time.Minute)
	result := &pb.MomentumResponse{GeneratedAtUnixMs: now.UnixMilli()}
	s.histMu.RLock(); defer s.histMu.RUnlock()
	for _, sym := range symbols {
		hist := s.priceHist[sym]
		if len(hist) < 2 { continue }
		var price5mSet bool
		var price5m, price1m, last float64
		var have1m bool
		var logRets []float64
		prev := hist[0].price
		for _, pt := range hist {
			if !price5mSet && !pt.ts.Before(fiveMin) { price5m = pt.price; price5mSet = true }
			if !have1m && !pt.ts.Before(oneMin) { price1m = pt.price; have1m = true }
			if pt.price > 0 && prev > 0 { logRets = append(logRets, math.Log(pt.price/prev)) }
			prev = pt.price
			last = pt.price
		}
		if !price5mSet { price5m = hist[0].price }
		if !have1m { price1m = price5m }
		if price5m == 0 || price1m == 0 { continue }
		pct1m := ((last - price1m)/price1m) * 100
		pct5m := ((last - price5m)/price5m) * 100
		if len(logRets) < 2 { continue }
		mean := 0.0; for _, v := range logRets { mean += v }; mean /= float64(len(logRets))
		varVar := 0.0; for _, v := range logRets { d := v - mean; varVar += d * d }; varVar /= float64(len(logRets))
		vol := math.Sqrt(varVar) * math.Sqrt( (60*60*24) / (5*60) )
		score := pct1m * 0.7 + pct5m * 0.3 - (vol*100)*0.5
		result.Metrics = append(result.Metrics, &pb.MomentumMetric{Symbol: sym, LastPrice: last, PctChange_1M: pct1m, PctChange_5M: pct5m, Volatility: vol, MomentumScore: score})
	}
	// simple sort descending by score
	if len(result.Metrics) > 1 {
		// insertion sort (few symbols typical)
		for i:=1;i<len(result.Metrics);i++ { j:=i; for j>0 && result.Metrics[j-1].MomentumScore < result.Metrics[j].MomentumScore { result.Metrics[j-1], result.Metrics[j] = result.Metrics[j], result.Metrics[j-1]; j-- } }
	}
	return result, nil
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

// Add to tradingServer methods
func (s *tradingServer) ExecuteTrade(ctx context.Context, req *pb.TradeRequest) (*pb.TradeResponse, error) {
    // Basic validation
    if req.Symbol == "" || req.Size <= 0 {
        return &pb.TradeResponse{Accepted: false, Message: "invalid trade parameters"}, nil
    }
    side := req.Side
    if side != "BUY" && side != "SELL" {
        return &pb.TradeResponse{Accepted: false, Message: "side must be BUY or SELL"}, nil
    }
    // Get reference price (use provided price if >0 else fetch current)
    execPrice := req.Price
    if execPrice <= 0 {
        tick, err := s.GetPrice(ctx, &pb.Tick{Symbol: req.Symbol})
        if err != nil {
            return &pb.TradeResponse{Accepted: false, Message: "price unavailable"}, nil
        }
        execPrice = tick.Price
    }

    accountID := "default"
    s.mu.Lock()
    portfolio, exists := s.portfolios[accountID]
    if !exists {
        portfolio = &pb.Portfolio{Positions: map[string]float64{"USD": 100000}}
        s.portfolios[accountID] = portfolio
    }
    // Initialize symbol position if absent
    if _, ok := portfolio.Positions[req.Symbol]; !ok {
        portfolio.Positions[req.Symbol] = 0
    }
    // Simple cash/position update (no fees, slippage)
    qty := req.Size
    notional := qty * execPrice
    if side == "BUY" {
        // Ensure sufficient USD
        if portfolio.Positions["USD"] < notional {
            s.mu.Unlock()
            return &pb.TradeResponse{Accepted: false, Message: "insufficient USD balance"}, nil
        }
        portfolio.Positions[req.Symbol] += qty
        portfolio.Positions["USD"] -= notional
    } else { // SELL
        if portfolio.Positions[req.Symbol] < qty {
            s.mu.Unlock()
            return &pb.TradeResponse{Accepted: false, Message: "insufficient position"}, nil
        }
        portfolio.Positions[req.Symbol] -= qty
        portfolio.Positions["USD"] += notional
    }
    s.mu.Unlock()

    // PnL simplified: positive for SELL, negative for BUY relative to notional (placeholder)
    pnl := 0.0
    if side == "SELL" {
        pnl = notional * 0.0 // placeholder for realized PnL tracking
    }

    return &pb.TradeResponse{Accepted: true, Message: "executed", ExecutedPrice: execPrice, Pnl: pnl}, nil
}

func main() {
	cfg, err := loadConfig()
	if err != nil { panic(err) }
	// Structured logger setup
	zerolog.TimeFieldFormat = time.RFC3339Nano
	level, err := zerolog.ParseLevel(cfg.LogLevel)
	if err != nil { level = zerolog.InfoLevel }
	zerolog.SetGlobalLevel(level)
	log.Info().Str("env", cfg.Env).Str("log_level", level.String()).Msg("starting service")

	secret := cfg.AuthSecret
	if secret == "" && cfg.Env != "production" {
		b := make([]byte, 32)
		if _, err := rand.Read(b); err == nil { secret = hex.EncodeToString(b); log.Warn().Msg("generated ephemeral dev AUTH_SECRET") } else { log.Fatal().Err(err).Msg("generate dev secret") }
	}
	if len(secret) < 32 { log.Fatal().Msg("AUTH_SECRET must be >=32 chars") }
	prevSecret := cfg.AuthPreviousSecret
	if prevSecret != "" && len(prevSecret) < 32 { log.Warn().Msg("AUTH_PREVIOUS_SECRET length <32") }
	// Create a gRPC server with custom options
	grpcServer := grpc.NewServer(
		grpc.KeepaliveParams(keepalive.ServerParameters{
			MaxConnectionIdle: 5 * time.Minute,
			Time:              20 * time.Second,
			Timeout:           1 * time.Second,
		}),
		grpc.UnaryInterceptor(chainUnary(
			authUnaryInterceptorWithFallback([]byte(secret), []byte(prevSecret)),
			timeoutUnary(cfg.RequestTimeout),
		)),
	)

	// Create and register our trading service
	tradingService := newTradingServer()
	pb.RegisterTradingServiceServer(grpcServer, tradingService)

	// Bot service (in-memory)
	reg := newBotRegistry()
	botSvc := newBotServiceServer(reg, tradingService)
	pb.RegisterBotServiceServer(grpcServer, botSvc)

	// Market data feed (dynamic)
	feedSymbols := append([]string{}, cfg.DefaultSymbols...)
	feed := NewCoinbaseFeed(tradingService.eventBus, func(sym string, price float64) {
		tradingService.priceMu.Lock(); tradingService.lastPrices[sym] = price; tradingService.priceMu.Unlock()
		// record history for momentum metrics (store recent <=6m)
		tradingService.histMu.Lock()
		arr := append(tradingService.priceHist[sym], histPoint{ts: time.Now(), price: price})
		cutoff := time.Now().Add(-6 * time.Minute)
		idx := 0
		for i:=len(arr)-1; i>=0; i-- { if arr[i].ts.Before(cutoff) { idx = i+1; break } }
		if idx > 0 { arr = arr[idx:] }
		tradingService.priceHist[sym] = arr
		tradingService.histMu.Unlock()
	})
	feed.Start(feedSymbols)
	log.Info().Strs("symbols", feedSymbols).Msg("market data feed started")
	tradingService.feed = feed

	// Auth service
	authSvc := newAuthServer(secret)
	pb.RegisterAuthServiceServer(grpcServer, authSvc)

	// Lightweight HTTP health endpoint (separate listener) for container health checks
	go func(addr string) {
		mux := http.NewServeMux()
		mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK); _, _ = w.Write([]byte("ok")) })
		srv := &http.Server{Addr: addr, Handler: mux}
		if err := srv.ListenAndServe(); err != nil { log.Warn().Err(err).Msg("health server exited") }
	}(cfg.HTTPHealthAddr)

	// Start gRPC server with graceful shutdown
	lis, err := net.Listen("tcp", cfg.GRPCListenAddr)
	if err != nil { log.Fatal().Err(err).Str("addr", cfg.GRPCListenAddr).Msg("listen failed") }

	stopCh := make(chan os.Signal, 1)
	signal.Notify(stopCh, syscall.SIGINT, syscall.SIGTERM)

	serverErrCh := make(chan error, 1)
	go func() {
		log.Info().Str("addr", cfg.GRPCListenAddr).Msg("gRPC server starting")
		serverErrCh <- grpcServer.Serve(lis)
	}()

	select {
	case sig := <-stopCh:
		log.Info().Str("signal", sig.String()).Msg("shutdown signal received")
	case err := <-serverErrCh:
		if err != nil { log.Error().Err(err).Msg("gRPC server error") }
	}

	// Graceful stop
	feed.Stop()
	log.Info().Msg("market data feed stopped")
	grpcServer.GracefulStop()
	log.Info().Msg("gRPC server stopped")
}
