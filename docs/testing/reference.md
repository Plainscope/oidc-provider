# Testing Reference

## Credentials

```
Email:         admin@localhost
Password:      test-password
Client ID:     test-client-id
Client Secret: local-dev-secret
Redirect URI:  http://localhost:8080/signin-oidc
```

Canonical placeholders only — see CONTRIBUTING.md (Test credentials).

## Environment overrides

See `test/.env.example`:

```bash
DEMO_BASE_URL=http://localhost:8080
PROVIDER_BASE_URL=http://localhost:9080
DIRECTORY_BASE_URL=http://localhost:7080
# PROVIDER_CLIENT_ID=test-client-id
# PROVIDER_CLIENT_SECRET=local-dev-secret
```

Keep `DEMO_BASE_URL` in sync with Compose `DEMO_PORT` when ports are remapped.

## Unit regression: forbidden credentials

```bash
node --test test/unit/forbidden-credentials.test.js
```

Fails if retired values reappear in tracked files. The scan excludes the test file itself.

## Playwright

- Config: `test/playwright.config.ts`
- Fixtures: `test/fixtures/auth.fixtures.ts`
- Specs: `test/e2e/*.spec.ts`
