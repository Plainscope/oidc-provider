# Testing implementation notes

## Fixtures

- **File**: `test/fixtures/auth.fixtures.ts`
  - Test user: `admin@localhost` / `test-password`
  - OIDC client: `test-client-id` / `local-dev-secret`

## Structure

| Area | Location |
|------|----------|
| E2E specs | `test/e2e/` |
| Unit tests | `test/unit/` |
| Helpers | `test/utils/` |
| Playwright config | `test/playwright.config.ts` |

## Forbidden credential scan

`test/unit/forbidden-credentials.test.js` walks the tree and fails on retired credential-like strings. Remediation: use `test-password`, `local-dev-secret`, `local-dev-bearer-token`, `test-client-id`.

## CI

The `Build And Test` workflow runs the forbidden-credential scan immediately after checkout, then Compose + Playwright.
