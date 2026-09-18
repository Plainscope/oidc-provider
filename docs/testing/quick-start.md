# Testing Quick Start

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
