package main

import (
	"context"
	"fmt"

	pb "aetherion/gen"

	"github.com/google/uuid"
)

// strategyStudioServer is the server that implements the StrategyStudioService.
type strategyStudioServer struct {
	pb.UnimplementedStrategyStudioServiceServer
	dbService *DBService
}

// newStrategyStudioServer creates a new strategyStudioServer.
func newStrategyStudioServer(dbService *DBService) *strategyStudioServer {
	return &strategyStudioServer{dbService: dbService}
}

// CreateCustomStrategy creates a new custom strategy.
func (s *strategyStudioServer) CreateCustomStrategy(ctx context.Context, req *pb.CreateCustomStrategyRequest) (*pb.CustomStrategy, error) {
	// Extract user ID from context (set by auth interceptor)
	userID, _ := ctx.Value("userID").(string)
	if userID == "" {
		return nil, fmt.Errorf("missing user ID in context")
	}

	strategy := &pb.CustomStrategy{
		Id:          uuid.New().String(),
		Name:        req.Name,
		Description: req.Description,
		Nodes:       req.Nodes,
		Edges:       req.Edges,
		UserId:      userID,
	}

	_, err := s.dbService.CreateCustomStrategy(ctx, strategy)
	if err != nil {
		return nil, err
	}

	return strategy, nil
}

// GetCustomStrategy gets a custom strategy by its ID.
func (s *strategyStudioServer) GetCustomStrategy(ctx context.Context, req *pb.GetCustomStrategyRequest) (*pb.CustomStrategy, error) {
	return s.dbService.GetCustomStrategy(ctx, req.StrategyId)
}

// UpdateCustomStrategy updates a custom strategy.
func (s *strategyStudioServer) UpdateCustomStrategy(ctx context.Context, req *pb.UpdateCustomStrategyRequest) (*pb.CustomStrategy, error) {
	strategy := &pb.CustomStrategy{
		Id:          req.StrategyId,
		Name:        req.Name,
		Description: req.Description,
		Nodes:       req.Nodes,
		Edges:       req.Edges,
	}

	err := s.dbService.UpdateCustomStrategy(ctx, strategy)
	if err != nil {
		return nil, err
	}

	return strategy, nil
}

// DeleteCustomStrategy deletes a custom strategy.
func (s *strategyStudioServer) DeleteCustomStrategy(ctx context.Context, req *pb.DeleteCustomStrategyRequest) (*pb.StatusResponse, error) {
	err := s.dbService.DeleteCustomStrategy(ctx, req.StrategyId)
	if err != nil {
		return &pb.StatusResponse{Success: false, Message: err.Error()}, nil
	}
	return &pb.StatusResponse{Success: true}, nil
}

// ListCustomStrategies lists all custom strategies for a user.
func (s *strategyStudioServer) ListCustomStrategies(ctx context.Context, req *pb.ListCustomStrategiesRequest) (*pb.ListCustomStrategiesResponse, error) {
	strategies, err := s.dbService.ListCustomStrategies(ctx, req.UserId)
	if err != nil {
		return nil, err
	}
	return &pb.ListCustomStrategiesResponse{Strategies: strategies}, nil
}
