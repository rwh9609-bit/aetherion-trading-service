package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	pb "aetherion/gen"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

// authServer implements the AuthService defined in protobufs.
// NOTE: In-memory user store & unsalted SHA-256 hashing for demo purposes only.
// Extend userStore interface
type userStore interface {
	CreateUser(ctx context.Context, username, email, pwHash string) error
	GetUserHash(ctx context.Context, username string) (string, error)
	GetUser(ctx context.Context, username string) (*pb.UserInfo, error)
}

// context key for user hash
type ctxKeyUserHash struct{}

// memUserStore implements userStore in-memory
type memUserStore struct {
	users map[string]struct {
		Email string
		Hash  string
	}
}

func newMemUserStore() *memUserStore {
	return &memUserStore{users: make(map[string]struct {
		Email string
		Hash  string
	})}
}
func (m *memUserStore) CreateUser(_ context.Context, u, email, h string) error {
	if _, ok := m.users[u]; ok {
		return fmt.Errorf("exists")
	}
	m.users[u] = struct {
		Email string
		Hash  string
	}{Email: email, Hash: h}
	return nil
}
func (m *memUserStore) GetUserHash(_ context.Context, u string) (string, error) {
	v, ok := m.users[u]
	if !ok {
		return "", fmt.Errorf("notfound")
	}
	return v.Hash, nil
}

// Add GetUserByUsername to pgUserStore
func (p *pgUserStore) GetUserByUsername(ctx context.Context, username string) (string, error) {
	var id string
	err := p.db.QueryRow(ctx, `SELECT id FROM users WHERE username=$1`, username).Scan(&id)
	if err != nil {
		return "", fmt.Errorf("notfound")
	}
	return id, nil
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
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        username TEXT UNIQUE NOT NULL,
        email TEXT,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
    )`)
	if err != nil {
		conn.Close(ctx)
		return nil, err
	}
	return &pgUserStore{db: conn}, nil
}

// Update CreateUser to use UUID
func (p *pgUserStore) CreateUser(ctx context.Context, username, email, pwHash string) error {
	id := uuid.New().String()
	_, err := p.db.Exec(ctx, `INSERT INTO users (id, username, email, password_hash) VALUES ($1,$2,$3,$4)`, id, username, email, pwHash)
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
	err := p.db.QueryRow(ctx, `SELECT password_hash FROM users WHERE username=$1`, u).Scan(&h)
	if err != nil {
		return "", fmt.Errorf("notfound")
	}
	return h, nil
}

// Implement GetUser for memUserStore
func (m *memUserStore) GetUser(_ context.Context, username string) (*pb.UserInfo, error) {
	v, ok := m.users[username]
	if !ok {
		return nil, fmt.Errorf("notfound")
	}
	return &pb.UserInfo{
		Username:      username,
		Email:         v.Email,
		CreatedAtUnix: time.Now().Unix(), // Demo: use current time
	}, nil
}

// Implement GetUser for pgUserStore
func (p *pgUserStore) GetUser(ctx context.Context, username string) (*pb.UserInfo, error) {
	var email string
	var createdAt time.Time
	err := p.db.QueryRow(ctx, `SELECT email, created_at FROM users WHERE username=$1`, username).Scan(&email, &createdAt)
	if err != nil {
		return nil, fmt.Errorf("notfound")
	}
	return &pb.UserInfo{
		Username:      username,
		Email:         email,
		CreatedAtUnix: createdAt.Unix(),
	}, nil
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

// In Register, after creating user, get their UUID and use it in JWT
func (a *authServer) Register(ctx context.Context, req *pb.RegisterRequest) (*pb.AuthResponse, error) {
	if req.GetUsername() == "" || req.GetPassword() == "" || req.GetEmail() == "" {
		return &pb.AuthResponse{Success: false, Message: "username, password, and email required"}, nil
	}
	if err := a.store.CreateUser(ctx, req.Username, req.Email, hashPassword(req.Password)); err != nil {
		if err.Error() == "exists" {
			return &pb.AuthResponse{Success: false, Message: "user exists"}, nil
		}
		return &pb.AuthResponse{Success: false, Message: err.Error()}, nil
	}
	// Get UUID for JWT
	var userID string
	if pgStore, ok := a.store.(*pgUserStore); ok {
		userID, _ = pgStore.GetUserByUsername(ctx, req.Username)
	} else {
		userID = req.Username // fallback for mem store
	}
	exp := time.Now().Add(1 * time.Hour)
	claims := jwt.MapClaims{"sub": userID, "exp": exp.Unix()}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(a.secret)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "token signing failed: %v", err)
	}
	return &pb.AuthResponse{Success: true, Message: "registered", Token: signed, ExpiresAtUnix: exp.Unix()}, nil
}

// In Login, get UUID by username and use it in JWT
func (a *authServer) Login(ctx context.Context, req *pb.AuthRequest) (*pb.AuthResponse, error) {
	stored, err := a.store.GetUserHash(ctx, req.Username)
	if err != nil || !verifyPassword(stored, req.Password) {
		return &pb.AuthResponse{Success: false, Message: "invalid credentials"}, nil
	}
	var userID string
	if pgStore, ok := a.store.(*pgUserStore); ok {
		userID, _ = pgStore.GetUserByUsername(ctx, req.Username)
	} else {
		userID = req.Username // fallback for mem store
	}
	exp := time.Now().Add(1 * time.Hour)
	claims := jwt.MapClaims{"sub": userID, "exp": exp.Unix()}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(a.secret)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "token signing failed: %v", err)
	}
	log.Printf("[Login] Generated JWT token for user: %s", req.Username)
	return &pb.AuthResponse{Success: true, Message: "ok", Token: signed, ExpiresAtUnix: exp.Unix()}, nil
}

// Add GetUser handler to authServer
func (a *authServer) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.UserInfo, error) {
	user, err := a.store.GetUser(ctx, req.Username)
	if err != nil {
		return nil, status.Error(codes.NotFound, "user not found")
	}
	return user, nil
}

func authUnaryInterceptor(secret []byte) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		if os.Getenv("AUTH_DISABLED") == "1" {
			log.Println("Auth disabled, skipping interceptor")
			return handler(ctx, req)
		}
		if info.FullMethod == "/trading.AuthService/Login" || info.FullMethod == "/trading.AuthService/Register" {
			log.Println("AuthService method, skipping interceptor")
			return handler(ctx, req)
		}
		if info.FullMethod == "/trading.TradingService/GetPrice" {
			log.Println("TradingService GetPrice method, skipping interceptor")
			return handler(ctx, req)
		}
		md, ok := metadata.FromIncomingContext(ctx)
		if !ok {
			log.Println("Missing metadata in context")
			return nil, status.Error(codes.Unauthenticated, "missing metadata")
		}
		vals := md.Get("authorization")
		if len(vals) == 0 {
			log.Println("Missing authorization header")
			return nil, status.Error(codes.Unauthenticated, "missing authorization header")
		}
		tokenStr := vals[0]
		if len(tokenStr) > 7 && (tokenStr[:7] == "Bearer " || tokenStr[:7] == "bearer ") {
			tokenStr = tokenStr[7:]
		}
		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				log.Println("Unexpected signing method")
				return nil, fmt.Errorf("unexpected signing method")
			}
			return secret, nil
		})
		if err != nil {
			log.Printf("Error parsing token: %v", err)
			return nil, status.Error(codes.Unauthenticated, "invalid token")
		}
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok || !token.Valid {
			log.Println("Invalid JWT claims")
			return nil, status.Error(codes.Unauthenticated, "invalid token claims")
		}
		sub, ok := claims["sub"].(string)
		if !ok || sub == "" {
			log.Println("Missing sub claim in JWT")
			return nil, status.Error(codes.Unauthenticated, "missing sub claim")
		}
		ctx = context.WithValue(ctx, "user_id", sub)
		return handler(ctx, req)
	}
}

// Removed unused function authUnaryInterceptorWithFallback to fix compile error (U1000)
