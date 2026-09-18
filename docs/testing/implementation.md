# Testing implementation notes

- Fixtures: `test/fixtures/auth.fixtures.ts`
- Test user: `admin@localhost` / `test-password`
- Client ID: `test-client-id`
- Client Secret: `local-dev-secret`

Do not reintroduce retired credential-like values. CI enforces this via `test/unit/forbidden-credentials.test.js`.
