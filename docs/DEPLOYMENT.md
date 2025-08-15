# Deployment Guide

This document is for internal/operators. The public `README.md` intentionally omits these details.

## Domain Migration (Localhost -> Production)

1. DNS: Point `app.yourdomain.com` (frontend) and optionally `api.yourdomain.com` (Envoy proxy) to your hosting endpoints.
2. Build Frontend:
   - Same-origin approach (simpler):
     ```bash
     export REACT_APP_GRPC_HOST=https://app.yourdomain.com
     npm run build --prefix frontend
     ```
   - Separate API subdomain:
     ```bash
     export REACT_APP_GRPC_HOST=https://api.yourdomain.com
     npm run build --prefix frontend
     ```
3. Serve `frontend/build` via HTTPS (Netlify, Vercel, Nginx, S3+CloudFront, etc.).
4. Backend CORS:
   ```bash
   export CORS_ALLOWED_ORIGINS=https://app.yourdomain.com,https://api.yourdomain.com
   ```
5. Run backend/Envoy (ensure port 8080 reachable internally or exposed behind your reverse proxy / LB).
6. Verify in browser DevTools Network tab that gRPC-web calls use the production domain and no CORS errors appear.

### Automated Build Script

You can use the helper script:
```bash
chmod +x scripts/deploy.sh
AUTH_SECRET=prodsecret \
REACT_APP_GRPC_HOST=https://app.yourdomain.com \
CORS_ALLOWED_ORIGINS=https://app.yourdomain.com \
./scripts/deploy.sh
```
Resulting `dist/` directory contains binaries, Envoy config, and frontend build plus a packaged tarball.

## Envoy Hardening
- Restrict `domains` in `envoy.yaml` (replace `"*"` with explicit host).
- Add TLS termination (if Envoy directly internet-facing) or place behind a managed LB.
- Enable access logs & monitoring.
- Rate limit sensitive RPCs (authentication, symbol management).

## Secure Secrets
- Set `AUTH_SECRET` with a strong random value (32+ bytes).
- Store secrets in a vault or environment manager (not committed to repo).
- For key rotation deploy new `AUTH_SECRET` while keeping old in `AUTH_PREVIOUS_SECRET` for token grace period, then remove after expiry window.

## Observability
- Go service exposes HTTP health at `:8090/healthz` (used by Docker healthcheck). Add external LB health probe to Envoy or directly to this endpoint if desired.
- Collect logs centrally.

## Zero-Downtime Updates
- Build new image / artifact.
- Deploy behind load balancer using rolling or blue/green strategy.
- Invalidate CDN cache for updated frontend assets if necessary.

## Troubleshooting
| Symptom | Likely Cause | Fix |
|--------|--------------|-----|
| CORS error in console | Origin not in `CORS_ALLOWED_ORIGINS` | Update env and restart backend | 
| gRPC calls 404 | Envoy route prefix mismatch | Confirm service method prefixes | 
| Envoy 503 UC | Backend service unreachable | Check service pods/ports | 
| Mixed content warning | Serving API over HTTP while site is HTTPS | Use HTTPS for API | 
| Momentum metrics empty | Insufficient price history (<1-2 minutes) | Wait for data accumulation or ensure symbols streaming |

## Example Systemd Unit Snippet
```ini
[Service]
Environment=AUTH_SECRET=change_me
Environment=CORS_ALLOWED_ORIGINS=https://app.yourdomain.com
ExecStart=/usr/local/bin/aetherion-trading-service
Restart=always
``` 

---
For contribution or deeper architectural notes see `DEVELOPER.md`.
