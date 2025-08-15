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

### Step 5: Deploy React Frontend to Apache (cPanel) & Disable Directory Listing

If your root domain (e.g. `https://aetherion.cloud`) is currently showing a plain directory index, you have not yet uploaded the built React assets or Apache is allowed to list directories. Fix it by building locally and uploading the optimized build, plus adding an `.htaccess` file.

Steps:

1. Build locally (adjust host as needed):

  ```bash
  # From repo root
  export REACT_APP_GRPC_HOST="https://api.aetherion.cloud"   # or https://aetherion.cloud if same-origin
  npm ci --prefix frontend
  npm run build --prefix frontend
  ```

1. The build artifacts are in `frontend/build/` (contains `index.html`, `asset-manifest.json`, `static/` etc.).

1. Upload contents (NOT the `build` folder itself; just its contents) into your server's `public_html/` (or the document root for the desired vhost) via one of:

  - cPanel File Manager (Compress locally -> Upload zip -> Extract)
  - SCP/rsync: `rsync -av frontend/build/ user@server:/home/<cpaneluser>/public_html/`

1. Create (or edit) `/home/<cpaneluser>/public_html/.htaccess` with at least:

  ```apache
  Options -Indexes
  <IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    # SPA routing: send non-file, non-dir requests to index.html
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
  </IfModule>
  ```

  This removes directory listing and enables client-side routing.

1. (Optional Hardening / Performance) Extend `.htaccess` later with caching & compression:

  ```apache
  <IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/webp "access plus 1 year"
  </IfModule>
  <IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml
  </IfModule>
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  ```

1. Verify:

  ```bash
  curl -I https://aetherion.cloud/
  # Expect: HTTP/2 200 and content-type: text/html
  ```

  Load the site in a browser; you should no longer see a directory listing.

If you instead prefer a subdomain (`app.` + `api.` separation), point `app.` to the same doc root (or a dedicated one) and perform identical steps there, keeping `REACT_APP_GRPC_HOST` pointing at `https://api.yourdomain.com`.


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

\n## Envoy Hardening
- Restrict `domains` in `envoy.yaml` (replace `"*"` with explicit host).
- Add TLS termination (if Envoy directly internet-facing) or place behind a managed LB.
- Enable access logs & monitoring.
- Rate limit sensitive RPCs (authentication, symbol management).

\n## Secure Secrets
- Set `AUTH_SECRET` with a strong random value (32+ bytes).
- Store secrets in a vault or environment manager (not committed to repo).
- For key rotation deploy new `AUTH_SECRET` while keeping old in `AUTH_PREVIOUS_SECRET` for token grace period, then remove after expiry window.

\n## Observability
- Go service exposes HTTP health at `:8090/healthz` (used by Docker healthcheck). Add external LB health probe to Envoy or directly to this endpoint if desired.
- Collect logs centrally.

\n## Zero-Downtime Updates
- Build new image / artifact.
- Deploy behind load balancer using rolling or blue/green strategy.
- Invalidate CDN cache for updated frontend assets if necessary.

\n## Troubleshooting
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
