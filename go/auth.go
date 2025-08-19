package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	pb "github.com/rwh9609-bit/multilanguage/go/gen"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

// contextKey is a private type to prevent collisions in context keys.
type contextKey string

const (
	// userIDKey is the key for the user ID in the context.
	userIDKey contextKey = "userID"
)

// getUserIDFromContext extracts the user ID from the context, if it exists.
func getUserIDFromContext(ctx context.Context) (string, bool) {
	userID, ok := ctx.Value(userIDKey).(string)
	return userID, ok
}

// authServer implements the AuthService defined in protobufs.
// NOTE: In-memory user store & unsalted SHA-256 hashing for demo purposes only.
type userStore interface {
	CreateUser(ctx context.Context, username, pwHash string) error
	GetUserHash(ctx context.Context, username string) (string, error)
}

// memUserStore implements userStore in-memory
type memUserStore struct{ users map[string]string }

func newMemUserStore() *memUserStore { return &memUserStore{users: make(map[string]string)} }
func (m *memUserStore) CreateUser(_ context.Context, u, h string) error {
	if _, ok := m.users[u]; ok {
		return fmt.Errorf("exists")
	}
	m.users[u] = h
	return nil
}
func (m *memUserStore) GetUserHash(_ context.Context, u string) (string, error) {
	v, ok := m.users[u]
	if !ok {
		return "", fmt.Errorf("notfound")
	}
	return v, nil
}

// pgUserStore implements userStore with Postgres
type pgUserStore struct{ db *pgx.Conn }

func newPgUserStore(ctx context.Context, dsn string) (*pgUserStore, error) {
	conn, err := pgx.Connect(ctx, dsn)
	if err != nil {
		return nil, err
	}
	// ensure table
	_, err = conn.Exec(ctx, `CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        pw_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
    )`)
	if err != nil {
		conn.Close(ctx)
		return nil, err
	}
	return &pgUserStore{db: conn}, nil
}
func (p *pgUserStore) CreateUser(ctx context.Context, u, h string) error {
	_, err := p.db.Exec(ctx, `INSERT INTO users (username, pw_hash) VALUES ($1,$2)`, u, h)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate") {
			return fmt.Errorf("exists")
		}
		return err
	}
	return nil
}
func (p *pgUserStore) GetUserHash(ctx context.Context, u string) (string, error) {
	var h string
	err := p.db.QueryRow(ctx, `SELECT pw_hash FROM users WHERE username=$1`, u).Scan(&h)
	if err != nil {
		return "", fmt.Errorf("notfound")
	}
	return h, nil
}

type authServer struct {
	pb.UnimplementedAuthServiceServer
	store  userStore
	secret []byte
}

func newAuthServer(secret string) *authServer {
	// Attempt Postgres init if DSN provided
	dsn := os.Getenv("POSTGRES_DSN")
	var store userStore
	if dsn != "" {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		pgStore, err := newPgUserStore(ctx, dsn)
		if err != nil {
			log.Printf("postgres user store init failed, falling back to memory: %v", err)
			store = newMemUserStore()
		} else {
			store = pgStore
		}
	} else {
		store = newMemUserStore()
	}
	return &authServer{store: store, secret: []byte(secret)}
}

func hashPassword(pw string) string {
	hashed, err := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost)
	if err != nil {
		// In practice you'd return error; for demo we'll panic to surface critical issue
		panic("bcrypt hashing failed: " + err.Error())
	}
	return string(hashed)
}

func verifyPassword(hashed, pw string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hashed), []byte(pw)) == nil
}

func (a *authServer) Register(ctx context.Context, req *pb.RegisterRequest) (*pb.AuthResponse, error) {
	if req.GetUsername() == "" || req.GetPassword() == "" {
		return &pb.AuthResponse{Success: false, Message: "username and password required"}, nil
	}
	// Add password length check
	const minPasswordLength = 8
	if len(req.GetPassword()) < minPasswordLength {
		return &pb.AuthResponse{Success: false, Message: fmt.Sprintf("password must be at least %d characters long", minPasswordLength)}, nil
	}
	if err := a.store.CreateUser(ctx, req.Username, hashPassword(req.Password)); err != nil {
		if err.Error() == "exists" {
			return &pb.AuthResponse{Success: false, Message: "user exists"}, nil
		}
		return &pb.AuthResponse{Success: false, Message: err.Error()}, nil
	}
	return &pb.AuthResponse{Success: true, Message: "registered"}, nil
}

func (a *authServer) Login(ctx context.Context, req *pb.AuthRequest) (*pb.AuthResponse, error) {
	stored, err := a.store.GetUserHash(ctx, req.Username)
	if err != nil || !verifyPassword(stored, req.Password) {
		return &pb.AuthResponse{Success: false, Message: "invalid credentials"}, nil
	}
	exp := time.Now().Add(1 * time.Hour)
	claims := jwt.MapClaims{"sub": req.Username, "exp": exp.Unix()}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(a.secret)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "token signing failed: %v", err)
	}
	return &pb.AuthResponse{Success: true, Message: "ok", Token: signed, ExpiresAtUnix: exp.Unix()}, nil
}

// authUnaryInterceptor enforces JWT auth for all non-auth unary RPCs.
func authUnaryInterceptor(secret []byte) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		if os.Getenv("AUTH_DISABLED") == "1" {
			return handler(ctx, req)
		}
		if info.FullMethod == "/trading.AuthService/Login" || info.FullMethod == "/trading.AuthService/Register" {
			return handler(ctx, req)
		}
		if info.FullMethod == "/trading.TradingService/GetPrice" {
			return handler(ctx, req)
		}
		md, ok := metadata.FromIncomingContext(ctx)
		if !ok {
			return nil, status.Error(codes.Unauthenticated, "missing metadata")
		}
		vals := md.Get("authorization")
		if len(vals) == 0 {
			return nil, status.Error(codes.Unauthenticated, "missing authorization header")
		}
		tokenStr := vals[0]
		if len(tokenStr) > 7 && (tokenStr[:7] == "Bearer " || tokenStr[:7] == "bearer ") {
			tokenStr = tokenStr[7:]
		}
		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method")
			}
			return secret, nil
		})
		if err != nil {
			return nil, status.Error(codes.Unauthenticated, "invalid token")
		}

		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
			if sub, ok := claims["sub"].(string); ok {
				newCtx := context.WithValue(ctx, userIDKey, sub)
				return handler(newCtx, req)
			}
		}

		return nil, status.Error(codes.Unauthenticated, "invalid token claims")
	}
}

// authUnaryInterceptorWithFallback allows validating tokens against current secret AND optional previous secret for key rotation
func authUnaryInterceptorWithFallback(primary, previous []byte) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		if os.Getenv("AUTH_DISABLED") == "1" {
			return handler(ctx, req)
		}
		if info.FullMethod == "/trading.AuthService/Login" || info.FullMethod == "/trading.AuthService/Register" {
			return handler(ctx, req)
		}
		if info.FullMethod == "/trading.TradingService/GetPrice" {
			return handler(ctx, req)
		}
		md, ok := metadata.FromIncomingContext(ctx)
		if !ok {
			return nil, status.Error(codes.Unauthenticated, "missing metadata")
		}
		vals := md.Get("authorization")
		if len(vals) == 0 {
			return nil, status.Error(codes.Unauthenticated, "missing authorization header")
		}
		tokenStr := vals[0]
		if len(tokenStr) > 7 && (tokenStr[:7] == "Bearer " || tokenStr[:7] == "bearer ") {
			tokenStr = tokenStr[7:]
		}
		parseWith := func(secret []byte) (*jwt.Token, error) {
			return jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method")
				}
				return secret, nil
			})
		}
		token, err := parseWith(primary)
		if err != nil {
			if len(previous) > 0 {
				token, err = parseWith(previous)
				if err != nil {
					return nil, status.Error(codes.Unauthenticated, "invalid token")
				}
			} else {
				return nil, status.Error(codes.Unauthenticated, "invalid token")
			}
		}

		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
			if sub, ok := claims["sub"].(string); ok {
				newCtx := context.WithValue(ctx, userIDKey, sub)
				return handler(newCtx, req)
			}
		}

		return nil, status.Error(codes.Unauthenticated, "invalid token claims")
	}
}