# Security & TLS Hardening

Envoy now terminates TLS on port 8080 using certificates at:

```text
/etc/envoy/tls/server.crt
/etc/envoy/tls/server.key
```

Provide these via bind mount or by placing them in `certs/` before build.

## Dev Self-Signed Cert

```bash
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -sha256 -days 365 -nodes \
  -keyout certs/server.key -out certs/server.crt \
  -subj "/CN=api.aetherion.cloud" -addext "subjectAltName=DNS:api.aetherion.cloud,DNS:localhost"
```

## Hardened Settings

| Area | Measure |
|------|---------|
| CORS | Restricted to localhost:3000 & app.aetherion.cloud |
| Headers | HSTS, CSP, X-Frame-Options, etc. |
| Compression | gRPC-Web gzip compression added |
| Health | `/healthz` direct response |
| Logging | Structured access log to stdout |
| Upstreams | STRICT_DNS service names (trading, risk) |
| Health Checks | gRPC health checks added |
| Timeouts | 15s request timeout, streaming unlimited |
| TLS | ALPN h2/http1; mTLS ready |

## Adjust CORS

Edit `envoy.yaml` allow_origin_string_match.

## mTLS (Future)

Add client CA and set `require_client_certificate: true`.

## Admin Port

Exposed on 9901; restrict externally.

## Next Steps

1. Add rate limiting filter.
2. Add request size limits & WAF style rules.
3. Central metrics/tracing (OTel).
4. Automated cert renewal.

Keep this file updated with future changes.
