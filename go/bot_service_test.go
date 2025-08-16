package main

import (
    "context"
    "os"
    "testing"
    pb "github.com/rwh9609-bit/aetherion/gen"
)

// TestBotServiceLifecycle validates create -> list -> start -> stop and persistence reload.
func TestBotServiceLifecycle(t *testing.T) {
    // ensure clean registry file
    _ = os.Remove("data/bots.json")
    reg := newBotRegistry()
    trading := newTradingServer()
    svc := newBotServiceServer(reg, trading)

    // Create bot
    resp, err := svc.CreateBot(context.Background(), &pb.CreateBotRequest{Name: "bot1", Symbol: "BTC-USD", Strategy: "MEAN_REVERSION", Parameters: map[string]string{"threshold":"1.0"}})
    if err != nil || !resp.Success || resp.Id == "" { t.Fatalf("create bot failed: resp=%v err=%v", resp, err) }

    // List should contain it
    list, err := svc.ListBots(context.Background(), &pb.Empty{})
    if err != nil || len(list.Bots) != 1 { t.Fatalf("expected 1 bot listed, got %v err=%v", list, err) }
    id := list.Bots[0].Id

    // Start bot -> should mark active and assign strategy_id parameter
    startResp, err := svc.StartBot(context.Background(), &pb.BotIdRequest{Id: id})
    if err != nil || !startResp.Success { t.Fatalf("start bot failed: %v %v", startResp, err) }
    st, _ := svc.GetBotStatus(context.Background(), &pb.BotIdRequest{Id: id})
    if !st.Active { t.Fatalf("expected bot active after start") }
    if st.Parameters["strategy_id"] == "" { t.Fatalf("expected strategy_id parameter set") }

    // Stop bot
    stopResp, err := svc.StopBot(context.Background(), &pb.BotIdRequest{Id: id})
    if err != nil || !stopResp.Success { t.Fatalf("stop bot failed: %v %v", stopResp, err) }
    st2, _ := svc.GetBotStatus(context.Background(), &pb.BotIdRequest{Id: id})
    if st2.Active { t.Fatalf("expected bot inactive after stop") }

    // Force persistence reload by creating new registry
    reg2 := newBotRegistry()
    if len(reg2.bots) != 1 { t.Fatalf("expected persisted bot in new registry, got %d", len(reg2.bots)) }
}

// TestBotServiceValidation ensures missing fields rejected.
func TestBotServiceValidation(t *testing.T) {
    reg := newBotRegistry()
    trading := newTradingServer()
    svc := newBotServiceServer(reg, trading)
    resp, _ := svc.CreateBot(context.Background(), &pb.CreateBotRequest{Name: "", Symbol: "BTC-USD", Strategy: "MOMENTUM"})
    if resp.Success { t.Fatalf("expected failure when name missing") }
    resp, _ = svc.CreateBot(context.Background(), &pb.CreateBotRequest{Name: "bot", Symbol: "", Strategy: "MOMENTUM"})
    if resp.Success { t.Fatalf("expected failure when symbol missing") }
    resp, _ = svc.CreateBot(context.Background(), &pb.CreateBotRequest{Name: "bot", Symbol: "BTC-USD", Strategy: ""})
    if resp.Success { t.Fatalf("expected failure when strategy missing") }
}
