# Environment Variables Reference

## Server

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Listen port |
| `ISSUER` | `http://localhost:8080` | Issuer URL (HTTPS in production) |
| `PROXY` | `false` | Behind reverse proxy |
| `NODE_ENV` | `production` | `development` or `production` |

## Client

### CLIENT_ID

- Production: supply an explicit high-entropy value
- Local/test examples: `test-client-id` or `local-dev`

### CLIENT_SECRET

- Production: required, ≥32 characters; known development placeholders are rejected
- Local/test examples: `local-dev-secret`
- Generate: `openssl rand -hex 32`

### REDIRECT_URIS / POST_LOGOUT_REDIRECT_URIS

Comma-separated exact-match URIs.

## Cookies

### COOKIES_KEYS

JSON array of signing keys. Production requires explicit strong keys (≥64 chars each). Non-production may generate random keys at startup. Never commit fixed keys.

## Directory

| Variable | Values / notes |
|----------|----------------|
| `DIRECTORY_TYPE` | `local`, `sqlite`, `remote` |
| `DIRECTORY_USERS_FILE` | Path for local JSON |
| `DIRECTORY_DATABASE_FILE` | Path for SQLite |
| `DIRECTORY_BASE_URL` | Remote base URL |
| `DIRECTORY_HEADERS` | e.g. `{"Authorization":"Bearer local-dev-bearer-token"}` |

## Examples

Local:

```bash
CLIENT_ID=test-client-id
CLIENT_SECRET=local-dev-secret
DIRECTORY_TYPE=local
```

Production:

```bash
CLIENT_ID=$(openssl rand -hex 16)
CLIENT_SECRET=$(openssl rand -hex 32)
COOKIES_KEYS="[\"$(openssl rand -hex 32)\"]"
NODE_ENV=production
ISSUER=https://oidc.example.com
```

See CONTRIBUTING.md for the test-credential policy and production rejection of known development defaults.
