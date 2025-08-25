# Security Guide

This document outlines the security measures in place for the Aetherion Trading Platform.

## TLS/SSL

Transport Layer Security (TLS) is used to encrypt all public-facing traffic. TLS is terminated at the Envoy proxy on port `443`.

### Development Certificate

For local development, you can generate a self-signed certificate using the following command:

```bash
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -sha256 -days 365 -nodes \
  -keyout certs/server.key -out certs/server.crt \
  -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost"
```

## Authentication & Authorization

Aetherion uses JSON Web Tokens (JWTs) for authentication and authorization. All gRPC calls (except for `Login` and `Register`) must include a valid JWT in the `authorization` metadata header.

## Security Headers

The Envoy proxy is configured to send the following security headers to clients:

*   `Strict-Transport-Security`: Enforces the use of HTTPS.
*   `X-Content-Type-Options`: Prevents browsers from MIME-sniffing a response away from the declared content-type.
*   `X-Frame-Options`: Protects against clickjacking attacks.
*   `Content-Security-Policy`: Helps prevent cross-site scripting (XSS) and other code injection attacks.

## Other Considerations

### CORS

The Cross-Origin Resource Sharing (CORS) policy is configured in `envoy.yaml` to restrict which domains can access the API.

### mTLS

Mutual TLS (mTLS) is not yet implemented but is planned for future releases.

### Admin Port

The Envoy admin interface is exposed on port `9901`. This port should be firewalled and not exposed to the public internet.