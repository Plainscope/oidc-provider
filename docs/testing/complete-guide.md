# Complete Testing Guide

## Overview

The test suite covers OIDC flows, security validations, and unit regressions including the forbidden-credential scan (issue #37).

## Credentials

```
Email:           admin@localhost
Password:        test-password
Client ID:       test-client-id
Client Secret:   local-dev-secret
Redirect URI:    http://localhost:8080/signin-oidc
```

These are intentional non-production placeholders. Do not commit realistic or high-entropy secrets.

## Features covered

- Authorization Code flow
- Token exchange and refresh
- User profile claims
- Logout
- Redirect URI and client authentication validation
- Configuration precedence and production guards

## Running

```bash
docker compose up -d
cd test
npm ci
npx playwright install chromium
npx playwright test --project=chromium
```

Full suite on main/workflow_dispatch: `npm run test:e2e`.

## Related

- [Quick Start](./quick-start.md)
- [Reference](./reference.md)
- [CONTRIBUTING.md](../../CONTRIBUTING.md)
