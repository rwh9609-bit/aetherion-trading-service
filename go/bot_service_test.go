package main

import (
	"context"
	"log"
	"net"
	"testing"

	pb "aetherion/gen"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/test/bufconn"
)

const bufSize = 1024 * 1024

var lis *bufconn.Listener

func setupTestServer(t *testing.T) *botServiceServer {
	lis = bufconn.Listen(bufSize)
	s := grpc.NewServer()
	reg := newBotRegistry()
	// For this test, we don't need a real trading server or db client
	botServer := newBotServiceServer(reg, nil, nil)
	pb.RegisterBotServiceServer(s, botServer)
	go func() {
		if err := s.Serve(lis); err != nil {
			log.Fatalf("Server exited with error: %v", err)
		}
	}()
	t.Cleanup(func() { s.GracefulStop() })
	return botServer
}

func TestStreamBotStatus(t *testing.T) {
	botServer := setupTestServer(t)

	ctx := context.Background()
	conn, err := grpc.DialContext(ctx, "bufnet", grpc.WithContextDialer(func(context.Context, string) (net.Conn, error) {
		return lis.Dial()
	}), grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		t.Fatalf("Failed to dial bufnet: %v", err)
	}
	defer conn.Close()

	client := pb.NewBotServiceClient(conn)

	// 1. Create a bot to test with
	botID := "test-bot-stream"
	botServer.reg.mu.Lock()
	botServer.reg.bots[botID] = &pb.Bot{
		BotId:    botID,
		Name:     "TestStreamBot",
		IsActive: true,
		State:    map[string]string{"last_signal": "hold"},
	}
	botServer.reg.mu.Unlock()

	// 2. Start the stream
	stream, err := client.StreamBotStatus(ctx, &pb.BotIdRequest{BotId: botID})
	if err != nil {
		t.Fatalf("StreamBotStatus failed: %v", err)
	}
	defer stream.CloseSend()
}

func TestCreateBot(t *testing.T) {
	botServer := setupTestServer(t)

	ctx := context.Background()
	conn, err := grpc.DialContext(ctx, "bufnet", grpc.WithContextDialer(func(context.Context, string) (net.Conn, error) {
		return lis.Dial()
	}), grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		t.Fatalf("Failed to dial bufnet: %v", err)
	}
	defer conn.Close()

	client := pb.NewBotServiceClient(conn)

	// Set user_id as gRPC metadata
	md := metadata.Pairs("user_id", "d46681e9-a3b5-4cb8-ad47-963af6fc2a04")
	ctx = metadata.NewOutgoingContext(ctx, md)

	req := &pb.CreateBotRequest{
		Name:         "CreateBotTest",
		Symbol:       "BTCUSD",
		Strategy:     "mean_reversion",
		Parameters:   map[string]string{"foo": "bar"},
		AccountValue: 12345.67,
	}
	resp, err := client.CreateBot(ctx, req)
	if err != nil {
		t.Fatalf("CreateBot failed: %v", err)
	}
	if !resp.Success {
		t.Errorf("Expected success, got %v", resp.Message)
		log.Printf("CreateBot response: %+v", resp)
	}
	if resp.Id == "" {
		t.Errorf("Expected bot ID to be set")
	}

	// Verify bot is in registry
	botServer.reg.mu.RLock()
	bot, ok := botServer.reg.bots[resp.Id]
	botServer.reg.mu.RUnlock()
	if !ok {
		t.Errorf("Bot not found in registry after creation")
	}
	if bot.Name != "CreateBotTest" {
		t.Errorf("Expected bot name 'CreateBotTest', got %s", bot.Name)
	}
	if bot.Parameters["foo"] != "bar" {
		t.Errorf("Expected parameter 'foo' to be 'bar', got %s", bot.Parameters["foo"])
	}
}

func TestUpdateBotState(t *testing.T) {
	botServer := setupTestServer(t)

	ctx := context.Background()
	conn, err := grpc.DialContext(ctx, "bufnet", grpc.WithContextDialer(func(context.Context, string) (net.Conn, error) {
		return lis.Dial()
	}), grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		t.Fatalf("Failed to dial bufnet: %v", err)
	}
	defer conn.Close()

	client := pb.NewBotServiceClient(conn)

	// Create a bot
	botID := "test-update-state"
	botServer.reg.mu.Lock()
	botServer.reg.bots[botID] = &pb.Bot{
		BotId:    botID,
		Name:     "UpdateStateBot",
		IsActive: true,
		State:    map[string]string{"last_signal": "hold"},
	}
	botServer.reg.mu.Unlock()

	// Update state
	newState := map[string]string{"last_signal": "buy", "score": "42"}
	resp, err := client.UpdateBotState(ctx, &pb.UpdateBotStateRequest{
		BotId: botID,
		State: newState,
	})
	if err != nil {
		t.Fatalf("UpdateBotState failed: %v", err)
	}
	if !resp.Success {
		t.Errorf("Expected success, got %v", resp.Message)
	}

	// Verify state updated
	botServer.reg.mu.RLock()
	bot := botServer.reg.bots[botID]
	botServer.reg.mu.RUnlock()
	if bot.State["last_signal"] != "buy" {
		t.Errorf("Expected last_signal 'buy', got %s", bot.State["last_signal"])
	}
	if bot.State["score"] != "42" {
		t.Errorf("Expected score '42', got %s", bot.State["score"])
	}
}

func TestListBotsMultiple(t *testing.T) {
	botServer := setupTestServer(t)

	ctx := context.Background()
	conn, err := grpc.DialContext(ctx, "bufnet", grpc.WithContextDialer(func(context.Context, string) (net.Conn, error) {
		return lis.Dial()
	}), grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		t.Fatalf("Failed to dial bufnet: %v", err)
	}
	defer conn.Close()

	client := pb.NewBotServiceClient(conn)

	// Add bots
	botServer.reg.mu.Lock()
	botServer.reg.bots["botA"] = &pb.Bot{BotId: "botA", Name: "Alpha", IsActive: true}
	botServer.reg.bots["botB"] = &pb.Bot{BotId: "botB", Name: "Beta", IsActive: false}
	botServer.reg.mu.Unlock()

	resp, err := client.ListBots(ctx, &pb.Empty{})
	if err != nil {
		t.Fatalf("ListBots failed: %v", err)
	}
	if len(resp.Bots) != 2 {
		t.Errorf("Expected 2 bots, got %d", len(resp.Bots))
		// Name the bots in a log
		for _, b := range resp.Bots {
			t.Logf("Bot found: %s", b.Name)
		}
	}
	names := map[string]bool{}
	for _, b := range resp.Bots {
		names[b.Name] = true
	}
	if !names["Alpha"] || !names["Beta"] {
		t.Errorf("Expected bots 'Alpha' and 'Beta' in list")
	}
}
