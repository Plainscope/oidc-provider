# Testing Quick Start

Get the OIDC provider test suite running in 4 commands.

## Prerequisites

- Docker and Docker Compose
- Node.js 20+

## Run the stack

```bash
docker compose up -d
cd test && npm ci && npx playwright install chromium
npx playwright test --project=chromium
```

## Default test credentials

Use only the canonical non-production placeholders:

| Field | Value |
|-------|-------|
| Email | `admin@localhost` |
| Password | `test-password` |
| Client ID | `test-client-id` |
| Client Secret | `local-dev-secret` |
| Bearer token | `local-dev-bearer-token` |

These values are intentional test placeholders. Do not commit realistic or high-entropy secrets. See CONTRIBUTING.md (Test credentials).

## Service URLs

- Demo app: `http://localhost:8080`
- OIDC provider: `http://localhost:9080`
- Directory: `http://localhost:7080`

## Next steps

- [Complete Testing Guide](./complete-guide.md)
- [Testing Reference](./reference.md)
- [Implementation details](./implementation.md)
