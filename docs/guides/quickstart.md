# Quick Start Guide

Get Simple OIDC Provider running in under 60 seconds.

## 🎯 What is This?

Simple OIDC Provider is a **production-ready OAuth 2.0 Authorization Server** designed specifically for:

- **Local Development**: Test OAuth flows without external dependencies
- **Self-Hosted Deployments**: Small teams needing authentication without SaaS costs  
- **CI/CD Pipelines**: Automated testing of authentication flows
- **Prototyping**: Rapid application development with real authentication

This is the **modern replacement** for the unmaintained `qlik/simple-oidc-provider`.

## ⚡ Fastest Start (30 Seconds)

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
   - **Password**: `Rays-93-Accident`

3. Try the authorization flow:
   ```
   http://localhost:8080/auth?client_id=local-dev&redirect_uri=http://localhost:3000/callback&response_type=code&scope=openid%20profile%20email
   ```

## 🚀 Recommended Setup (Docker Compose)

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
- Password: `Rays-93-Accident`

## 🎨 Configuration Presets

Simple OIDC Provider auto-configures based on your needs:

### Local Development (Default)

Perfect for testing on your laptop:

```bash
docker run -p 8080:8080 \
  -e OIDC_PRESET=local \
  plainscope/simple-oidc-provider
```

**Features:**
- ✅ Pre-configured localhost redirects
- ✅ Relaxed security for convenience
- ✅ Debug logging enabled
- ✅ Test credentials included

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
- ✅ Production-ready security
- ✅ Persistent storage
- ✅ Longer token lifetimes
- ✅ Audit logging

### Testing/CI

For automated tests:

```bash
docker run -p 8080:8080 \
  -e OIDC_PRESET=testing \
  plainscope/simple-oidc-provider
```

**Features:**
- ✅ Short token lifetimes
- ✅ Predictable credentials
- ✅ Fast startup
- ✅ Minimal logging

## 📦 Use Cases

### Use Case 1: Testing Your Application Locally

You're building a web app and need to test OAuth login:

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

Your app can now authenticate users!

### Use Case 2: Self-Hosting for a Small Team

You have a small team and want authentication without paying for Auth0:

```bash
# Create docker-compose.yml
cat > docker-compose.yml <<EOF
version: '3.8'
services:
  auth:
    image: plainscope/simple-oidc-provider:latest
    ports:
      - "8080:8080"
    environment:
      - ISSUER=https://auth.yourcompany.com
      - OIDC_PRESET=selfHosted
      - CLIENT_ID=\${CLIENT_ID}
      - CLIENT_SECRET=\${CLIENT_SECRET}
      - REDIRECT_URIS=https://app.yourcompany.com/callback
    volumes:
      - auth-data:/app/data
    restart: unless-stopped

  directory:
    image: plainscope/simple-oidc-provider:latest
    command: python /app/src/directory/app.py
    ports:
      - "5000:5000"
    environment:
      - DATABASE_FILE=/app/data/users.db
      - BEARER_TOKEN=\${ADMIN_TOKEN}
    volumes:
      - auth-data:/app/data
    restart: unless-stopped

volumes:
  auth-data:
EOF

# Start services
docker-compose up -d
```

Now you have:
- OAuth provider at `https://auth.yourcompany.com`
- User management UI at port 5000
- Persistent user storage

### Use Case 3: CI/CD Testing

Your CI pipeline needs to test authentication flows:

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
          # Provider is available at http://localhost:8080
          npm run test:oauth
```

## 🔧 Custom Configuration

### Minimal Custom Config

```bash
docker run -p 8080:8080 \
  -e ISSUER=http://localhost:8080 \
  -e CLIENT_ID=my-app \
  -e CLIENT_SECRET=my-secret \
  -e REDIRECT_URIS=http://localhost:3000/callback \
  plainscope/simple-oidc-provider
```

### Full Custom Config

Create a `config.json`:

```json
{
  "clients": [
    {
      "client_id": "my-app",
      "client_secret": "my-secret",
      "client_name": "My Application",
      "redirect_uris": [
        "http://localhost:3000/callback"
      ],
      "post_logout_redirect_uris": [
        "http://localhost:3000"
      ],
      "response_types": ["code"],
      "grant_types": ["authorization_code", "refresh_token"]
    }
  ],
  "scopes": ["openid", "profile", "email", "offline_access"],
  "claims": {
    "openid": ["sub"],
    "email": ["email", "email_verified"],
    "profile": ["name", "given_name", "family_name"]
  }
}
```

Mount it:

```bash
docker run -p 8080:8080 \
  -v $(pwd)/config.json:/app/dist/config.json:ro \
  plainscope/simple-oidc-provider
```

## 🔐 Security Notes

### Development vs Production

**Development (local preset):**
- ✅ Easy to use
- ⚠️ Relaxed security
- ✅ Pre-configured credentials
- ❌ Not for production

**Production (selfHosted preset):**
- ✅ Secure by default
- ✅ HTTPS enforced
- ✅ Strong secrets required
- ✅ Audit logging
- ✅ Production-ready

### Production Checklist

Before deploying to production:

- [ ] Use HTTPS (`ISSUER=https://...`)
- [ ] Generate strong secrets (`openssl rand -hex 32`)
- [ ] Set `OIDC_PRESET=selfHosted`
- [ ] Enable persistent storage (`-v ./data:/app/data`)
- [ ] Configure proper redirect URIs
- [ ] Set up backup procedures
- [ ] Review [Security Guide](./security.md)

## 📖 Next Steps

Now that you have it running:

1. **Integrate with your app**
   - [OAuth Flow Examples](../api/oauth-flows.md)
   - [Token Endpoints](../api/token-endpoints.md)

2. **Customize configuration**
   - [Environment Variables](../configuration/environment-variables.md)
   - [Client Configuration](../configuration/client-configuration.md)

3. **Deploy to production**
   - [Production Deployment Guide](./production-deployment.md)
   - [Security Best Practices](./security.md)

4. **Manage users**
   - [User Management](../configuration/user-management.md)
   - [Remote Directory](../configuration/remote-directory.md)

5. **Get help**
   - [Troubleshooting](./troubleshooting.md)
   - [GitHub Discussions](https://github.com/Plainscope/oidc-provider/discussions)

## 🆘 Common Issues

### Port already in use

```bash
# Change the port
docker run -p 9080:8080 -e PORT=8080 -e ISSUER=http://localhost:9080 plainscope/simple-oidc-provider
```

### Can't connect from another container

```bash
# Use host.docker.internal on Mac/Windows
export ISSUER=http://host.docker.internal:8080

# Or use a Docker network
docker network create auth-network
docker run --network auth-network --name oidc plainscope/simple-oidc-provider
```

### Tokens expire too quickly

```bash
# Use self-hosted preset for longer tokens
docker run -p 8080:8080 -e OIDC_PRESET=selfHosted plainscope/simple-oidc-provider
```

### Need to persist data between restarts

```bash
# Add a volume
docker run -p 8080:8080 -v ./data:/app/data plainscope/simple-oidc-provider
```

## 🎉 Success!

You now have a working OIDC provider! Try these next:

- ⭐ Star the [GitHub repository](https://github.com/Plainscope/oidc-provider)
- 📖 Read the [complete documentation](../README.md)
- 💬 Join [discussions](https://github.com/Plainscope/oidc-provider/discussions)
- 🐛 Report [issues](https://github.com/Plainscope/oidc-provider/issues)


Get the Simple OIDC Provider running in just a few minutes using Docker.

## Prerequisites

- Docker and Docker Compose installed
- Basic understanding of OAuth 2.0 and OpenID Connect

## Running with Docker Compose

The fastest way to get started is using the included `docker-compose.yml`:

```bash
docker-compose up
```

This will start:

- **OIDC Provider** on `http://localhost:9080`
- **Demo Application** on `http://localhost:8080`

## Testing the Provider

1. Open your browser and navigate to `http://localhost:8080`
2. Click the login button
3. You'll be redirected to the OIDC provider's login page
4. Use the following test credentials:
   - **Email**: `admin@localhost`
   - **Password**: `Rays-93-Accident`
5. Grant consent to access your profile
6. You'll be redirected back to the demo application and logged in

## Default Configuration

The docker-compose setup includes:

- **Client ID**: `85125d57-a403-4fe2-84d8-62c6db9b6d73`
- **Client Secret**: `+XiBpec4OAIeFBSbRdGaAGLNz6ZFfAbq`
- **Issuer**: `http://provider:8080`
- **Redirect URI**: `http://localhost:8080/signin-oidc`

## Stopping the Services

```bash
docker-compose down
```

## Next Steps

- See [Installation Guide](installation.md) for custom setup
- Review [Environment Variables](../configuration/environment-variables.md) for configuration options
- Check [Docker Deployment](docker-deployment.md) for production guidelines

## Troubleshooting

If you encounter issues:

1. Check the logs: `docker-compose logs provider`
2. Verify Docker is running: `docker ps`
3. Review the [Troubleshooting Guide](troubleshooting.md)
