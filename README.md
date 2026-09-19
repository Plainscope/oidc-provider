# Simple OIDC Provider

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker Image](https://img.shields.io/badge/docker-plainscope%2Fsimple--oidc--provider-blue.svg)](https://hub.docker.com/r/plainscope/simple-oidc-provider)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Plainscope%2Foidc--provider-blue.svg)](https://github.com/Plainscope/oidc-provider)

> **The modern replacement for `qlik/simple-oidc-provider`** - A production-ready OAuth 2.0 Authorization Server with complete OpenID Connect support, specifically designed for **local development** and **self-hosted scenarios**.

## Problem Statement

Many developers need a simple, reliable OIDC provider for:
- **Local Development**: Testing OAuth flows without external dependencies
- **Self-Hosted Deployments**: Small teams needing authentication without SaaS costs
- **CI/CD Pipelines**: Automated testing of authentication flows
- **Prototyping**: Rapid application development with real authentication

The popular `qlik/simple-oidc-provider` is **no longer maintained**. Simple OIDC Provider provides an actively maintained, Docker-first alternative.

## Quick Start (60 Seconds)

```bash
docker run -p 8080:8080 plainscope/simple-oidc-provider
```

Visit `http://localhost:8080`. Discovery: `http://localhost:8080/.well-known/openid-configuration`

**Default credentials:**
- Email: `admin@localhost`
- Password: `test-password`

### Docker Compose

```bash
git clone https://github.com/Plainscope/oidc-provider.git
cd oidc-provider
docker-compose up
```

Demo: `http://localhost:8080` · Provider: `http://localhost:9080`

Test credentials: `admin@localhost` / `test-password`

## Features

- OAuth 2.0 & OpenID Connect (Authorization Code, PKCE, Refresh, Client Credentials, Device, Hybrid)
- Docker-ready multi-stage image (~180MB)
- Environment and JSON configuration
- Built-in login/consent UI
- Secure defaults (HTTPS, cookies, CSRF)
- TypeScript implementation with auto-configuration presets

## Configuration presets

```bash
# Local
docker run -p 8080:8080 -e OIDC_PRESET=local plainscope/simple-oidc-provider

# Self-hosted
docker run -p 8080:8080 \
  -e OIDC_PRESET=selfHosted \
  -e ISSUER=https://auth.yourcompany.com \
  -e CLIENT_ID=your-app \
  -e CLIENT_SECRET=$(openssl rand -hex 32) \
  -e REDIRECT_URIS=https://app.yourcompany.com/callback \
  plainscope/simple-oidc-provider

# Testing/CI
docker run -p 8080:8080 -e OIDC_PRESET=testing plainscope/simple-oidc-provider
```

Local examples may use `test-client-id` / `local-dev-secret`. Production must supply strong unique secrets.

## Documentation

- [Getting Started](./docs/guides/getting-started.md)
- [Quick Start](./docs/guides/quickstart.md)
- [Docker Deployment](./docs/guides/docker-deployment.md)
- [Environment Variables](./docs/configuration/environment-variables.md)
- [User Management](./docs/configuration/user-management.md)
- [SQLite Directory](./docs/guides/sqlite-directory.md)
- [Testing](./docs/testing/index.md)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md), including the **Test credentials** policy:
`test-password`, `local-dev-secret`, `test-client-id`, `local-dev-bearer-token` — never realistic or high-entropy secrets in the tree.

## License

MIT — see [LICENSE](./LICENSE).

## Acknowledgments

- [node-oidc-provider](https://github.com/panva/node-oidc-provider)
- OAuth 2.0 [RFC 6749](https://tools.ietf.org/html/rfc6749)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
