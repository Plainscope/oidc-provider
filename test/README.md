# OIDC Provider Test Suite

Comprehensive test suite for the OIDC provider including end-to-end tests and unit tests.

> 📚 **Full Documentation**: See [Testing Index](../docs/testing/index.md) for complete testing documentation including quick start, implementation details, and comprehensive reference.

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

## Prerequisites

- Node.js 18+ with npm
- Docker and Docker Compose (for E2E tests)
- All OIDC provider services running (for E2E tests)

## Installation

1. Navigate to test directory:

```bash
cd test
```

2. Install dependencies:

```bash
npm install
```

3. Install Playwright browsers (for E2E tests):

```bash
npm run playwright:install
```

## Running Tests

### Unit Tests

Run unit tests for the configuration module:

```bash
npm run test:unit
```

Note: The provider must be built first (`npm run build` in `src/provider`).

### E2E Tests

### Start Services

First, ensure the OIDC provider and demo app are running from the root directory:

```bash
cd ..
docker-compose up -d
cd test
```

### Run All Tests

```bash
npm run test:e2e
```

### Run Specific Test File

```bash
npx playwright test test/e2e/auth-flow.spec.ts
```

### Run Tests in UI Mode

```bash
npm run test:debug
```

### Run Tests in Headed Mode (see browser)

```bash
npm run test:headed
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

## Test Files

### 1. **OIDC Provider Endpoints** (`oidc-provider-endpoints.spec.ts`)

- Tests OpenID Configuration metadata
- Validates JWKS endpoint
- Verifies issuer configuration
- Tests all required endpoints

### 2. **Authorization Flow** (`auth-flow.spec.ts`)

- Tests authorization endpoint redirect
- Validates login form display
- Tests credential validation
- Verifies authorization code generation
- Tests state parameter handling

### 3. **User Profile and Claims** (`user-profile.spec.ts`)

- Tests profile page access
- Validates profile claims display
- Tests scope-specific claims (profile, email, openid)
- Verifies claims persistence

### 4. **Logout Flow** (`logout-flow.spec.ts`)

- Tests logout endpoint
- Validates session termination
- Tests protected resource access after logout
- Verifies re-authentication after logout

### 5. **Token Flow** (`token-flow.spec.ts`)

- Tests token endpoint
- Validates authorization code exchange
- Tests client credential validation
- Tests refresh token flow
- Validates token introspection/revocation endpoints

### 6. **Security Validations** (`security-validations.spec.ts`)

- Tests HTTPS requirement (development exception)
- Validates cookie security attributes (HttpOnly, SameSite)
- Tests redirect URI validation
- Tests authorization parameter validation
- Tests client authentication enforcement
- Tests open redirect prevention

## Test Credentials

The following test credentials are pre-configured:

- **Email**: `admin@localhost`
- **Password**: `Rays-93-Accident`

These credentials are defined in `docker/provider/users.json`.

## OIDC Configuration

The test suite uses the following OIDC configuration:

- **Client ID**: `85125d57-a403-4fe2-84d8-62c6db9b6d73`
- **Client Secret**: `+XiBpec4OAIeFBSbRdGaAGLNz6ZFfAbq`
- **Redirect URI**: `http://localhost:8080/signin-oidc`
- **Post-Logout Redirect URI**: `http://localhost:8080/signout-callback-oidc`
- **Scopes**: `openid profile email`

## Service URLs

- **OIDC Provider**: `http://localhost:9080`
- **Demo App**: `http://localhost:8080`

## Test Configuration

Configuration is in `playwright.config.ts`:

- **Base URL**: `http://localhost:8080` (demo app)
- **Timeout**: 30 seconds
- **Retries**: 1 (except CI: 2)
- **Workers**: Parallel by default
- **Reporter**: HTML report

## Environment Variables

- `CI`: Set to `true` for CI environment (stricter settings)

## Troubleshooting

### Services Not Starting

If tests fail to start services, manually start them:

```bash
docker-compose up -d
```

### Port Already in Use

If port 9080 or 8080 is in use:

```bash
docker-compose down
docker system prune -a
docker-compose up -d
```

### Timeout Issues

If tests timeout, increase timeout in `playwright.config.ts`:

```typescript
use: {
  navigationTimeout: 60000,
  actionTimeout: 30000,
}
```

### Authentication Issues

Verify test credentials in `docker/provider/users.json`:

```json
{
  "admin@localhost": {
    "password": "Rays-93-Accident"
  }
}
```

## Viewing Test Results

After tests complete, view the HTML report:

```bash
npx playwright show-report
```

## Debug Mode

Run tests in debug mode with inspector:

```bash
npx playwright test --debug
```

Or with UI:

```bash
npx playwright test --ui
```

## CI/CD Integration

### GitHub Actions

Add to `.github/workflows/e2e.yml`:

```yaml
- name: Run E2E Tests
  run: |
    docker-compose up -d
    npm run test:e2e
    docker-compose down
```

### Environment Setup

For CI environments:

1. Set `CI=true` environment variable
2. Use headless browsers (default)
3. Increase timeouts for slower systems
4. Use single worker process

## Performance Notes

- Tests run in parallel by default (4 workers)
- Each test takes 3-5 seconds
- Full suite completes in ~2 minutes
- Slower on first run (docker-compose startup)

## Adding New Tests

1. Create test file in `test/e2e/`
2. Import fixtures: `import { test, expect } from '../fixtures/auth.fixtures';`
3. Use authenticated page: `test('name', async ({ authenticatedPage }) => { ... })`
4. Run test: `npx playwright test test/e2e/your-test.spec.ts`

Example:

```typescript
import { test, expect } from '../fixtures/auth.fixtures';

test.describe('My Feature', () => {
  test('should work', async ({ authenticatedPage }) => {
    await expect(authenticatedPage.locator('h1')).toContainText('Welcome');
  });
});
```

## Utilities

### OIDC Helper (`test/utils/oidc-helper.ts`)

Provides utility functions:

- `getOIDCConfiguration()`: Fetch OIDC metadata
- `getJWKS()`: Fetch signing keys
- `verifyToken()`: Verify JWT token
- `decodeToken()`: Decode token without verification
- `buildAuthorizationUrl()`: Build OAuth authorization URL
- `extractAuthorizationCode()`: Extract code from redirect
- `isTokenExpired()`: Check token expiration
- `waitForService()`: Wait for service availability

## References

- [Playwright Documentation](https://playwright.dev)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [OAuth 2.0 Authorization Framework](https://tools.ietf.org/html/rfc6749)
- [oidc-provider Documentation](https://github.com/panva/node-oidc-provider)
