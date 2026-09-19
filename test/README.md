# OIDC Provider Test Suite

Comprehensive test suite for the OIDC provider including end-to-end tests and unit tests.

> Full Documentation: See [Testing Index](../docs/testing/index.md) for complete testing documentation including quick start, implementation details, and comprehensive reference.

## Overview

This test suite includes:

### End-to-End Tests (E2E)

- Authorization Code flow
- Token exchange and validation
- User profile and claims
- Logout flow
- Security validations

### Unit Tests

- Configuration module tests
- Configuration precedence validation
- Array replacement behavior
- Environment variable override behavior
- Prototype pollution protection
- Forbidden credential regression scan (issue #37)

## Prerequisites

- Node.js 18+ with npm
- Docker and Docker Compose (for E2E tests)
- All OIDC provider services running (for E2E tests)

## Installation

```bash
cd test
npm install
npm run playwright:install
```

## Running Tests

### Unit Tests

```bash
npm run test:unit
# Forbidden credential regression
node --test test/unit/forbidden-credentials.test.js
```

### E2E Tests

```bash
# From repo root
docker-compose up -d
cd test
npm run test:e2e
```

### PR fast path (Chromium only)

```bash
npx playwright test --project=chromium
```

## Test Credentials

The following test credentials are pre-configured:

- **Email**: `admin@localhost`
- **Password**: `test-password`

These credentials are defined in `docker/provider/users.json`.

## OIDC Configuration

- **Client ID**: `test-client-id`
- **Client Secret**: `local-dev-secret`
- **Redirect URI**: `http://localhost:8080/signin-oidc`
- **Post-Logout Redirect URI**: `http://localhost:8080/signout-callback-oidc`
- **Scopes**: `openid profile email`

Use only unmistakably non-production placeholders. See CONTRIBUTING.md (Test credentials).

## Service URLs

- **OIDC Provider**: `http://localhost:9080`
- **Demo App**: `http://localhost:8080`

## Environment Variables

See `.env.example`. When using custom ports:

```bash
DEMO_PORT=18080 docker compose up -d
DEMO_BASE_URL=http://localhost:18080 npx playwright test
```

## Troubleshooting

### Authentication Issues

Verify test credentials in `docker/provider/users.json`:

```json
{
  "admin@localhost": {
    "password": "test-password"
  }
}
```

## Viewing Test Results

```bash
npx playwright show-report
```
