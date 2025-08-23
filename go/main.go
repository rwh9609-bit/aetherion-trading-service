package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	pb "github.com/rwh9609-bit/multilanguage/go/gen"
	"google.golang.org/grpc"
	"google.golang.org/grpc/keepalive"
	"google.golang.org/grpc/reflection"
	"google.golang.org/protobuf/types/known/timestamppb"
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

// Define a struct to unmarshal the JSON response from Coinbase
type CoinbasePriceResponse struct {
	Data struct {
		Amount string `json:"amount"`
	}
}

// --- BotServiceServer implementation ---
type botServiceServer struct {
	pb.BotServiceServer
	reg      *botRegistry
	dbclient *DBService
}

func newBotServiceServer(reg *botRegistry, dbclient *DBService) *botServiceServer {
	log.Printf("Creating BotServiceServer with registry at %s", reg.path)
	return &botServiceServer{reg: reg, dbclient: dbclient}
}

func (s *botServiceServer) CreateBot(ctx context.Context, req *pb.CreateBotRequest) (*pb.StatusResponse, error) {
	log.Printf("[CreateBot] Handler entered")
	if req.GetName() == "" || len(req.GetSymbols()) == 0 || req.GetStrategyName() == "" {
		return &pb.StatusResponse{Success: false, Message: "name, symbols, strategy_name required"}, nil
	}
	userID, ok := ctx.Value("user_id").(string)
	if !ok || userID == "" {
		return &pb.StatusResponse{Success: false, Message: "auth required"}, nil
	}
	id := uuid.New().String()
	now := timestamppb.Now()
	bot := &pb.Bot{
		Id:                  id,
		UserId:              userID,
		Name:                req.GetName(),
		Description:         req.GetDescription(),
		Symbols:             req.GetSymbols(),
		StrategyName:        req.GetStrategyName(),
		StrategyParameters:  req.GetStrategyParameters(),
		InitialAccountValue: req.GetInitialAccountValue(),
		CurrentAccountValue: req.GetInitialAccountValue(),
		IsActive:            false,
		IsLive:              req.GetIsLive(),
		CreatedAt:           now,
		UpdatedAt:           now,
	}
	// Persist to DB
	if s.dbclient != nil {
		_, err := s.dbclient.CreateBot(ctx, bot)
		if err != nil {
			log.Printf("[CreateBot] Error adding bot to database: %v", err)
			return &pb.StatusResponse{Success: false, Message: err.Error()}, nil
		}
	}
	// Add to registry (in-memory)
	s.reg.mu.Lock()
	s.reg.bots[id] = bot
	s.reg.mu.Unlock()
	s.reg.persist()
	return &pb.StatusResponse{Success: true, Message: "bot created", Id: id}, nil
}

// Function to fetch price from Coinbase REST API
// httpGet is a package-level variable to allow test overrides
var HttpGet = http.Get

func GetCoinbasePrice(symbol string) (float64, error) {
	// Coinbase uses symbol format like BTC-USD
	url := fmt.Sprintf("https://api.coinbase.com/v2/prices/%s/spot", symbol)
	resp, err := HttpGet(url)
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
	log.Printf("Fetched price for %s: %.2f", symbol, price)
	return price, nil
}

func (s *Strategy) Run(ctx context.Context) {
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
			price, err := GetCoinbasePrice(s.Symbol)
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

type histPoint struct {
	ts    time.Time
	price float64
}

func main() {
	cfg, err := loadConfig()
	if err != nil {
		panic(err)
	}
	// Structured logger setup
	zerolog.TimeFieldFormat = time.RFC3339Nano
	level, err := zerolog.ParseLevel(cfg.LogLevel)
	if err != nil {
		level = zerolog.InfoLevel
	}
	zerolog.SetGlobalLevel(level)
	log.Info().Str("env", cfg.Env).Str("log_level", level.String()).Msg("starting service")

	secret := cfg.AuthSecret
	if secret == "" && cfg.Env != "production" {
		b := make([]byte, 32)
		if _, err := rand.Read(b); err == nil {
			secret = hex.EncodeToString(b)
			log.Warn().Msg("generated ephemeral dev AUTH_SECRET")
		} else {
			log.Fatal().Err(err).Msg("generate dev secret")
		}
	}
	if len(secret) < 32 {
		log.Fatal().Msg("AUTH_SECRET must be >=32 chars")
	}
	prevSecret := cfg.AuthPreviousSecret
	if prevSecret != "" && len(prevSecret) < 32 {
		log.Warn().Msg("AUTH_PREVIOUS_SECRET length <32")
	}
	// Create a gRPC server with custom options
	grpcServer := grpc.NewServer(
		grpc.KeepaliveParams(keepalive.ServerParameters{
			MaxConnectionIdle: 5 * time.Minute,
			Time:              20 * time.Second,
			Timeout:           1 * time.Second,
		}),
		grpc.UnaryInterceptor(chainUnary(
			authUnaryInterceptor([]byte(secret)),
			timeoutUnary(cfg.RequestTimeout),
		)),
	)

	// Initialize DBService
	dbService, err := NewDBService(cfg.PostgresDSN)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to initialize DBService")
	}

	// Bot service (in-memory)
	reg := newBotRegistry()
	botSvc := newBotServiceServer(reg, dbService)
	pb.RegisterBotServiceServer(grpcServer, botSvc)

	// Auth service
	authSvc := newAuthServer(secret)
	pb.RegisterAuthServiceServer(grpcServer, authSvc)

	reflection.Register(grpcServer) // Register reflection service for gRPC CLI tools

	// Market data feed (dynamic)
	feedSymbols := append([]string{}, cfg.DefaultSymbols...)
	log.Info().Strs("symbols", feedSymbols).Msg("initializing market data feed")

	// Lightweight HTTP health endpoint (separate listener) for container health checks
	go func(addr string) {
		mux := http.NewServeMux()
		mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte("ok"))
		})
		srv := &http.Server{Addr: addr, Handler: mux}
		if err := srv.ListenAndServe(); err != nil {
			log.Warn().Err(err).Msg("health server exited")
		}
	}(cfg.HTTPHealthAddr)

	// Start gRPC server with graceful shutdown
	lis, err := net.Listen("tcp", cfg.GRPCListenAddr)
	if err != nil {
		log.Fatal().Err(err).Str("addr", cfg.GRPCListenAddr).Msg("listen failed")
	}

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
		if err != nil {
			log.Error().Err(err).Msg("gRPC server error")
		}
	}

	// Graceful stop
	grpcServer.GracefulStop()
	log.Info().Msg("gRPC server stopped")
}
