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

Migrating is straightforward:

### 1. Update Docker Image

```diff
- image: qlik/simple-oidc-provider
+ image: plainscope/simple-oidc-provider
```

### 2. Environment Variables (Compatible)

All environment variables work the same way:

```bash
CLIENT_ID=your-client-id
CLIENT_SECRET=your-secret
REDIRECT_URIS=http://localhost:3000/callback
```

### 3. New Features Available

```bash
# Optional: Use auto-configuration presets
OIDC_PRESET=local  # or selfHosted, testing

# Optional: Enable user management UI
DIRECTORY_TYPE=remote
DIRECTORY_BASE_URL=http://directory:5000
```

### 4. That's It!

No code changes needed. Your existing OAuth flows continue working.

## 🎨 Configuration Presets

Simple OIDC Provider includes smart presets that auto-configure based on your environment:

### Local Development Preset

```bash
# Auto-detected when ISSUER contains localhost
docker run -p 8080:8080 -e OIDC_PRESET=local plainscope/simple-oidc-provider
```

**Features:**
- Pre-configured localhost redirects
- Relaxed security for convenience
- Development interactions enabled
- Extended debug logging

### Self-Hosted Preset

```bash
# For small teams and production self-hosting
docker run -p 8080:8080 \
  -e OIDC_PRESET=selfHosted \
  -e ISSUER=https://auth.yourcompany.com \
  -e CLIENT_ID=your-app \
  -e CLIENT_SECRET=$(openssl rand -hex 32) \
  -e REDIRECT_URIS=https://app.yourcompany.com/callback \
  plainscope/simple-oidc-provider
```

**Features:**
- Production-ready security
- Balanced token lifetimes
- Multiple OAuth flows
- Audit logging ready

### Testing/CI Preset

```bash
# For automated testing and CI/CD
docker run -p 8080:8080 -e OIDC_PRESET=testing plainscope/simple-oidc-provider
```

**Features:**
- Short token lifetimes
- Predictable test credentials
- Fast startup
- Minimal logging

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

### 🚀 Getting Started
- **[Getting Started Guide](./docs/guides/getting-started.md)** ⭐ NEW - Complete guide with users.json schema and API contract
- **[Quick Start](./docs/guides/quickstart.md)** - 60-second setup guide
- **[Installation Guide](./docs/guides/installation.md)** - Detailed setup instructions
- **[Directory Comparison](./docs/guides/directory-comparison.md)** - Choose the right directory type
- **[Docker Deployment](./docs/guides/docker-deployment.md)** - Docker and Docker Compose
- **[Development Guide](./docs/guides/development.md)** - Building and extending

### 📋 Production Deployment
- **[Production Deployment](./docs/guides/production-deployment.md)** - Production best practices
- **[Security Guide](./docs/guides/security.md)** - Security considerations and hardening
- **[Performance Tuning](./docs/guides/performance-tuning.md)** - Optimization and scaling
- **[Troubleshooting](./docs/guides/troubleshooting.md)** - Solutions to common issues

### ⚙️ Configuration
- **[Environment Variables](./docs/configuration/environment-variables.md)** - All configuration options
- **[Client Configuration](./docs/configuration/client-configuration.md)** - Register OAuth clients
- **[User Management](./docs/configuration/user-management.md)** - Manage users and authentication
- **[SQLite Directory](./docs/guides/sqlite-directory.md)** - SQLite directory setup
- **[Management UI](./docs/guides/management-ui.md)** ⭐ NEW - Built-in admin interface
- **[SQLite Adapter](./docs/configuration/sqlite-adapter.md)** - SQLite database adapter for persistent storage

### 🔌 Integration
- **[Remote Directory API](./docs/guides/getting-started.md#remote-directory-api-contract)** ⭐ NEW - API contract for external directories
- **[Remote Directory Implementation](./docs/guides/remote-directory-implementation.md)** - Build your own directory service

### 📚 API Reference
- **[API Endpoints](./docs/api/endpoints.md)** - OpenID Connect endpoints
- **[OAuth Flows](./docs/api/oauth-flows.md)** - Supported authentication flows
- **[Token Management](./docs/api/token-endpoints.md)** - Token handling and validation

### 🧪 Testing
- **[Testing Quick Start](./docs/testing/quick-start.md)** - Get running in 4 commands
- **[Complete Testing Guide](./docs/testing/complete-guide.md)** - Full overview and features
- **[Testing Reference](./docs/testing/reference.md)** - Comprehensive reference

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    OIDC Provider                             │
│                 (docker.io/plainscope/                       │
│               simple-oidc-provider)                          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Node.js + Express                        │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │         oidc-provider Library                    │ │  │
│  │  │   (node-oidc-provider v9.5.2+)                 │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  │                                                       │  │
│  │  OAuth 2.0 Endpoints:                               │  │
│  │  • /auth (Authorization)                            │  │
│  │  • /token (Token Exchange)                          │  │
│  │  • /revoke (Token Revocation)                       │  │
│  │  • /introspect (Token Introspection)                │  │
│  │                                                      │  │
│  │  OpenID Connect Endpoints:                          │  │
│  │  • /.well-known/openid-configuration               │  │
│  │  • /.well-known/jwks                               │  │
│  │  • /me (Userinfo)                                  │  │
│  │  • /session/end (Logout)                                │  │
│  │                                                      │  │
│  │  UI Pages:                                          │  │
│  │  • /interaction/* (Login/Consent)                  │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘ │  │
│                                                              │
│  Configuration:                                             │
│  • Environment Variables                                    │
│  • config.json File                                         │
│  • users.json (User Database)                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Key Configuration

### Minimal Setup

```bash
docker run -d \
  -e ISSUER=https://oidc.example.com \
  -e CLIENT_ID=my-app \
  -e CLIENT_SECRET=secret-key \
  -e REDIRECT_URIS=https://app.example.com/callback \
  docker.io/plainscope/simple-oidc-provider
```

### Advanced Setup with config.json

```bash
docker run -d \
  -e CONFIG_FILE=/app/config.json \
  -v /path/to/config.json:/app/config.json:ro \
  -v /path/to/users.json:/app/dist/users.json:ro \
  docker.io/plainscope/simple-oidc-provider
```

## Supported OAuth 2.0 Flows

| Flow | Use Case | Status |
|------|----------|--------|
| Authorization Code | Web Applications | ✅ Recommended |
| Authorization Code + PKCE | SPAs & Mobile Apps | ✅ Recommended |
| Refresh Token | Token Refresh | ✅ Supported |
| Implicit | Legacy Browsers | ⚠️ Deprecated |
| Client Credentials | Service-to-Service | ✅ Supported |
| Device Authorization | IoT & Smart Devices | ✅ Supported |
| Hybrid | Mixed Flows | ✅ Supported |

## Scopes and Claims

### Standard Scopes

- `openid` - Required for OpenID Connect
- `profile` - User profile information
- `email` - User email and verification status
- `phone` - User phone number
- `address` - User address information
- `offline_access` - Refresh token support

### OpenID Connect Standard Claims

```json
{
  "sub": "user-id",
  "name": "Full Name",
  "given_name": "First",
  "family_name": "Last",
  "email": "user@example.com",
  "email_verified": true,
  "picture": "https://example.com/photo.jpg",
  "phone_number": "+1-555-0123",
  "address": {
    "street_address": "123 Main St",
    "locality": "City",
    "region": "State",
    "postal_code": "12345",
    "country": "Country"
  }
}
```

## Project Structure

```
oidc-provider/
├── src/
│   ├── provider/              # OIDC Provider (Node.js/TypeScript)
│   │   ├── src/
│   │   │   ├── index.ts      # Main server entry point
│   │   │   ├── configuration.ts
│   │   │   ├── profile.ts
│   │   │   └── routes/
│   │   ├── views/            # Pug UI templates
│   │   ├── public/           # Static assets (CSS, images)
│   │   └── Dockerfile
│   │
│   └── demo/                 # .NET Demo Application
│       ├── Pages/
│       ├── OpenIdSettings.cs
│       └── Dockerfile
│
├── docs/                     # Comprehensive documentation
│   ├── guides/
│   ├── configuration/
│   └── api/
│
├── docker/                   # Docker configuration
│   └── provider/
│       └── users.json       # User database
│
├── docker-compose.yml        # Local development setup
└── README.md

```

## Requirements

- **Docker**: 20.10+ (or Docker Desktop)
- **Docker Compose**: 2.0+ (optional, for simplified setup)
- **Node.js**: 20+ (for local development)
- **Memory**: 512MB minimum per container
- **Disk**: 1GB minimum

## Environment Variables

Essential configuration:

```bash
PORT=8080                                          # Server port
ISSUER=https://oidc.example.com                   # Issuer identifier
CLIENT_ID=my-app                                  # OAuth client ID
CLIENT_SECRET=secret-key                          # OAuth client secret
REDIRECT_URIS=https://app.example.com/callback    # Allowed redirect URIs
```

[Full reference](./docs/configuration/environment-variables.md) available.

## Security

### Features

- ✅ HTTPS enforced (configurable)
- ✅ Secure cookie configuration (httpOnly, Secure, SameSite)
- ✅ CSRF protection via state parameter
- ✅ Token signature validation
- ✅ Authorization code single-use
- ✅ Account lockout support
- ✅ Audit logging ready
- ✅ Rate limiting ready

### Production Checklist

See [Security Guide](./docs/guides/security.md) for complete checklist including:

- SSL/TLS configuration
- Credential management
- Rate limiting
- Audit logging
- Database security
- Network hardening
- Compliance considerations

## Contributing

We welcome contributions! Here's how to get started:

### Quick Start

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/YOUR-USERNAME/oidc-provider.git`
3. **Create** a feature branch: `git checkout -b feature/my-feature`
4. **Make** your changes and commit: `git commit -am 'Add my feature'`
5. **Push** to your branch: `git push origin feature/my-feature`
6. **Open** a Pull Request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

### Development Setup

```bash
# Clone repository
git clone https://github.com/Plainscope/oidc-provider.git
cd oidc-provider

# Install dependencies
cd src/provider
npm install

# Build TypeScript
npm run build

# Run in development
npm run dev

# Or use Docker Compose
cd ../..
docker-compose up
```

### Code Standards

- Use TypeScript with strict mode
- Follow existing code style
- Write clear commit messages
- Update documentation for new features
- Add tests for new functionality
- Ensure all tests pass

### Reporting Issues

Found a bug or have a feature request?

1. Check [existing issues](https://github.com/Plainscope/oidc-provider/issues)
2. [Create a new issue](https://github.com/Plainscope/oidc-provider/issues/new) with:
   - Clear description of the problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (Docker version, OS, etc.)

### Security Issues

**DO NOT** open public issues for security vulnerabilities. Email security concerns to the maintainers privately. See [CONTRIBUTING.md](./CONTRIBUTING.md#security-issues) for details.

## License

This project is licensed under the **MIT License** - see the [LICENSE](./LICENSE) file for details.

## Acknowledgments

- Based on [node-oidc-provider](https://github.com/panva/node-oidc-provider) by Panva and contributors
- OAuth 2.0 Authorization Framework [RFC 6749](https://tools.ietf.org/html/rfc6749)
- OpenID Connect Core [1.0 Specification](https://openid.net/specs/openid-connect-core-1_0.html)
- The open-source community

## Support

### Resources

- 📚 [Documentation](./docs)
- 🧪 [Testing Guide](./docs/testing/index.md)
- 🐛 [Issue Tracker](https://github.com/Plainscope/oidc-provider/issues)
