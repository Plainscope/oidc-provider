# Quick Start Guide

Get Simple OIDC Provider running in under 60 seconds.

## What is This?

Simple OIDC Provider is a **production-ready OAuth 2.0 Authorization Server** designed specifically for:

- **Local Development**: Test OAuth flows without external dependencies
- **Self-Hosted Deployments**: Small teams needing authentication without SaaS costs
- **CI/CD Pipelines**: Automated testing of authentication flows
- **Prototyping**: Rapid application development with real authentication

This is the **modern replacement** for the unmaintained `qlik/simple-oidc-provider`.

## Fastest Start (30 Seconds)

### One Command

```bash
docker run -p 8080:8080 plainscope/simple-oidc-provider
```

**That's it!** You now have a working OIDC provider at `http://localhost:8080`

### Test It

1. Visit the discovery endpoint:
   ```bash
   curl http://localhost:8080/.well-known/openid-configuration
   ```

2. Default test credentials:
   - **Email**: `admin@localhost`
   - **Password**: `test-password`

3. Try the authorization flow:
   ```
   http://localhost:8080/auth?client_id=local-dev&redirect_uri=http://localhost:3000/callback&response_type=code&scope=openid%20profile%20email
   ```

## Recommended Setup (Docker Compose)

For a full development environment with user management UI:

### 1. Clone the Repository

```bash
git clone https://github.com/Plainscope/oidc-provider.git
cd oidc-provider
```

### 2. Start Services

```bash
docker-compose up
```

### 3. Access Services

- **OIDC Provider**: http://localhost:8080
- **User Directory UI**: http://localhost:5000 (login with bearer token from logs)
- **Discovery**: http://localhost:8080/.well-known/openid-configuration

### 4. Test Authentication

Use the default credentials:
- Email: `admin@localhost`
- Password: `test-password`

## Configuration Presets

Simple OIDC Provider auto-configures based on your needs:

### Local Development (Default)

Perfect for testing on your laptop:

```bash
docker run -p 8080:8080 \
  -e OIDC_PRESET=local \
  plainscope/simple-oidc-provider
```

**Features:**
- Pre-configured localhost redirects
- Relaxed security for convenience
- Debug logging enabled
- Test credentials included

### Self-Hosted Production

For small teams and internal apps:

```bash
docker run -p 8080:8080 \
  -e OIDC_PRESET=selfHosted \
  -e ISSUER=https://auth.yourcompany.com \
  -e CLIENT_ID=your-app \
  -e CLIENT_SECRET=$(openssl rand -hex 32) \
  -e REDIRECT_URIS=https://app.yourcompany.com/callback \
  -v ./data:/app/data \
  plainscope/simple-oidc-provider
```

**Features:**
- Production-ready security
- Persistent storage
- Longer token lifetimes
- Audit logging

### Testing/CI

For automated tests:

```bash
docker run -p 8080:8080 \
  -e OIDC_PRESET=testing \
  plainscope/simple-oidc-provider
```

**Features:**
- Short token lifetimes
- Predictable credentials
- Fast startup
- Minimal logging

## Use Cases

### Use Case 1: Testing Your Application Locally

```bash
# Start OIDC provider
docker run -p 8080:8080 plainscope/simple-oidc-provider

# Configure your app
export OAUTH_ISSUER=http://localhost:8080
export OAUTH_CLIENT_ID=local-dev
export OAUTH_CLIENT_SECRET=local-dev-secret
export OAUTH_REDIRECT_URI=http://localhost:3000/callback

# Run your app
npm start
```

### Use Case 2: Self-Hosting for a Small Team

See [Docker Deployment](./docker-deployment.md) and [Production Deployment](./production-deployment.md).

### Use Case 3: CI/CD Testing

```yaml
# .github/workflows/test.yml
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      oidc:
        image: plainscope/simple-oidc-provider:latest
        ports:
          - 8080:8080
        env:
          OIDC_PRESET: testing
    steps:
      - name: Test OAuth Flow
        run: |
          npm run test:oauth
```

## Custom Configuration

### Minimal Custom Config

```bash
docker run -p 8080:8080 \
  -e ISSUER=http://localhost:8080 \
  -e CLIENT_ID=my-app \
  -e CLIENT_SECRET=my-secret \
  -e REDIRECT_URIS=http://localhost:3000/callback \
  plainscope/simple-oidc-provider
```

## Security Notes

### Development vs Production

**Development (local preset):**
- Easy to use
- Relaxed security
- Pre-configured credentials
- Not for production

**Production (selfHosted preset):**
- Secure by default
- HTTPS enforced
- Strong secrets required
- Audit logging
- Production-ready

### Production Checklist

Before deploying to production:

- [ ] Use HTTPS (`ISSUER=https://...`)
- [ ] Generate strong secrets (`openssl rand -hex 32`)
- [ ] Set `OIDC_PRESET=selfHosted`
- [ ] Enable persistent storage (`-v ./data:/app/data`)
- [ ] Configure proper redirect URIs
- [ ] Set up backup procedures
- [ ] Review [Security Guide](./security.md)

## Next Steps

1. **Integrate with your app** — [OAuth Flow Examples](../api/oauth-flows.md)
2. **Customize configuration** — [Environment Variables](../configuration/environment-variables.md)
3. **Deploy to production** — [Production Deployment Guide](./production-deployment.md)
4. **Manage users** — [User Management](../configuration/user-management.md)
5. **Get help** — [Troubleshooting](./troubleshooting.md)

## Common Issues

### Port already in use

```bash
docker run -p 9080:8080 -e PORT=8080 -e ISSUER=http://localhost:9080 plainscope/simple-oidc-provider
```

### Can't connect from another container

```bash
export ISSUER=http://host.docker.internal:8080
```

### Tokens expire too quickly

```bash
docker run -p 8080:8080 -e OIDC_PRESET=selfHosted plainscope/simple-oidc-provider
```

### Need to persist data between restarts

```bash
docker run -p 8080:8080 -v ./data:/app/data plainscope/simple-oidc-provider
```

## Success!

You now have a working OIDC provider. See [CONTRIBUTING.md](../../CONTRIBUTING.md) for the test-credential policy (`test-password`, `local-dev-secret`, etc.).
