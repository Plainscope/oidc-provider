# Plan 04: Security & Production Readiness

**Status**: Draft for review  
**Target component**: `src/directory` + Docker / Compose / secrets  
**Priority**: Critical  
**Estimated effort**: 4–7 days  
**Dependencies**: Works well with API versioning (Plan 02) and SPA (Plan 03)

## Goals

- Strengthen authentication: support **JWT** (in addition to the existing Bearer token) for both API clients and the SPA.
- Enable **mTLS** (mutual TLS) as an optional high-security mode for service-to-service calls.
- Introduce proper **secret management** (no secrets in env files or images).
- Harden the service for production: security headers, rate limiting, audit, observability hooks, least-privilege containers.

## Non-Goals

- Full OAuth2 Authorization Server inside the directory (it remains a resource server / user store).
- Hardware security modules or external KMS in the first iteration (design for them).
- Zero-trust network mesh (Istio etc.) – document how to plug in later.

## Current State

- Single static `BEARER_TOKEN` for all API calls (shared secret).
- Session cookie + CSRF for the UI.
- Basic security headers and Flask-Limiter.
- Secrets typically passed via environment variables or Compose files.
- No mTLS, no JWT, no rotating credentials, limited observability.

## Target Authentication Model

### 1. API Authentication (resource server)

Support three mechanisms (any one sufficient):

| Mechanism              | Use case                              | Priority |
|------------------------|---------------------------------------|----------|
| Static Bearer token    | Simple scripts, backward compat       | Keep (deprecate later) |
| JWT (Bearer)           | SPA, modern clients, short-lived      | New primary |
| mTLS client certificate| High-security service-to-service      | Optional |

JWT validation:
- Accept RS256 / ES256 tokens.
- Configurable issuer, audience, JWKS URL (or static public key).
- Claims mapping: `sub` → admin identity for audit logs.
- Optional local signing key for “directory-issued” tokens (login endpoint).

### 2. SPA / UI Authentication

Recommended modern pattern:

1. `POST /api/v1/auth/login` (username + password) → short-lived access token (JWT) + httpOnly refresh token cookie.
2. Access token kept in memory (or sessionStorage with care); sent as `Authorization: Bearer <jwt>`.
3. Silent refresh via the refresh cookie.
4. Logout clears cookie and blacklists refresh token (if using a store).

Alternative for simpler deployments: continue session cookies, but prefer JWT for the SPA so the same auth works for pure API clients.

### 3. mTLS

- Optional mode enabled by `MTLS_ENABLED=true`.
- Require client certificate on the TLS listener (or behind a terminating proxy that forwards the cert).
- Map certificate CN / SAN to a service identity for audit.
- Document Nginx / Traefik / Caddy configuration examples.

## Secret Management

### Principles

- Never bake secrets into images or commit them.
- Prefer external secret stores; fall back to env only for local dev.
- Support rotation without downtime.

### Implementation Options (choose one or layered)

1. **Environment + Docker secrets** (minimum)
   - `BEARER_TOKEN`, `JWT_PRIVATE_KEY`, `DATABASE_URL` etc. injected at runtime.
   - Compose `secrets:` and Kubernetes Secrets.

2. **File-based secrets** (common in containers)
   - `*_FILE` env vars that point to mounted secret files (e.g. `/run/secrets/jwt_key`).

3. **External providers** (production)
   - HashiCorp Vault, AWS Secrets Manager, GCP Secret Manager, Azure Key Vault.
   - Abstract behind a small `SecretProvider` interface so the app stays portable.

### Required Secrets Inventory

| Secret                    | Purpose                          | Rotation |
|---------------------------|----------------------------------|----------|
| `BEARER_TOKEN`            | Legacy API auth                  | Manual  |
| `JWT_SIGNING_KEY` / pair  | Issue & verify directory JWTs    | Key rotation |
| `DATABASE_URL` / password | DB connection                    | Credential rotation |
| `SECRET_KEY`              | Flask sessions / CSRF            | Restart |
| mTLS CA + client certs    | Mutual TLS                       | Cert lifecycle |

## Implementation Steps

### Phase 1 – JWT Support (1.5–2 days)

1. Add `PyJWT` + `cryptography` (or `authlib`).
2. Config: `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_JWKS_URL` or `JWT_PUBLIC_KEY`, `JWT_PRIVATE_KEY` (for issuing).
3. Middleware / decorator that accepts either static Bearer **or** valid JWT.
4. `POST /api/v1/auth/login` and `POST /api/v1/auth/refresh` endpoints.
5. Audit log records the JWT `sub` (or static token identity).
6. Update OpenAPI (Plan 02) with security schemes.

### Phase 2 – Secret Loading Abstraction (1 day)

1. `secrets.py` module:
   - `get_secret(name)` checks env, then `name_FILE`, then optional Vault/etc.
2. Replace all direct `os.environ["BEARER_TOKEN"]` lookups.
3. Document the loading order and provide examples for Docker / K8s / Vault.
4. Fail fast at startup if required secrets are missing in production mode.

### Phase 3 – mTLS (1–1.5 days)

1. Document reverse-proxy configuration (Nginx example with `ssl_verify_client on`).
2. Optional in-process TLS with client cert verification (Gunicorn + custom SSL context) for simple deployments.
3. Extract client identity from the certificate and attach to the request context for audit.
4. Health check and readiness that work behind mTLS.

### Phase 4 – Hardening & Observability (1–1.5 days)

1. Review and tighten Content-Security-Policy, HSTS, Permissions-Policy (especially once SPA is vendored).
2. Rate limiting: stricter limits on `/auth/login` and `/validate`; IP + identity aware.
3. Structured logging (JSON) with request ID, user/service identity, correlation.
4. Prometheus metrics endpoint (`/metrics`) – request counts, latencies, auth failures.
5. OpenTelemetry traces (optional, behind a flag).
6. Container: non-root (already present), read-only root filesystem where possible, drop capabilities.
7. Network policies / Compose network isolation examples.

### Phase 5 – Documentation & Examples (0.5–1 day)

1. Security guide: threat model, recommended production config, rotation procedures.
2. Compose / Helm examples with secrets and mTLS.
3. Migration notes for existing Bearer-token users.

## Backward Compatibility

- Static Bearer token continues to work indefinitely (or until a future major version).
- Existing session-based UI auth can remain until the SPA fully migrates to JWT.
- No forced mTLS; it is opt-in.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| JWT key compromise | Short-lived access tokens + refresh token rotation + key rotation procedure |
| Secret sprawl | Single `get_secret` abstraction + inventory |
| mTLS complexity for users | Keep it optional and well-documented |
| Performance of JWT validation | Cache JWKS, use efficient libraries |
| Breaking existing clients | Dual auth support + clear deprecation timeline |

## Success Criteria

- [ ] API accepts both static Bearer and JWT; SPA can log in and call APIs with JWT.
- [ ] All secrets loaded through the abstraction; no secrets in the image or git.
- [ ] mTLS mode can be enabled and is documented with a working proxy example.
- [ ] Production checklist (headers, rate limits, non-root, structured logs, metrics) is satisfied.
- [ ] Security documentation is complete and reviewed.

## Open Questions for Review

1. Should the directory itself issue JWTs, or only validate tokens from an external IdP?
2. Preferred secret backend for the reference deployment (Docker secrets, Vault, cloud provider)?
3. Is mTLS required for the first production release or can it follow later?
4. Any existing corporate IdP / JWKS that the directory should trust out of the box?
