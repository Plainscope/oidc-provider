# Directory security foundations (Plan 04 / issues #43, #52–#54)

This guide documents the authentication boundaries, secret loading, and
hardening controls implemented for the Directory service. It follows
**ADR-004**: the Directory is a backing store; the **Provider** remains the
sole OIDC token issuer.

## Authentication boundaries

| Caller | Mechanism | Scope |
|--------|-----------|--------|
| **Provider → Directory** | Static Bearer and/or service JWT | `/api/*` and legacy API paths (`/count`, `/validate`, `/find/*`) |
| **Admin → Directory** | Browser session after UI login (CSRF-protected); optional session access to `/api/*` | HTML admin routes and same-origin API |
| **Health / public** | Unauthenticated | `/healthz`, `/login`, `/logout`, static assets |

Directory **does not** issue Provider/OIDC access or ID tokens. Admin
sessions are scoped to Directory administration only.

### Request identity for audit

Authenticated requests set `flask.g.auth_context`:

- `role`: `service` | `admin` | `anonymous`
- `actor`: JWT `sub` / `provider-service` / admin username
- `method`: `bearer` | `jwt` | `session` | optional `+mtls`
- `request_id`: correlation ID from `X-Request-ID` / `X-Correlation-ID` or a generated value

Audit helpers record actor, role, and request ID without logging secrets.

## Secret loading

Use `secrets_loader.get_secret(name)` (or `require_secret`) instead of reading
`os.environ` directly for credentials.

**Resolution order**

1. Environment variable `NAME`
2. File contents from `NAME_FILE` (Docker/Kubernetes secret mounts)
3. Optional development default (ignored in production)

**Production fail-fast**

When `FLASK_ENV=production` or `ENV=production`:

- Missing required secrets raise `RuntimeError`
- Known development defaults (e.g. `local-dev-bearer-token`, `change-me`) are rejected

```bash
export SECRET_KEY="$(openssl rand -hex 32)"
export BEARER_TOKEN="$(openssl rand -hex 32)"
export DIRECTORY_ADMIN_TOKEN="$(openssl rand -hex 32)"
```

Never commit real secrets, bake them into images, or log their values.

## Service JWT authentication (issue #52)

When configured, Provider-to-Directory may present a **JWT** Bearer token instead of the static service secret.

| Variable | Required | Description |
|----------|----------|-------------|
| `SERVICE_JWT_ISSUER` | yes* | Expected `iss` |
| `SERVICE_JWT_AUDIENCE` | yes* | Expected `aud` (Directory resource audience) |
| `SERVICE_JWT_JWKS_URL` | one of | JWKS endpoint for signature verification |
| `SERVICE_JWT_PUBLIC_KEY` | one of | PEM public key |
| `SERVICE_JWT_PUBLIC_KEY_FILE` | one of | Path to PEM public key file |
| `SERVICE_JWT_ALGORITHMS` | no | Default `RS256` |

\* Required only when enabling JWT auth.

JWT-shaped tokens that fail validation are **rejected** (no silent fallback to static Bearer). Non-JWT Bearer values still use `BEARER_TOKEN` during migration.

Actor is taken from `sub`, then `client_id`, then `azp`.

## Admin authentication contract (issue #53)

| Variable | Description |
|----------|-------------|
| `DIRECTORY_ADMIN_TOKEN` | Preferred admin UI login credential (`DIRECTORY_ADMIN_TOKEN_FILE` supported) |
| `BEARER_TOKEN` | Fallback for admin login during migration only |

- Admin login creates a **server-side session** with `role=admin` and **does not store the raw token** in the session or HTML.
- Admin browser calls to `/api/*` are authorized via the session cookie (same-origin).
- Provider service calls continue to use Bearer/JWT and are recorded as `role=service`.
- Directory never issues OIDC tokens for end users.

## Optional mTLS (issue #54)

mTLS is **optional** and typically terminated at a reverse proxy.

| Variable | Default | Description |
|----------|---------|-------------|
| `MTLS_REQUIRED` | `false` | When `true`, API requests must present a verified client certificate signal |
| `MTLS_VERIFY_HEADER` | `X-SSL-Client-Verify` | Proxy header (`SUCCESS` / `NONE` / …) |
| `MTLS_SUBJECT_HEADER` | `X-SSL-Client-S-DN` | Certificate subject DN for audit |

Example Nginx snippet (Provider → Directory):

```nginx
server {
    listen 443 ssl;
    server_name directory.internal;

    ssl_certificate     /etc/certs/directory-fullchain.pem;
    ssl_certificate_key /etc/certs/directory-key.pem;
    ssl_client_certificate /etc/certs/provider-ca.pem;
    ssl_verify_client on;

    location / {
        proxy_pass http://directory:8080;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Request-ID $request_id;
        proxy_set_header Authorization $http_authorization;
        proxy_set_header X-SSL-Client-Verify $ssl_client_verify;
        proxy_set_header X-SSL-Client-S-DN $ssl_client_s_dn;
    }
}
```

mTLS is an **additional** control on top of Bearer/JWT, not a replacement. Local Compose stacks leave `MTLS_REQUIRED` unset.

## Security headers and correlation

Every response includes baseline headers, `X-Request-ID`, and HSTS when production + `SESSION_COOKIE_SECURE=true`.

## Trusted proxies

When TLS terminates upstream, set `SESSION_COOKIE_SECURE=true` and forward `X-Forwarded-Proto` / `X-Forwarded-For` correctly.

## Tests

- `python test_secrets_loader.py`
- `python test_service_auth.py`
- `python test_admin_mtls_auth.py`
- `python test_constraints.py` / `python test_database_engines.py`

## Follow-ups (FastAPI / SPA)

- FastAPI dependency injection equivalents for JWT/admin auth when Plan 02 lands (#42)
- React SPA integration of the admin session contract (#44)
