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
	"google.golang.org/protobuf/types/known/timestamppb"

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
				description TEXT,
				symbols TEXT[] NOT NULL,
				strategy_name TEXT NOT NULL,
				strategy_parameters JSONB NOT NULL,
				initial_account_value NUMERIC(20, 8) DEFAULT 100000,
				current_account_value NUMERIC(20, 8) DEFAULT 100000,
				is_active BOOLEAN DEFAULT TRUE,
				is_live BOOLEAN DEFAULT FALSE,
				created_at TIMESTAMPTZ DEFAULT now(),
				updated_at TIMESTAMPTZ DEFAULT now()
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
	rows, err := r.pg.Query(ctx, `SELECT id, user_id, name, description, symbols, strategy_name, strategy_parameters, initial_account_value, current_account_value, is_active, is_live, extract(epoch from created_at)::bigint, extract(epoch from updated_at)::bigint FROM bots`)
	if err != nil {
		log.Printf("bot load pg err: %v", err)
		return
	}
	defer rows.Close()
	for rows.Next() {
		var id, userID, name, description, strategyName, strategyParameters string
		var symbols []string
		var initialAccountValue, currentAccountValue float64
		var isActive, isLive bool
		var created, updated int64
		if err := rows.Scan(&id, &userID, &name, &description, &symbols, &strategyName, &strategyParameters, &initialAccountValue, &currentAccountValue, &isActive, &isLive, &created, &updated); err != nil {
			log.Printf("bot load pg scan err: %v", err)
			continue
		}
		r.bots[id] = &pb.Bot{
			Id:                  id,
			UserId:              userID,
			Name:                name,
			Description:         description,
			Symbols:             symbols,
			StrategyName:        strategyName,
			StrategyParameters:  strategyParameters,
			InitialAccountValue: &pb.DecimalValue{Units: int64(initialAccountValue), Nanos: int32((initialAccountValue - float64(int64(initialAccountValue))) * 1e9)},
			CurrentAccountValue: &pb.DecimalValue{Units: int64(currentAccountValue), Nanos: int32((currentAccountValue - float64(int64(currentAccountValue))) * 1e9)},
			IsActive:            isActive,
			IsLive:              isLive,
			CreatedAt:           timestamppb.New(time.Unix(created, 0)),
			UpdatedAt:           timestamppb.New(time.Unix(updated, 0)),
		}
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
		r.bots[bot.Id] = bot
	}
}

func (r *botRegistry) persist() {
	if r.pg != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		for _, b := range r.bots {
			paramsJSON := b.StrategyParameters
			created := b.CreatedAt.AsTime().Unix()
			updated := time.Now().Unix()
			_, err := r.pg.Exec(ctx, `INSERT INTO bots (id, user_id, name, description, symbols, strategy_name, strategy_parameters, initial_account_value, current_account_value, is_active, is_live, created_at, updated_at)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,to_timestamp($12),to_timestamp($13))
                ON CONFLICT (id) DO UPDATE SET
                    name=EXCLUDED.name,
                    description=EXCLUDED.description,
                    symbols=EXCLUDED.symbols,
                    strategy_name=EXCLUDED.strategy_name,
                    strategy_parameters=EXCLUDED.strategy_parameters,
                    initial_account_value=EXCLUDED.initial_account_value,
                    current_account_value=EXCLUDED.current_account_value,
                    is_active=EXCLUDED.is_active,
                    is_live=EXCLUDED.is_live,
                    updated_at=EXCLUDED.updated_at`,
				b.Id, b.UserId, b.Name, b.Description, b.Symbols, b.StrategyName, paramsJSON,
				decimalToFloat(b.InitialAccountValue), decimalToFloat(b.CurrentAccountValue),
				b.IsActive, b.IsLive, created, updated)
			if err != nil {
				log.Printf("bot upsert err: %v", err)
			}
		}
		return
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	arr := make([]*pb.Bot, 0, len(r.bots))
	for _, b := range r.bots {
		arr = append(arr, b)
	}
	data, err := json.MarshalIndent(arr, "", "  ")
	if err != nil {
		log.Printf("bot registry marshal err: %v", err)
		return
	}
	if err := os.WriteFile(r.path, data, 0o644); err != nil {
		log.Printf("bot registry write err: %v", err)
	}
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
	s.reg.persist()
	log.Printf("[DeleteBot] Bot %s deleted", bot.Name)
	return &pb.StatusResponse{Success: true, Message: "bot deleted"}, nil
}

func (s *botServiceServer) ListBots(ctx context.Context, req *pb.ListBotsRequest) (*pb.BotList, error) {
	userID := req.GetUserId()
	out := &pb.BotList{}
	s.reg.mu.RLock()
	for _, b := range s.reg.bots {
		if b.UserId == userID {
			out.Bots = append(out.Bots, b)
		}
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

	s.reg.mu.Lock()
	bot.IsActive = true
	s.reg.mu.Unlock()
	log.Printf("[StartBot] Bot %s IsActive set to true. Persisting...", bot.Name)
	s.reg.persist()
	log.Printf("[StartBot] Bot %s persisted. New IsActive: %t", bot.Name, bot.IsActive)

	return &pb.StatusResponse{Success: true, Message: "bot started", Id: bot.Id}, nil
}

func (s *botServiceServer) StopBot(ctx context.Context, req *pb.BotIdRequest) (*pb.StatusResponse, error) {
	s.reg.mu.Lock()
	bot, ok := s.reg.bots[req.GetBotId()]
	s.reg.mu.Unlock()
	if !ok {
		return &pb.StatusResponse{Success: false, Message: "not found"}, nil
	}
	s.reg.mu.Lock()
	bot.IsActive = false
	s.reg.mu.Unlock()
	s.reg.persist()
	return &pb.StatusResponse{Success: true, Message: "bot stopped", Id: bot.Id}, nil
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
