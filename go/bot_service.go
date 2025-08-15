package main

import (
    "context"
    "sync"
    "time"
    "github.com/google/uuid"
    pb "aetherion-trading-service/gen"
    "encoding/json"
    "os"
    "path/filepath"
    "log"
)

type botRegistry struct {
    mu sync.RWMutex
    bots map[string]*pb.BotConfig
    path string
}

func newBotRegistry() *botRegistry {
    dir := "data"
    _ = os.MkdirAll(dir, 0o755)
    path := filepath.Join(dir, "bots.json")
    r := &botRegistry{bots: make(map[string]*pb.BotConfig), path: path}
    r.load()
    return r
}

func (r *botRegistry) load() {
    b, err := os.ReadFile(r.path)
    if err != nil { return }
    var arr []*pb.BotConfig
    if err := json.Unmarshal(b, &arr); err != nil { log.Printf("bot registry load error: %v", err); return }
    r.mu.Lock(); defer r.mu.Unlock()
    for _, bot := range arr { r.bots[bot.Id] = bot }
}

func (r *botRegistry) persist() {
    r.mu.RLock(); defer r.mu.RUnlock()
    arr := make([]*pb.BotConfig, 0, len(r.bots))
    for _, b := range r.bots { arr = append(arr, b) }
    data, err := json.MarshalIndent(arr, "", "  ")
    if err != nil { log.Printf("bot registry marshal err: %v", err); return }
    if err := os.WriteFile(r.path, data, 0o644); err != nil { log.Printf("bot registry write err: %v", err) }
}

// BotServiceServer implementation
type botServiceServer struct {
    pb.UnimplementedBotServiceServer
    reg *botRegistry
    trading *tradingServer
}

func newBotServiceServer(reg *botRegistry, trading *tradingServer) *botServiceServer { return &botServiceServer{reg: reg, trading: trading} }

func (s *botServiceServer) CreateBot(ctx context.Context, req *pb.CreateBotRequest) (*pb.StatusResponse, error) {
    if req.GetName() == "" || req.GetSymbol() == "" || req.GetStrategy() == "" {
        return &pb.StatusResponse{Success:false, Message:"name, symbol, strategy required"}, nil
    }
    id := uuid.New().String()
    bot := &pb.BotConfig{Id:id, Name:req.GetName(), Symbol:req.GetSymbol(), Strategy:req.GetStrategy(), Parameters:req.GetParameters(), Active:false, CreatedAtUnix: time.Now().Unix()}
    s.reg.mu.Lock(); s.reg.bots[id] = bot; s.reg.mu.Unlock(); s.reg.persist()
    return &pb.StatusResponse{Success:true, Message:"bot created", Id:id}, nil
}

func (s *botServiceServer) ListBots(ctx context.Context, _ *pb.Empty) (*pb.BotList, error) {
    out := &pb.BotList{}
    s.reg.mu.RLock(); for _, b := range s.reg.bots { out.Bots = append(out.Bots, b) }; s.reg.mu.RUnlock()
    return out, nil
}

func (s *botServiceServer) StartBot(ctx context.Context, req *pb.BotIdRequest) (*pb.StatusResponse, error) {
    s.reg.mu.Lock(); bot, ok := s.reg.bots[req.GetId()]; s.reg.mu.Unlock()
    if !ok { return &pb.StatusResponse{Success:false, Message:"not found"}, nil }
    // Kick off strategy via trading server
    stratReq := &pb.StrategyRequest{Symbol: bot.Symbol, Parameters: map[string]string{"type": bot.Strategy}}
    resp, err := s.trading.StartStrategy(ctx, stratReq)
    if err != nil { return &pb.StatusResponse{Success:false, Message: err.Error()}, nil }
    s.reg.mu.Lock(); bot.Active = true; bot.Parameters["strategy_id"] = resp.Id; s.reg.mu.Unlock(); s.reg.persist()
    return &pb.StatusResponse{Success:true, Message:"bot started", Id:bot.Id}, nil
}

func (s *botServiceServer) StopBot(ctx context.Context, req *pb.BotIdRequest) (*pb.StatusResponse, error) {
    s.reg.mu.Lock(); bot, ok := s.reg.bots[req.GetId()]; s.reg.mu.Unlock()
    if !ok { return &pb.StatusResponse{Success:false, Message:"not found"}, nil }
    // Attempt to stop strategy if we stored its id
    if sid, ok2 := bot.Parameters["strategy_id"]; ok2 {
        _, _ = s.trading.StopStrategy(ctx, &pb.StrategyRequest{StrategyId: sid, Symbol: bot.Symbol})
    }
    s.reg.mu.Lock(); bot.Active = false; s.reg.mu.Unlock(); s.reg.persist()
    return &pb.StatusResponse{Success:true, Message:"bot stopped", Id:bot.Id}, nil
}

func (s *botServiceServer) GetBotStatus(ctx context.Context, req *pb.BotIdRequest) (*pb.BotConfig, error) {
    s.reg.mu.RLock(); bot, ok := s.reg.bots[req.GetId()]; s.reg.mu.RUnlock()
    if !ok { return &pb.BotConfig{}, nil }
    return bot, nil
}
