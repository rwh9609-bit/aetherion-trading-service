// +build integration

package main

import (
	"testing"
	"context"
	"time"
	"google.golang.org/grpc"
	"os"
)

func TestMainServiceStartup(t *testing.T) {
	// Try to start the service in a goroutine (simulate main)
	go func() {
		main()
	}()

	// Wait for a short time to allow startup
	time.Sleep(2 * time.Second)

	// Try to connect to the gRPC server
	conn, err := grpc.Dial("localhost:50051", grpc.WithInsecure(), grpc.WithBlock(), grpc.WithTimeout(2*time.Second))
	if err != nil {
		t.Fatalf("Failed to connect to gRPC server: %v", err)
	}
	defer conn.Close()
}

// Optionally, add more integration tests for health endpoints, etc.
