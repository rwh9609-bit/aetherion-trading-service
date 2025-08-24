package main

import (
	"context"
	"fmt"
	"sync"
	"time"

	pb "aetherion/gen"

	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/google/uuid"
)

func decimalValueToNumeric(dv *pb.DecimalValue) string {
	if dv == nil {
		return "0"
	}
	return fmt.Sprintf("%d.%09d", dv.Units, abs(dv.Nanos))
}

func numericValueToDecimal(n string) *pb.DecimalValue {
	if n == "" {
		return nil
	}
	var units int64
	var nanos int32
	fmt.Sscanf(n, "%d.%09d", &units, &nanos)
	return &pb.DecimalValue{
		Units: units,
		Nanos: abs(nanos),
	}
}

func abs(n int32) int32 {
	if n < 0 {
		return -n
	}
	return n
}

type OrderServiceServer struct {
	pb.OrderServiceServer
	mu       sync.RWMutex
	dbclient *DBService
}

func newOrderServiceServer(dbclient *DBService) *OrderServiceServer {
	return &OrderServiceServer{dbclient: dbclient}
}

func (s *OrderServiceServer) CreateOrder(ctx context.Context, req *pb.CreateOrderRequest) (*pb.Order, error) {
	order := &pb.Order{
		Id:                uuid.New().String(),
		BotId:             req.BotId,
		Symbol:            req.Symbol,
		Side:              req.Side,
		Type:              req.Type,
		Status:            pb.OrderStatus_NEW,
		QuantityRequested: req.Quantity,
		QuantityFilled:    numericValueToDecimal("0"),
		LimitPrice:        req.LimitPrice,
		StopPrice:         req.StopPrice,
		CreatedAt: &timestamppb.Timestamp{
			Seconds: time.Now().Unix(),
			Nanos:   int32(time.Now().Nanosecond()),
		},
		UpdatedAt: &timestamppb.Timestamp{
			Seconds: time.Now().Unix(),
			Nanos:   int32(time.Now().Nanosecond()),
		},
		Trades: []*pb.Trade{},
	}

	// Convert DecimalValue fields to string for DB
	quantityRequestedStr := decimalValueToNumeric(order.QuantityRequested)
	quantityFilledStr := decimalValueToNumeric(order.QuantityFilled)
	limitPriceStr := decimalValueToNumeric(order.LimitPrice)
	stopPriceStr := decimalValueToNumeric(order.StopPrice)

	// Store in dbclient, pass numeric strings
	orderID, err := s.dbclient.CreateOrder(
		ctx,
		order.Id,
		order.BotId,
		order.Symbol,
		order.Side.String(),
		order.Type.String(),
		order.Status,
		quantityRequestedStr,
		quantityFilledStr,
		limitPriceStr,
		stopPriceStr,
	)
	if err != nil {
		return nil, err
	}
	order.Id = orderID
	return order, nil
}

func (s *OrderServiceServer) CancelOrder(ctx context.Context, req *pb.CancelOrderRequest) (*pb.Order, error) {
	// TODO: Find order, update status to CANCELED, return updated order
	return &pb.Order{}, nil
}

func (s *OrderServiceServer) GetOrder(ctx context.Context, req *pb.GetOrderRequest) (*pb.Order, error) {
	order, err := s.dbclient.GetOrder(ctx, req.OrderId)
	if err != nil {
		return nil, err
	}
	return order, nil
}

func (s *OrderServiceServer) ListOrders(ctx context.Context, req *pb.ListOrdersRequest) (*pb.ListOrdersResponse, error) {
	orders, err := s.dbclient.ListOrders(ctx, req.BotId, req.Limit, req.Offset)
	if err != nil {
		return nil, err
	}
	return &pb.ListOrdersResponse{Orders: orders}, nil
}

func (s *OrderServiceServer) GetTradeHistory(ctx context.Context, req *pb.TradeHistoryRequest) (*pb.TradeHistoryResponse, error) {
	// TODO: Return trades for user/bot
	return &pb.TradeHistoryResponse{}, nil
}
