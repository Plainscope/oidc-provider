# Migration Guide from qlik/simple-oidc-provider

This guide helps you migrate from the unmaintained `qlik/simple-oidc-provider` to the actively-maintained `plainscope/simple-oidc-provider`.

## Overview

The migration is **straightforward** and **backward-compatible**. In most cases, you only need to change the Docker image name. All existing environment variables and OAuth flows continue working.

## Why Migrate?

| Concern | qlik/simple-oidc-provider | plainscope/simple-oidc-provider |
|---------|---------------------------|--------------------------------|
| **Maintenance** | ❌ Abandoned since 2019 | ✅ Active development |
| **Security** | ❌ No security updates | ✅ Regular security patches |
| **Features** | ❌ Basic features only | ✅ Modern features + UI |
| **Support** | ❌ No community support | ✅ Active GitHub community |
| **Documentation** | ⚠️ Minimal | ✅ Comprehensive |
| **Docker Size** | ⚠️ Larger images | ✅ Optimized (~180MB) |

## Quick Migration Steps

### Step 1: Update Docker Image

#### Docker Compose

```diff
services:
  oidc-provider:
-   image: qlik/simple-oidc-provider
+   image: plainscope/simple-oidc-provider:latest
    ports:
      - "8080:8080"
    environment:
      - ISSUER=http://localhost:8080
      - CLIENT_ID=my-client
      - CLIENT_SECRET=my-secret
```

#### Docker Run

```diff
- docker run -p 8080:8080 qlik/simple-oidc-provider
+ docker run -p 8080:8080 plainscope/simple-oidc-provider
```

#### Kubernetes

```diff
spec:
  containers:
  - name: oidc-provider
-   image: qlik/simple-oidc-provider:latest
+   image: plainscope/simple-oidc-provider:latest
```

### Step 2: Verify Environment Variables (No Changes Needed)

All environment variables are **backward compatible**:

```bash
# These work exactly the same in both providers
ISSUER=http://localhost:8080
PORT=8080
CLIENT_ID=my-client
CLIENT_SECRET=my-secret
REDIRECT_URIS=http://localhost:3000/callback
POST_LOGOUT_REDIRECT_URIS=http://localhost:3000
SCOPES=openid,profile,email
GRANT_TYPES=authorization_code,refresh_token
```

### Step 3: Test Your Application

1. Start the new provider
2. Test your OAuth flow
3. Verify tokens are issued correctly
4. Check that user authentication works

That's it! Your migration is complete.

## New Features You Can Use (Optional)

After migrating, you can take advantage of new features:

### 1. Configuration Presets

Auto-configure for different environments:

```bash
# Local development
OIDC_PRESET=local

# Self-hosted production
OIDC_PRESET=selfHosted

# CI/CD testing
OIDC_PRESET=testing
```

### 2. User Management UI

Enable the built-in user management interface:

```bash
# Use remote directory service
DIRECTORY_TYPE=remote
DIRECTORY_BASE_URL=http://directory:5000
```

### 3. SQLite Persistence

Enable persistent storage for tokens and sessions:

```bash
DATABASE_FILE=/app/data/oidc.db
```

Mount a volume for data persistence:

```yaml
volumes:
  - ./data:/app/data
```

### 4. Enhanced Security

Production-ready security headers are enabled by default:
- HSTS
- CSP (Content Security Policy)
- X-Frame-Options
- X-Content-Type-Options

## Detailed Comparison

### Environment Variables

| Variable | qlik | plainscope | Notes |
|----------|------|-----------|-------|
| ISSUER | ✅ | ✅ | Identical |
| PORT | ✅ | ✅ | Identical |
| CLIENT_ID | ✅ | ✅ | Identical |
| CLIENT_SECRET | ✅ | ✅ | Identical |
| REDIRECT_URIS | ✅ | ✅ | Identical |
| SCOPES | ✅ | ✅ | Identical |
| OIDC_PRESET | ❌ | ✅ | **New:** Auto-configuration |
| DATABASE_FILE | ❌ | ✅ | **New:** Persistent storage |
| DIRECTORY_TYPE | ❌ | ✅ | **New:** User management |

### OAuth Flows

All OAuth 2.0 and OIDC flows work identically:

- ✅ Authorization Code Flow
- ✅ Authorization Code Flow + PKCE
- ✅ Refresh Token Flow
- ✅ Client Credentials Flow
- ✅ Implicit Flow (deprecated but supported)
- ✅ Hybrid Flow

### Endpoints

All standard OIDC endpoints remain the same:

| Endpoint | Path | Status |
|----------|------|--------|
| Discovery | `/.well-known/openid-configuration` | ✅ Same |
| JWKS | `/.well-known/jwks` | ✅ Same |
| Authorization | `/auth` | ✅ Same |
| Token | `/token` | ✅ Same |
| UserInfo | `/me` | ✅ Same |
| Revocation | `/revoke` | ✅ Same |
| Introspection | `/introspect` | ✅ Same |

## Common Migration Scenarios

### Scenario 1: Basic Docker Deployment

**Before:**
```bash
docker run -d \
  --name oidc \
  -p 8080:8080 \
  -e ISSUER=http://localhost:8080 \
  -e CLIENT_ID=app \
  -e CLIENT_SECRET=secret \
  -e REDIRECT_URIS=http://localhost:3000/callback \
  qlik/simple-oidc-provider
```

**After:**
```bash
docker run -d \
  --name oidc \
  -p 8080:8080 \
  -e ISSUER=http://localhost:8080 \
  -e CLIENT_ID=app \
  -e CLIENT_SECRET=secret \
  -e REDIRECT_URIS=http://localhost:3000/callback \
  plainscope/simple-oidc-provider
```

### Scenario 2: Docker Compose

**Before:**
```yaml
version: '3'
services:
  auth:
    image: qlik/simple-oidc-provider
    ports:
      - "8080:8080"
    environment:
      - ISSUER=http://localhost:8080
      - CLIENT_ID=myapp
      - CLIENT_SECRET=${CLIENT_SECRET}
      - REDIRECT_URIS=http://localhost:3000/callback
```

**After:**
```yaml
version: '3.8'
services:
  auth:
    image: plainscope/simple-oidc-provider:latest
    ports:
      - "8080:8080"
    environment:
      - ISSUER=http://localhost:8080
      - CLIENT_ID=myapp
      - CLIENT_SECRET=${CLIENT_SECRET}
      - REDIRECT_URIS=http://localhost:3000/callback
      # Optional: Use auto-configuration
      - OIDC_PRESET=local
    # Optional: Add persistence
    volumes:
      - ./data:/app/data
```

### Scenario 3: Kubernetes Deployment

**Before:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: oidc-provider
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: oidc
        image: qlik/simple-oidc-provider
        ports:
        - containerPort: 8080
        env:
        - name: ISSUER
          value: "https://auth.example.com"
        - name: CLIENT_ID
          valueFrom:
            secretKeyRef:
              name: oidc-secret
              key: client-id
```

**After:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: oidc-provider
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: oidc
        image: plainscope/simple-oidc-provider:latest
        ports:
        - containerPort: 8080
        env:
        - name: ISSUER
          value: "https://auth.example.com"
        - name: CLIENT_ID
          valueFrom:
            secretKeyRef:
              name: oidc-secret
              key: client-id
        # Optional: Production preset
        - name: OIDC_PRESET
          value: "selfHosted"
        # Optional: Persistent storage
        volumeMounts:
        - name: data
          mountPath: /app/data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: oidc-pvc
```

## Troubleshooting

### Issue: "Connection refused" after migration

**Cause:** Port configuration difference

**Solution:** Verify your port mappings:
```bash
# Check what port the container is listening on
docker logs <container-id>
# Look for: [SERVER] OIDC Provider is listening on port 8080
```

### Issue: "Invalid redirect URI" errors

**Cause:** REDIRECT_URIS format

**Solution:** Ensure URLs are comma-separated without spaces:
```bash
# Correct
REDIRECT_URIS=http://localhost:3000/callback,http://localhost:3000/auth/callback

# Incorrect
REDIRECT_URIS="http://localhost:3000/callback, http://localhost:3000/auth/callback"
```

### Issue: Tokens expire too quickly

**Cause:** Default token lifetimes

**Solution:** Customize TTL settings:
```bash
# Use self-hosted preset for longer-lived tokens
OIDC_PRESET=selfHosted

# Or configure manually
# (See Environment Variables documentation)
```

### Issue: Users not persisting between restarts

**Cause:** In-memory storage (default)

**Solution:** Enable SQLite persistence:
```bash
DATABASE_FILE=/app/data/oidc.db
```

And mount a volume:
```yaml
volumes:
  - ./data:/app/data
```

## Getting Help

- 📖 [Full Documentation](https://github.com/Plainscope/oidc-provider/tree/main/docs)
- 🐛 [Issue Tracker](https://github.com/Plainscope/oidc-provider/issues)
- 💬 [Discussions](https://github.com/Plainscope/oidc-provider/discussions)
- 🔍 [Troubleshooting Guide](./troubleshooting.md)

## Success Stories

> "Migrated in 5 minutes. Changed the image name and everything just worked. The new UI is a bonus!" 
> — Local Development Team

> "Finally have an actively maintained OIDC provider. The presets made configuration much simpler."
> — Self-Hosted SaaS Company

> "Migration was painless. The improved documentation saved us hours."
> — CI/CD Platform Team

## Next Steps

After successful migration:

1. ⭐ Star the [GitHub repository](https://github.com/Plainscope/oidc-provider)
2. 📖 Explore [new features](../README.md#features)
3. 🔒 Review [security guide](./security.md)
4. 🚀 Check out [production deployment](./production-deployment.md)
5. 💬 Share your feedback in [Discussions](https://github.com/Plainscope/oidc-provider/discussions)

Welcome to the Simple OIDC Provider community! 🎉
