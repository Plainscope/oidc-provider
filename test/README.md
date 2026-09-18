# OIDC Provider Tests

End-to-end and unit tests for the OIDC provider.

## Setup

```bash
cd test
npm ci
npx playwright install chromium
```

## Running tests

```bash
# Start services from repo root
docker compose up -d

# PR-fast path (Chromium only)
npx playwright test --project=chromium

# Full suite
npm run test:e2e
```

## Test Credentials

The following test credentials are pre-configured:

- **Email**: `admin@localhost`
- **Password**: `test-password`

These credentials are defined in `docker/provider/users.json`.

## OIDC Configuration

The test suite uses the following OIDC configuration:

- **Client ID**: `test-client-id`
- **Client Secret**: `local-dev-secret`
- **Redirect URI**: `http://localhost:8080/signin-oidc`
- **Post-Logout Redirect URI**: `http://localhost:8080/signout-callback-oidc`
- **Scopes**: `openid profile email`

Use only unmistakably non-production placeholders. See CONTRIBUTING.md (Test credentials).

## Authentication Issues

Verify test credentials in `docker/provider/users.json`:

```json
{
  "admin@localhost": {
    "password": "test-password"
  }
}
```

## Unit tests

```bash
# Forbidden credential regression (issue #37)
node --test test/unit/forbidden-credentials.test.js

# Other unit tests (see package.json scripts)
npm run test:unit
```
