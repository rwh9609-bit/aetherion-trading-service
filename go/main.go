package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"time"

	pb "github.com/xeratooth/aetherion-trading-service/gen/protos" // Import the generated protobuf package
	"google.golang.org/grpc"
)

// server implements the TradingService
type tradingServer struct {
	pb.UnimplementedTradingServiceServer
}

// StartStrategy is a standard RPC call
func (s *tradingServer) StartStrategy(ctx context.Context, req *pb.StrategyRequest) (*pb.StatusResponse, error) {
	fmt.Printf("[Go Server] Received StartStrategy for %s on %s\n", req.StrategyId, req.Symbol)
	// ... logic to start the strategy ...
	return &pb.StatusResponse{Success: true, Message: "Strategy started"}, nil
}

// SubscribeTicks is a server-streaming RPC
func (s *tradingServer) SubscribeTicks(req *pb.StrategyRequest, stream pb.TradingService_SubscribeTicksServer) error {
	fmt.Printf("[Go Server] Client subscribed to ticks for %s\n", req.Symbol)
	// In a real app, this would connect to an exchange feed.
	// Here, we just simulate a stream of ticks.
	for {
		tick := &pb.Tick{
			Symbol:      req.Symbol,
			Price:       50000.0 + float64(time.Now().Nanosecond()%1000)/100.0,
			TimestampNs: time.Now().UnixNano(),
		}
		if err := stream.Send(tick); err != nil {
			return err
		}
		time.Sleep(100 * time.Millisecond)
	}
}

func main() {
	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("failed to start listener: %v", err)
	}
	s := grpc.NewServer()
	pb.RegisterTradingServiceServer(s, &tradingServer{})
	log.Printf("Go gRPC server listening at %v", lis.Addr())
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}
