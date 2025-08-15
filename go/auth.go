package main

import (
    "context"
    "fmt"
    "time"
    "os"

    pb "aetherion-trading-service/gen"

    "github.com/golang-jwt/jwt/v5"
    "golang.org/x/crypto/bcrypt"
    "google.golang.org/grpc"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/metadata"
    "google.golang.org/grpc/status"
)

// authServer implements the AuthService defined in protobufs.
// NOTE: In-memory user store & unsalted SHA-256 hashing for demo purposes only.
type authServer struct {
    pb.UnimplementedAuthServiceServer
    users  map[string]string // username -> password hash
    secret []byte
}

func newAuthServer(secret string) *authServer {
    return &authServer{users: make(map[string]string), secret: []byte(secret)}
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
    if _, exists := a.users[req.Username]; exists {
        return &pb.AuthResponse{Success: false, Message: "user exists"}, nil
    }
    a.users[req.Username] = hashPassword(req.Password)
    return &pb.AuthResponse{Success: true, Message: "registered"}, nil
}

func (a *authServer) Login(ctx context.Context, req *pb.AuthRequest) (*pb.AuthResponse, error) {
    stored, ok := a.users[req.Username]
    if !ok || !verifyPassword(stored, req.Password) {
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
        // Dev bypass if environment variable set
        if os.Getenv("AUTH_DISABLED") == "1" {
            return handler(ctx, req)
        }
        if info.FullMethod == "/trading.AuthService/Login" || info.FullMethod == "/trading.AuthService/Register" {
            return handler(ctx, req)
        }
        // TEMP: Allow unauthenticated GetPrice until frontend auth wired
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
        _, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
            if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
                return nil, fmt.Errorf("unexpected signing method")
            }
            return secret, nil
        })
        if err != nil {
            return nil, status.Error(codes.Unauthenticated, "invalid token")
        }
        return handler(ctx, req)
    }
}
