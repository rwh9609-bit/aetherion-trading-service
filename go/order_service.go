package main

import (
	"context"
	"sync"
	"time"

	pb "aetherion/gen"

	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/google/uuid"
)

type OrderServiceServer struct {
	pb.OrderServiceServer
	mu       sync.RWMutex
	dbclient *DBService
}

func newOrderServiceServer(dbclient *DBService) *OrderServiceServer {
	return &OrderServiceServer{dbclient: dbclient}
}

func (s *OrderServiceServer) CreateOrder(ctx context.Context, req *pb.CreateOrderRequest) (*pb.Order, error) {
	return &pb.Order{
		Id:                uuid.New().String(),
		BotId:             req.BotId,
		Symbol:            req.Symbol,
		Side:              req.Side,
		Type:              req.Type,
		Status:            pb.OrderStatus_NEW,
		QuantityRequested: req.Quantity,
		QuantityFilled:    &pb.DecimalValue{Units: 0, Nanos: 0}, // Initialize to zero filled
		LimitPrice:        req.LimitPrice,
		StopPrice:         req.StopPrice,
		CreatedAt: &timestamppb.Timestamp{
			Seconds: time.Now().Unix(),
			Nanos:   int32(time.Now().Nanosecond()), // Corrected to use timestamppb.Timestamp
		},
		UpdatedAt: &timestamppb.Timestamp{
			Seconds: time.Now().Unix(),
			Nanos:   int32(time.Now().Nanosecond()),
		},
		Trades: []*pb.Trade{},
	}, nil

	// Store in db

}

func (s *OrderServiceServer) CancelOrder(ctx context.Context, req *pb.CancelOrderRequest) (*pb.Order, error) {
	// TODO: Find order, update status to CANCELED, return updated order
	return &pb.Order{}, nil
}

func (s *OrderServiceServer) GetOrder(ctx context.Context, req *pb.GetOrderRequest) (*pb.Order, error) {
	// TODO: Find and return order by req.OrderId
	return &pb.Order{}, nil
}

func (s *OrderServiceServer) GetTradeHistory(ctx context.Context, req *pb.TradeHistoryRequest) (*pb.TradeHistoryResponse, error) {
	// TODO: Return trades for user/bot
	return &pb.TradeHistoryResponse{}, nil
}
