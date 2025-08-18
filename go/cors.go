package main

import (
	"net/http"
	"os"
	"strings"

	"github.com/rs/cors"
)

func corsMiddleware() *cors.Cors {
	// Allow override via CORS_ALLOWED_ORIGINS (comma-separated). Fallback to defaults.
	originsEnv := os.Getenv("CORS_ALLOWED_ORIGINS")
	var origins []string
	if originsEnv != "" {
		for _, o := range strings.Split(originsEnv, ",") {
			o = strings.TrimSpace(o)
			if o != "" {
				origins = append(origins, o)
			}
		}
	}
	if len(origins) == 0 {
		origins = []string{
			"http://localhost:3000",
			"https://app.aetherion.cloud",
		}
	}
	return cors.New(cors.Options{
		AllowedOrigins: origins,
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
