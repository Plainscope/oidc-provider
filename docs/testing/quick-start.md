# E2E Test Quick Start

## 30-Second Setup

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browsers
npm run playwright:install

# 3. Start services
docker-compose up -d

# 4. Run tests
npm run test:e2e
```

## What Gets Tested ✓

- Complete OIDC authorization flow
- Token generation and exchange
- User profile and claims
- Logout and session termination
- Security validations
- All OpenID Connect endpoints

## Useful Commands

```bash
# Run all tests
npm run test:e2e

# Debug with inspector
npm run test:debug

# See browser while running
npm run test:headed

# Interactive UI mode
npm run test:ui

# View test report
npx playwright show-report

# Record new test
npm run playwright:codegen

# Run specific test
npx playwright test test/e2e/auth-flow.spec.ts

# Run tests matching pattern
npx playwright test -g "should display"

# Run single test
npx playwright test -g "should redirect to authorization endpoint"
```

## Test Credentials

```
Email:    admin@localhost
Password: Rays-93-Accident
```

## Service URLs

- OIDC Provider: <http://localhost:9080>
- Demo App: <http://localhost:8080>

## Test Structure

```
test/
├── e2e/                          # 30+ test cases
│   ├── oidc-provider-endpoints.spec.ts     # Metadata/discovery
│   ├── auth-flow.spec.ts                   # Login flow
│   ├── user-profile.spec.ts                # User claims
│   ├── logout-flow.spec.ts                 # Logout
│   ├── token-flow.spec.ts                  # Token endpoints
│   └── security-validations.spec.ts        # Security tests
├── fixtures/auth.fixtures.ts     # Shared test setup
└── utils/oidc-helper.ts          # OIDC utilities
```

## Common Issues

**Port 9080/8080 in use?**

```bash
docker-compose down
docker system prune -a
docker-compose up -d
```

**Tests timing out?**

- Services may be slow to start (wait 10 seconds)
- Increase timeout in playwright.config.ts

**Need to see what's happening?**

```bash
npm run test:headed          # See browser
npm run test:debug           # Use debugger
npm run test:ui              # Interactive mode
```

## Test Results

After running tests, open the HTML report:

```bash
npx playwright show-report
```

Reports include:

- Test execution timeline
- Screenshots of failures
- Browser logs and traces
- Full test details

## Documentation

- See `test/README.md` for complete guide
- See `TEST-IMPLEMENTATION.md` for detailed overview
- See `test/fixtures/auth.fixtures.ts` for fixtures
- See `test/utils/oidc-helper.ts` for utilities

## CI/CD Integration

Tests are ready for:

- GitHub Actions
- GitLab CI
- Jenkins
- Any Docker-capable CI system

```yaml
# Example GitHub Actions
- name: Run E2E Tests
  run: |
    npm install
    npm run playwright:install
    docker-compose up -d
    npm run test:e2e
    docker-compose down
```

## Next: Add More Tests

Create new test files in `test/e2e/`:

```typescript
import { test, expect } from '../fixtures/auth.fixtures';

test.describe('My Feature', () => {
  test('should work', async ({ authenticatedPage }) => {
    await expect(authenticatedPage.locator('h1')).toContainText('Welcome');
  });
});
```

Then run:

```bash
npx playwright test test/e2e/my-feature.spec.ts
```

## Support

- Playwright docs: <https://playwright.dev>
- OIDC specs: <https://openid.net/specs/openid-connect-core-1_0.html>
- oidc-provider: <https://github.com/panva/node-oidc-provider>
