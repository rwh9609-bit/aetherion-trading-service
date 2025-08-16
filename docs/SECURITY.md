
# Security & TLS Hardening (2024)

---
## Open Source & Developer Community

This security guide is for an open-source project. We welcome contributors! See DEVELOPER.md and the Careers page for details.

---

Envoy terminates TLS for gRPC-Web on port 8080 using:

```text
/etc/envoy/tls/server.crt
/etc/envoy/tls/server.key
```

Provide via bind mount or place in `certs/` before build.
If no valid certs, Docker build will not fail but Envoy will serve TLS errors.


## Dev Self-Signed Cert

```bash
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -sha256 -days 365 -nodes \
  -keyout certs/server.key -out certs/server.crt \
  -subj "/CN=api.aetherion.cloud" -addext "subjectAltName=DNS:api.aetherion.cloud,DNS:localhost"
```


## Hardened Settings

| Area        | Measure                                              |
|-------------|-----------------------------------------------------|
| CORS        | Strict: localhost:3000, aetherion.cloud             |
| Headers     | HSTS, CSP, X-Frame-Options, etc.                    |
| Compression | gRPC-Web gzip compression                           |
| Health      | `/healthz` direct response                          |
| Logging     | Structured access log to stdout                     |
| Upstreams   | STRICT_DNS service names (trading, risk)            |
| Health Chk  | gRPC health checks                                  |
| Timeouts    | 15s request timeout, streaming unlimited            |
| TLS         | ALPN h2/http1; mTLS ready                           |

## 2025-08: HTTPS & Security Upgrade

Production now uses Let’s Encrypt certificates for all domains. Envoy terminates TLS on port 443.
- Certs: /etc/letsencrypt/live/aetherion.cloud/fullchain.pem, privkey.pem
- Domains: aetherion.cloud, api.aetherion.cloud, www.aetherion.cloud
- Troubleshooting: Remove duplicate domains in envoy.yaml, verify cert paths and permissions.


## Adjust CORS

Edit `envoy.yaml` allow_origin_string_match.


## mTLS (Future)

Add client CA and set `require_client_certificate: true`.


## Admin Port

Exposed on 9901; restrict externally.


## Troubleshooting

- If you see CORS or login errors, check Envoy is running and not blocked by nginx.
- See About/Update pages in the UI for latest stack and troubleshooting tips.


## Next Steps

1. Add rate limiting filter.
2. Add request size limits & WAF style rules.
3. Central metrics/tracing (OTel).
4. Automated cert renewal.

Keep this file updated with future changes.
