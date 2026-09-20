# Remote Directory

## Overview

The provider can authenticate users against an external HTTP directory that implements a small API contract.

## Configuration

```bash
DIRECTORY_TYPE=remote
DIRECTORY_BASE_URL=http://directory:5000
DIRECTORY_HEADERS='{"Authorization":"Bearer local-dev-bearer-token"}'
```

Replace `local-dev-bearer-token` with a strong secret outside local development.

## Validate credentials example

```bash
curl -X POST http://localhost:7090/validate \
  -H "Authorization: Bearer local-dev-bearer-token" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@localhost","password":"test-password"}'
```

## API endpoints

| Method | Path | Purpose |
|--------|------|--------|
| GET | `/count` | User count |
| GET | `/find/:id` | Find by id or email |
| POST | `/validate` | Validate email/password |
| GET | `/healthz` | Health check |

See [Getting Started](../guides/getting-started.md) for the full API contract and [Remote Directory Implementation](../guides/remote-directory-implementation.md) for a sample service.

## Security

- Always authenticate directory calls with a bearer token
- Do not log passwords
- Prefer bcrypt comparison with constant-time checks on the directory side
