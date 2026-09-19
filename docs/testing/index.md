# Testing Index

Comprehensive testing documentation for the OIDC provider.

## Guides

- [Quick Start](./quick-start.md) — get running in a few commands
- [Complete Guide](./complete-guide.md) — full overview and features
- [Implementation](./implementation.md) — fixtures, helpers, and structure
- [Reference](./reference.md) — configuration and credentials reference

## Test credentials

Use only canonical non-production placeholders:

```
Email:         admin@localhost
Password:      test-password
Client ID:     test-client-id
Client Secret: local-dev-secret
```

See [CONTRIBUTING.md](../../CONTRIBUTING.md) (Test credentials). CI fails if previously retired credential-like values reappear (`test/unit/forbidden-credentials.test.js`).

## Service URLs

| Service | Default URL |
|---------|-------------|
| Demo app | http://localhost:8080 |
| OIDC provider | http://localhost:9080 |
| Directory | http://localhost:7080 |

## Running tests

```bash
# Unit / regression
node --test test/unit/forbidden-credentials.test.js

# E2E (from test/)
cd test && npm ci && npx playwright install chromium
npx playwright test --project=chromium
```

Start services first: `docker compose up -d` from the repository root.
