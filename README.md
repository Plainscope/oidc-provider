# Simple OIDC Provider

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker Image](https://img.shields.io/badge/docker-plainscope%2Fsimple--oidc--provider-blue.svg)](https://hub.docker.com/r/plainscope/simple-oidc-provider)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Plainscope%2Foidc--provider-blue.svg)](https://github.com/Plainscope/oidc-provider)

A production-ready OAuth 2.0 (RFC 6749) Authorization Server with complete OpenID Connect (OIDC) support, built on [node-oidc-provider](https://github.com/panva/node-oidc-provider).

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
- **Password**: `Rays-93-Accident`

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

- **[Getting Started](./docs/guides/quickstart.md)** - Quick start guide
- **[Installation Guide](./docs/guides/installation.md)** - Detailed setup instructions
- **[Docker Deployment](./docs/guides/docker-deployment.md)** - Docker and Docker Compose
- **[Production Deployment](./docs/guides/production-deployment.md)** - Production best practices
- **[Security Guide](./docs/guides/security.md)** - Security considerations and hardening
- **[Configuration Reference](./docs/configuration/environment-variables.md)** - All configuration options
- **[Client Configuration](./docs/configuration/client-configuration.md)** - Register OAuth clients
- **[User Management](./docs/configuration/user-management.md)** - Manage users and authentication
- **[API Endpoints](./docs/api/endpoints.md)** - OpenID Connect endpoints
- **[OAuth Flows](./docs/api/oauth-flows.md)** - Supported authentication flows
- **[Token Management](./docs/api/token-endpoints.md)** - Token handling and validation
- **[Development Guide](./docs/guides/development.md)** - Building and extending
- **[Troubleshooting](./docs/guides/troubleshooting.md)** - Solutions to common issues

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
│  │  • /logout (Logout)                                │  │
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
```

### Contributing Guidelines

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/my-feature`)
3. **Make** your changes and commit (`git commit -am 'Add my feature'`)
4. **Build** and test locally (`npm run build`)
5. **Push** to your branch (`git push origin feature/my-feature`)
6. **Open** a Pull Request

### Code Standards

- Use TypeScript for type safety
- Follow existing code style
- Write clear commit messages
- Update documentation for new features
- Test changes locally

### Reporting Issues

Found a bug or have a feature request?

1. Check [existing issues](https://github.com/Plainscope/oidc-provider/issues)
2. [Create a new issue](https://github.com/Plainscope/oidc-provider/issues/new) with:
   - Clear description of the problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (Docker version, OS, etc.)

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
- 💬 [Discussions](https://github.com/Plainscope/oidc-provider/discussions)
- 🔗 [OAuth 2.0 Spec](https://tools.ietf.org/html/rfc6749)
- 🔗 [OpenID Connect Spec](https://openid.net/specs/openid-connect-core-1_0.html)

### Getting Help

1. Check the [Troubleshooting Guide](./docs/guides/troubleshooting.md)
2. Review [Common Issues](./docs/guides/troubleshooting.md#common-issues)
3. Search [existing issues](https://github.com/Plainscope/oidc-provider/issues)
4. [Open a new issue](https://github.com/Plainscope/oidc-provider/issues/new)

## Testing

This project includes a comprehensive end-to-end test suite using Playwright.

### Quick Start

```bash
cd test
npm install
npm run playwright:install
docker-compose up -d
npm run test:e2e
```

### Test Coverage

- ✅ 30+ test cases across 6 test suites
- ✅ Complete OIDC/OAuth 2.0 flow validation
- ✅ Security and compliance testing
- ✅ Cross-browser support (Chrome, Firefox, WebKit, Mobile)

### Documentation

- 🚀 [Quick Start Guide](./docs/testing/quick-start.md) - Get running in 4 commands
- 📖 [Complete Guide](./docs/testing/complete-guide.md) - Full overview and features
- 🔧 [Implementation Details](./docs/testing/implementation.md) - Technical deep dive
- 📚 [Reference](./docs/testing/reference.md) - Comprehensive reference
- 📋 [Testing Index](./docs/testing/index.md) - Navigation hub

## Support

Future enhancements:

- [ ] Token endpoint analytics and metrics
- [ ] Advanced MFA support (TOTP, WebAuthn)
- [ ] Social login integrations (Google, GitHub, Microsoft)
- [ ] Database backend support (PostgreSQL, MongoDB)
- [ ] LDAP/Active Directory integration
- [ ] Internationalization (i18n)
- [ ] Admin dashboard
- [ ] API key management

## Related Projects

- [node-oidc-provider](https://github.com/panva/node-oidc-provider) - OIDC Provider library
- [node-oauth2-server](https://github.com/oauthjs/node-oauth2-server) - OAuth 2.0 Server
- [Auth0](https://auth0.com) - Commercial OIDC provider
- [Keycloak](https://www.keycloak.org) - Open-source IAM

---

**Made with ❤️ by Plainscope**
