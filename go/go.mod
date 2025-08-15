module aetherion-trading-service

go 1.23.0

toolchain go1.24.6

require (
	github.com/golang-jwt/jwt/v5 v5.3.0
	github.com/google/uuid v1.6.0
	github.com/rs/cors v1.11.1
	google.golang.org/grpc v1.64.0
	google.golang.org/protobuf v1.34.1
)

require (
	golang.org/x/crypto v0.41.0 // indirect
	golang.org/x/net v0.42.0 // indirect
	golang.org/x/sys v0.35.0 // indirect
	golang.org/x/text v0.28.0 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20240318140521-94a12d6c2237 // indirect
)

replace aetherion-trading-service/gen/protos => ./gen/protos
