# Contributing to OIDC Provider

Thank you for your interest in contributing to the OIDC Provider project!

## Testing

### Test credentials (secret-scanning policy)

Development and test fixtures must use **unmistakably non-production** placeholders so GitHub secret scanning and humans can tell them apart from real secrets.

**Canonical placeholders (preferred):**

| Kind | Canonical value |
|------|-----------------|
| User password | `test-password` / `test-password-2` |
| OAuth client ID | `test-client-id` / `local-dev` |
| OAuth client secret | `local-dev-secret` (local) or `test-secret` (CI preset) |
| Directory bearer token | `local-dev-bearer-token` |
| Cookie signing keys | generate at runtime in non-production; never commit fixed keys |

**Do not commit** high-entropy hex/base64 strings, UUID-shaped client IDs used as defaults, or realistic password phrases. A CI unit test (`test/unit/forbidden-credentials.test.js`) fails the build if previously retired credential-like values reappear in source, config, fixtures, or docs.

When you need a new test secret:

1. Prefer the table above.
2. If you must invent a new value, include an obvious marker such as `test-`, `local-dev-`, or `example-`.
3. Never paste a value that was generated for a real environment into the repository.

Production configuration must reject known development defaults (see `validateProductionConfig` and related unit tests).

See the full CONTRIBUTING guide in the repository for development setup, PR process, and coding standards.
