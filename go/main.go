package main

import (
	"context"
	"encoding/json" // New import for JSON parsing
	"fmt"
	"io/ioutil"     // New import for reading response body
	"log"
	"net"
	"net/http"      // New import for HTTP requests
	"strconv"       // New import for string conversion
	"time"

	pb "aetherion-trading-service/gen/protos" // Import the generated protobuf package

	"google.golang.org/grpc"
)

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
		return 0, fmt.Errorf("Coinbase API returned non-OK status: %d, body: %s", resp.StatusCode, string(bodyBytes))
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
