package main

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"

	pb "github.com/rwh9609-bit/multilanguage/go/gen"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type botRegistry struct {
	mu   sync.RWMutex
	bots map[string]*pb.Bot
	path string
	pg   *pgx.Conn
}

func newBotRegistry() *botRegistry {
	r := &botRegistry{bots: make(map[string]*pb.Bot)}
	dsn := os.Getenv("POSTGRES_DSN")
	if dsn != "" {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		conn, err := pgx.Connect(ctx, dsn)
		if err == nil {
			log.Printf("bot registry postgres connect ok")
			_, err2 := conn.Exec(ctx, `CREATE TABLE IF NOT EXISTS bots (
				id TEXT PRIMARY KEY,
				user_id TEXT NOT NULL,
				name TEXT NOT NULL,
				symbol TEXT NOT NULL,
				strategy TEXT NOT NULL,
				parameters JSONB NOT NULL,
				is_active BOOLEAN DEFAULT TRUE,
				created_at TIMESTAMPTZ DEFAULT now(),
				updated_at TIMESTAMPTZ DEFAULT now(),
				account_value NUMERIC(20, 8) DEFAULT 1000008
            )`)
			if err2 == nil {
				log.Printf("bot pg table created")
				r.pg = conn
				r.loadFromPg(ctx)
				return r
			} else {
				log.Printf("bot pg table err: %v", err2)
			}
		} else {
			log.Printf("bot registry postgres connect failed: %v", err)
		}
	} else {
		log.Printf("bot registry postgres dsn not set, using file storage")
	}
	dir := "data"
	_ = os.MkdirAll(dir, 0o755)
	r.path = filepath.Join(dir, "bots.json")
	r.loadFromFile()
	return r
}

func (r *botRegistry) loadFromPg(ctx context.Context) {
	rows, err := r.pg.Query(ctx, `SELECT id, user_id, name, symbol, strategy, parameters, is_active, extract(epoch from created_at)::bigint FROM bots`)
	if err != nil {
		log.Printf("bot load pg err: %v", err)
		return
	}
	log.Printf("bot load pg ok")
	defer rows.Close()
	for rows.Next() {
		var id, userID, name, symbol, strategy string
		var paramsBytes []byte
		var active bool
		var created int64
		if err := rows.Scan(&id, &userID, &name, &symbol, &strategy, &paramsBytes, &active, &created); err != nil {
			log.Printf("bot load pg scan err: %v", err)
			continue
		}
		m := map[string]string{}
		_ = json.Unmarshal(paramsBytes, &m)
		// Need to get real UserId for this.
		// This is what actually sets bot's account value. Initially it seems to be docker compose.
		r.bots[id] = &pb.Bot{BotId: id, Name: name, Symbol: symbol, Strategy: strategy, Parameters: m, IsActive: active, UserId: userID, CreatedAtUnixMs: created, AccountValue: 1000007}
	}
}

func (r *botRegistry) loadFromFile() {
	b, err := os.ReadFile(r.path)
	if err != nil {
		return
	}
	var arr []*pb.Bot
	if err := json.Unmarshal(b, &arr); err != nil {
		log.Printf("bot registry load error: %v", err)
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, bot := range arr {
		r.bots[bot.BotId] = bot
	}
}

// BotServiceServer implementation
type botServiceServer struct {
	pb.BotServiceServer
	reg      *botRegistry
	trading  *tradingServer
	dbclient *DBService
}

func newBotServiceServer(reg *botRegistry, trading *tradingServer, dbclient *DBService) *botServiceServer {
	log.Printf("Creating BotServiceServer with registry at %s", reg.path)
	return &botServiceServer{reg: reg, trading: trading, dbclient: dbclient}
}
func (s *botServiceServer) DeleteBot(ctx context.Context, req *pb.BotIdRequest) (*pb.StatusResponse, error) {
	log.Printf("[DeleteBot] Received request for bot ID: %s", req.GetBotId())
	s.reg.mu.Lock()
	defer s.reg.mu.Unlock()
	bot, ok := s.reg.bots[req.GetBotId()]
	if !ok {
		log.Printf("[DeleteBot] Bot with ID %s not found", req.GetBotId())
		return &pb.StatusResponse{Success: false, Message: "not found"}, nil
	}
	// Delete from database if dbclient is available
	if s.dbclient != nil {
		if err := s.dbclient.DeleteBot(ctx, req.GetBotId()); err != nil {
			log.Printf("[DeleteBot] Failed to delete bot from DB: %v", err)
			return &pb.StatusResponse{Success: false, Message: "db delete failed"}, nil
		}
	}
	delete(s.reg.bots, req.GetBotId())
	log.Printf("[DeleteBot] Bot %s deleted", bot.Name)
	return &pb.StatusResponse{Success: true, Message: "bot deleted"}, nil
}

func (s *botServiceServer) CreateBot(ctx context.Context, req *pb.CreateBotRequest) (*pb.StatusResponse, error) {
	if req.GetName() == "" {
		return &pb.StatusResponse{Success: false, Message: "name, symbol, strategy required"}, nil
	}

	// Generate a new bot ID
	id := uuid.New().String()

	// Extract user ID from context (set by auth interceptor)
	userID, ok := ctx.Value("user_id").(string)
	if !ok || userID == "" {
		log.Printf("[CreateBot] user_id missing from context")
		return &pb.StatusResponse{Success: false, Message: "auth required"}, nil
	}

	// Validate userID is a UUID
	if _, err := uuid.Parse(userID); err != nil {
		log.Printf("[CreateBot] user_id is not a valid UUID: %s", userID)
		return &pb.StatusResponse{Success: false, Message: "user_id must be a valid UUID"}, nil
	}

	// Set default parameters if not provided
	params := req.GetParameters()
	if params == nil {
		params = map[string]string{}
	}

	// Add entry to the database. If there's no Symbol or Strategy, set them to NULL.
	if s.dbclient != nil {
		_, err := s.dbclient.CreateBot(ctx, &pb.Bot{
			BotId:           id,
			UserId:          userID,
			Name:            req.GetName(),
			Symbol:          req.GetSymbol(),
			Strategy:        req.GetStrategy(),
			Parameters:      params,
			IsActive:        false,
			CreatedAtUnixMs: time.Now().UnixMilli(),
			AccountValue:    1000006,
		})
		log.Printf("[CreateBot] Added bot to database with ID: %s", id)
		if err != nil {
			log.Printf("[CreateBot] Error adding bot to database: %v", err)
			return &pb.StatusResponse{Success: false, Message: err.Error()}, nil
		}
	}

	// Create bot entry in registry
	bot := &pb.Bot{BotId: id, Name: req.GetName(), Symbol: req.GetSymbol(), Strategy: req.GetStrategy(), Parameters: params, IsActive: false}

	// Add bot to registry
	s.reg.mu.Lock()
	s.reg.bots[id] = bot
	s.reg.mu.Unlock()

	// Return success response
	return &pb.StatusResponse{Success: true, Message: "bot created", Id: id}, nil
}

func (s *botServiceServer) ListBots(ctx context.Context, _ *pb.Empty) (*pb.BotList, error) {
	log.Printf("[ListBots] Received request to list bots")
	out := &pb.BotList{}
	s.reg.mu.RLock()
	for _, b := range s.reg.bots {
		out.Bots = append(out.Bots, b)
	}
	s.reg.mu.RUnlock()
	return out, nil
}

func (s *botServiceServer) StartBot(ctx context.Context, req *pb.BotIdRequest) (*pb.StatusResponse, error) {
	log.Printf("[StartBot] Received request for bot ID: %s", req.GetBotId())
	s.reg.mu.Lock()
	bot, ok := s.reg.bots[req.GetBotId()]
	s.reg.mu.Unlock()
	if !ok {
		log.Printf("[StartBot] Bot with ID %s not found", req.GetBotId())
		return &pb.StatusResponse{Success: false, Message: "not found"}, nil
	}
	log.Printf("[StartBot] Bot %s found. Current IsActive: %t", bot.Name, bot.IsActive)

	// Kick off strategy via trading server
	stratReq := &pb.StrategyRequest{Symbol: bot.Symbol, Parameters: map[string]string{"type": bot.Strategy, "user_id": bot.BotId}} // Pass bot.BotId as user_id
	resp, err := s.trading.StartStrategy(ctx, stratReq)
	if err != nil {
		log.Printf("[StartBot] Error starting strategy for bot %s: %v", bot.Name, err)
		return &pb.StatusResponse{Success: false, Message: err.Error()}, nil
	}
	log.Printf("[StartBot] Strategy started for bot %s. Strategy ID: %s", bot.Name, resp.Id)

	s.reg.mu.Lock()
	bot.IsActive = true
	bot.Parameters["strategy_id"] = resp.Id
	s.reg.mu.Unlock()

	return &pb.StatusResponse{Success: true, Message: "bot started", Id: bot.BotId}, nil
}

func (s *botServiceServer) StopBot(ctx context.Context, req *pb.BotIdRequest) (*pb.StatusResponse, error) {
	s.reg.mu.Lock()
	bot, ok := s.reg.bots[req.GetBotId()]
	s.reg.mu.Unlock()
	if !ok {
		return &pb.StatusResponse{Success: false, Message: "not found"}, nil
	}
	// Attempt to stop strategy if we stored its id
	if sid, ok2 := bot.Parameters["strategy_id"]; ok2 {
		_, _ = s.trading.StopStrategy(ctx, &pb.StrategyRequest{StrategyId: sid, Symbol: bot.Symbol})
	}
	s.reg.mu.Lock()
	bot.IsActive = false
	s.reg.mu.Unlock()

	return &pb.StatusResponse{Success: true, Message: "bot stopped", Id: bot.BotId}, nil
}

func (s *botServiceServer) GetBotStatus(ctx context.Context, req *pb.BotIdRequest) (*pb.Bot, error) {
	s.reg.mu.RLock()
	bot, ok := s.reg.bots[req.GetBotId()]
	s.reg.mu.RUnlock()
	if !ok {
		return &pb.Bot{}, nil
	}
	return bot, nil
}
