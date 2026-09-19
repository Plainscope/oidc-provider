# Simple OIDC Provider

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker Image](https://img.shields.io/badge/docker-plainscope%2Fsimple--oidc--provider-blue.svg)](https://hub.docker.com/r/plainscope/simple-oidc-provider)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Plainscope%2Foidc--provider-blue.svg)](https://github.com/Plainscope/oidc-provider)

> **The modern replacement for `qlik/simple-oidc-provider`** - A production-ready OAuth 2.0 Authorization Server with complete OpenID Connect support, specifically designed for **local development** and **self-hosted scenarios**.

## 🎯 Problem Statement

Many developers need a simple, reliable OIDC provider for:
- **Local Development**: Testing OAuth flows without external dependencies
- **Self-Hosted Deployments**: Small teams needing authentication without SaaS costs
- **CI/CD Pipelines**: Automated testing of authentication flows
- **Prototyping**: Rapid application development with real authentication

The popular `qlik/simple-oidc-provider` is **no longer maintained**, leaving developers without a modern, actively-supported solution.

**Simple OIDC Provider solves this problem** with:
- ✅ Active maintenance and security updates
- ✅ Production-ready with zero configuration
- ✅ Docker-first design for easy deployment
- ✅ Modern TypeScript implementation
- ✅ Comprehensive documentation
- ✅ Built-in user management UI

## ⚡ Quick Start (60 Seconds)

### One-Command Start

```bash
docker run -p 8080:8080 plainscope/simple-oidc-provider
```

That's it! Visit `http://localhost:8080` and you have a working OIDC provider.

**Default credentials:**
- Email: `admin@localhost`
- Password: `test-password`

**Discovery endpoint:** `http://localhost:8080/.well-known/openid-configuration`

### Docker Compose (Recommended)

```bash
git clone https://github.com/Plainscope/oidc-provider.git
cd oidc-provider
docker-compose up
```

Access the provider at `http://localhost:8080`

## Features

✅ **OAuth 2.0 & OpenID Connect Compliance**

- Full RFC 6749 Authorization Server implementation
- Complete OpenID Connect 1.0 specification support
- Multiple authentication flows (Authorization Code, Implicit, Hybrid, Device, Client Credentials)

✅ **Docker-Ready**

- Production-ready Docker image
- Multi-stage build with minimal footprint (~180MB)
- Docker Compose included for quick testing
- Optimized for Kubernetes and containerized environments

✅ **Highly Configurable**

- Environment variable configuration
- JSON configuration file support
- Extensive customization options
- Support for multiple clients

✅ **User-Friendly**

- Built-in login and consent UI with Pug templates
- Customizable styling and branding
- Professional error handling
- Responsive design

✅ **Secure by Default**

- HTTPS enforced in production
- Secure cookie configuration
- Token signing and validation
- Rate limiting ready
- CSRF/XSRF protection

✅ **Developer Friendly**

- TypeScript implementation
- Comprehensive error logging
- RESTful API design
- Well-documented endpoints
- **Auto-configuration presets** for local/self-hosted/testing
- **Quick start wizard** for first-time setup

## 🚀 Why Choose Simple OIDC Provider?

### vs. qlik/simple-oidc-provider (Unmaintained)

| Feature | Simple OIDC Provider | qlik/simple-oidc-provider |
|---------|---------------------|---------------------------|
| Maintenance | ✅ Active | ❌ Discontinued |
| Modern Stack | ✅ TypeScript, Latest Node | ❌ Outdated |
| User Management UI | ✅ Full-featured | ❌ None |
| Auto-configuration | ✅ Smart presets | ❌ Manual only |
| SQLite Persistence | ✅ Built-in | ❌ Memory only |
| Security Updates | ✅ Regular | ❌ None |
| Docker Image Size | ✅ ~180MB | ⚠️ Larger |
| Documentation | ✅ Comprehensive | ⚠️ Limited |

### vs. Keycloak

- ✅ **Lightweight**: 180MB vs 500MB+
- ✅ **Simple**: Zero configuration start vs complex setup
- ✅ **Fast**: Starts in seconds vs minutes
- ❌ **Limited**: Basic features vs enterprise features
- ✅ **Perfect for**: Local dev, small teams, testing
- ❌ **Not for**: Large enterprises needing LDAP/AD, complex SSO

### vs. Auth0/Okta (SaaS)

- ✅ **Self-hosted**: Your infrastructure, your data
- ✅ **Free**: No per-user costs
- ✅ **Offline**: Works without internet
- ✅ **Private**: Data never leaves your network
- ❌ **Limited**: Basic features vs enterprise SaaS
- ✅ **Perfect for**: Development, testing, small deployments

## 📦 Migration from qlik/simple-oidc-provider

### 1. Update Docker Image

```diff
- image: qlik/simple-oidc-provider
+ image: plainscope/simple-oidc-provider
```

### 2. Environment Variables (Compatible)

```bash
CLIENT_ID=your-client-id
CLIENT_SECRET=your-secret
REDIRECT_URIS=http://localhost:3000/callback
```

### 3. New Features Available

```bash
OIDC_PRESET=local  # or selfHosted, testing
DIRECTORY_TYPE=remote
DIRECTORY_BASE_URL=http://directory:5000
```

## 🎨 Configuration Presets

### Local Development Preset

```bash
docker run -p 8080:8080 -e OIDC_PRESET=local plainscope/simple-oidc-provider
```

### Self-Hosted Preset

```bash
docker run -p 8080:8080 \
  -e OIDC_PRESET=selfHosted \
  -e ISSUER=https://auth.yourcompany.com \
  -e CLIENT_ID=your-app \
  -e CLIENT_SECRET=$(openssl rand -hex 32) \
  -e REDIRECT_URIS=https://app.yourcompany.com/callback \
  plainscope/simple-oidc-provider
```

### Testing/CI Preset

```bash
docker run -p 8080:8080 -e OIDC_PRESET=testing plainscope/simple-oidc-provider
```

## Quick Start

### Docker Compose (Recommended)

```bash
git clone https://github.com/Plainscope/oidc-provider.git
cd oidc-provider
docker-compose up
```

Access the demo app at `http://localhost:8080` and OIDC provider at `http://localhost:9080`

Test credentials:

- **Email**: `admin@localhost`
- **Password**: `test-password`

### Docker Run

```bash
docker run -d \
  --name oidc-provider \
  -p 8080:8080 \
  -e ISSUER=http://localhost:8080 \
  -e CLIENT_ID=my-client \
  -e CLIENT_SECRET=$(openssl rand -hex 32) \
  -e REDIRECT_URIS=http://localhost:3000/callback \
  docker.io/plainscope/simple-oidc-provider
```

## Documentation

Complete documentation is available in the [`docs/`](./docs) directory:

### Getting Started
- **[Getting Started Guide](./docs/guides/getting-started.md)**
- **[Quick Start](./docs/guides/quickstart.md)**
- **[Installation Guide](./docs/guides/installation.md)**
- **[Directory Comparison](./docs/guides/directory-comparison.md)**
- **[Docker Deployment](./docs/guides/docker-deployment.md)**
- **[Development Guide](./docs/guides/development.md)**

### Production Deployment
- **[Production Deployment](./docs/guides/production-deployment.md)**
- **[Security Guide](./docs/guides/security.md)**
- **[Performance Tuning](./docs/guides/performance-tuning.md)**
- **[Troubleshooting](./docs/guides/troubleshooting.md)**

### Configuration
- **[Environment Variables](./docs/configuration/environment-variables.md)**
- **[Client Configuration](./docs/configuration/client-configuration.md)**
- **[User Management](./docs/configuration/user-management.md)**
- **[SQLite Directory](./docs/guides/sqlite-directory.md)**
- **[Management UI](./docs/guides/management-ui.md)**
- **[SQLite Adapter](./docs/configuration/sqlite-adapter.md)**

### Integration
- **[Remote Directory API](./docs/guides/getting-started.md#remote-directory-api-contract)**
- **[Remote Directory Implementation](./docs/guides/remote-directory-implementation.md)**

### API Reference
- **[API Endpoints](./docs/api/endpoints.md)**
- **[OAuth Flows](./docs/api/oauth-flows.md)**
- **[Token Management](./docs/api/token-endpoints.md)**

### Testing
- **[Testing Quick Start](./docs/testing/quick-start.md)**
- **[Complete Testing Guide](./docs/testing/complete-guide.md)**
- **[Testing Reference](./docs/testing/reference.md)**

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines, including the **Test credentials** policy (use `test-password`, `local-dev-secret`, `test-client-id`, `local-dev-bearer-token` — never realistic or high-entropy secrets).

### Development Setup

```bash
git clone https://github.com/Plainscope/oidc-provider.git
cd oidc-provider
cd src/provider && npm install && npm run build && npm run dev
```

Or use Docker Compose from the repository root: `docker-compose up`.

## License

This project is licensed under the **MIT License** - see the [LICENSE](./LICENSE) file for details.

## Acknowledgments

- Based on [node-oidc-provider](https://github.com/panva/node-oidc-provider) by Panva and contributors
- OAuth 2.0 Authorization Framework [RFC 6749](https://tools.ietf.org/html/rfc6749)
- OpenID Connect Core [1.0 Specification](https://openid.net/specs/openid-connect-core-1_0.html)
- The open-source community

## Support

- [Documentation](./docs)
- [Testing Guide](./docs/testing/index.md)
- [Issue Tracker](https://github.com/Plainscope/oidc-provider/issues)
- [Discussions](https://github.com/Plainscope/oidc-provider/discussions)
