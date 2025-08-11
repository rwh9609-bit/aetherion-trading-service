package main

import (
	"net/http"

	"github.com/rs/cors"
)

func corsMiddleware() *cors.Cors {
	return cors.New(cors.Options{
		AllowedOrigins: []string{"http://localhost:3000"},
		AllowedMethods: []string{
			http.MethodPost,
			http.MethodGet,
			http.MethodOptions,
			http.MethodPut,
			http.MethodDelete,
		},
		AllowedHeaders: []string{
			"Accept",
			"Content-Type",
			"Content-Length",
			"Accept-Encoding",
			"X-CSRF-Token",
			"Authorization",
			"X-Grpc-Web",
			"X-User-Agent",
			"*",
		},
		ExposedHeaders: []string{
			"grpc-status",
			"grpc-message",
			"grpc-encoding",
			"grpc-accept-encoding",
			"grpc-message",
		},
	})
}
