# Directory security foundations (Plan 04 / issue #43)

This guide documents the authentication boundaries, secret loading, and
hardening controls implemented for the Directory service. It follows
**ADR-004**: the Directory is a backing store; the **Provider** remains the
sole OIDC token issuer.

## Authentication boundaries

| Caller | Mechanism | Scope |
|--------|-----------|--------|
| **Provider → Directory** | Static Bearer token (`BEARER_TOKEN` / `BEARER_TOKEN_FILE`) | `/api/*` and legacy API paths (`/count`, `/validate`, `/find/*`) |
| **Admin → Directory** | Browser session after UI login (CSRF-protected) | HTML admin routes under the Directory UI |
| **Health / public** | Unauthenticated | `/healthz`, `/login`, `/logout`, static assets |

Directory **does not** issue Provider/OIDC access or ID tokens. Admin
sessions are scoped to Directory administration only.

JWT validation for externally issued service tokens and optional mTLS are
supported as configuration extensions (see below); they do not turn Directory
into a token issuer.

### Request identity for audit

Authenticated requests set `flask.g.auth_context`:

- `role`: `service` | `admin` | `anonymous`
- `actor`: `provider-service` or the admin username
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

**Examples**

```bash
# Environment
export SECRET_KEY="$(openssl rand -hex 32)"
export BEARER_TOKEN="$(openssl rand -hex 32)"

# File-based (Kubernetes / Docker secrets)
export SECRET_KEY_FILE=/run/secrets/directory_secret_key
export BEARER_TOKEN_FILE=/run/secrets/directory_bearer_token
```

Never commit real secrets, bake them into images, or log their values.

## Security headers and correlation

Every response includes:

- `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`
- Content-Security-Policy (CDN allowlist remains until Alpine/Tailwind are vendored)
- `X-Request-ID` (echoed correlation ID)
- `Strict-Transport-Security` when production and `SESSION_COOKIE_SECURE=true`

Rate limiting (Flask-Limiter) applies to authentication-sensitive traffic when available.

## Optional mTLS (service-to-service)

mTLS is **optional** and typically terminated at a reverse proxy.

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
    }
}
```

The application continues to authorize with the Bearer service credential;
client certificate identity may be mapped at the proxy and forwarded as a
header in a future iteration. Local/reference Compose stacks do not require mTLS.

## Trusted proxies

When TLS terminates upstream, set:

- `SESSION_COOKIE_SECURE=true`
- Proxy `X-Forwarded-Proto` / `X-Forwarded-For` correctly
- Flask `PROXYFIX` / Werkzeug proxy configuration if the app must trust hop headers

## Tests

- `python test_secrets_loader.py` — env/file resolution, production rejection of known defaults
- `python test_constraints.py` / `python test_database_engines.py` — existing coverage

## Follow-ups (FastAPI / SPA plans)

- JWT validation (issuer/audience/JWKS) for service callers once `/api/v1` lands
- Admin auth contract coordination with the embedded React SPA
- Application-level mTLS identity mapping beyond reverse-proxy termination
