#!/usr/bin/env bash
set -euo pipefail

# Aetherion build & packaging helper
# Usage (same-origin example):
#   AUTH_SECRET=prodsecret \
#   REACT_APP_GRPC_HOST=https://app.example.com \
#   CORS_ALLOWED_ORIGINS=https://app.example.com \
#   ./scripts/deploy.sh
#
# For separate API host:
#   REACT_APP_GRPC_HOST=https://api.example.com CORS_ALLOWED_ORIGINS=https://app.example.com,https://api.example.com ./scripts/deploy.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
BUILD_OUT_DIR="$ROOT_DIR/dist"
GO_BINARY_NAME="trading_service"
RUST_BINARY_NAME="risk_service"

echo "==> Environment overview"
echo "REACT_APP_GRPC_HOST=${REACT_APP_GRPC_HOST:-<auto-detect>}"
echo "CORS_ALLOWED_ORIGINS=${CORS_ALLOWED_ORIGINS:-<default>}"
echo "AUTH_SECRET=${AUTH_SECRET:+<set>}"

env | grep -E '^(REACT_APP_GRPC_HOST|CORS_ALLOWED_ORIGINS|AUTH_SECRET)=' || true

mkdir -p "$BUILD_OUT_DIR"

echo "==> 1. Building frontend (production)"
pushd "$FRONTEND_DIR" >/dev/null
rm -rf build
if command -v npm >/dev/null; then
  if [ -f package-lock.json ]; then npm ci || npm install; else npm install; fi
else
  echo "npm not found" >&2; exit 1
fi
NODE_ENV=production npm run build
popd >/dev/null
cp -R "$FRONTEND_DIR/build" "$BUILD_OUT_DIR/frontend"

echo "==> 2. Building Go service"
pushd "$ROOT_DIR/go" >/dev/null
GOOS=linux GOARCH=amd64 go build -o "$BUILD_OUT_DIR/$GO_BINARY_NAME" ./...
popd >/dev/null

echo "==> 3. Building Rust risk service (release)"
pushd "$ROOT_DIR/rust/risk_service" >/dev/null
cargo build --release
cp target/release/risk_service "$BUILD_OUT_DIR/$RUST_BINARY_NAME"
popd >/dev/null

echo "==> 4. Copying config artifacts"
cp "$ROOT_DIR/envoy.yaml" "$BUILD_OUT_DIR/"

cat > "$BUILD_OUT_DIR/README_DEPLOY_ARTIFACTS.txt" <<EOF
Artifacts:
  frontend/ (static React build)
  $GO_BINARY_NAME (Go trading gRPC service)
  $RUST_BINARY_NAME (Rust risk service)
  envoy.yaml (gRPC-web proxy config)

Recommended run order (adjust paths/services/systemd as needed):
  1. Start risk service:   ./risk_service
  2. Start trading service: AUTH_SECRET=... CORS_ALLOWED_ORIGINS=... ./trading_service
  3. Run envoy: envoy -c envoy.yaml
  4. Serve frontend build/ via CDN or: npx serve ./frontend

Environment variables at runtime:
  AUTH_SECRET (required, non-empty)
  CORS_ALLOWED_ORIGINS (comma-separated)

For separate API host ensure REACT_APP_GRPC_HOST was set at build time.
EOF

echo "==> 5. Packaging (tar.gz)"
TAR_NAME="aetherion_$(date +%Y%m%d_%H%M%S).tar.gz"
pushd "$BUILD_OUT_DIR/.." >/dev/null
tar -czf "$TAR_NAME" "$(basename "$BUILD_OUT_DIR")"
popd >/dev/null
echo "Created package: $BUILD_OUT_DIR/../$TAR_NAME"

echo "==> Done"
