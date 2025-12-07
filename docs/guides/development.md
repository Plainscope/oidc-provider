# Development Guide

Guide for building, extending, and developing the OIDC provider.

## Prerequisites

- Node.js 20+ or Docker
- TypeScript 5.3+
- Git
- Basic knowledge of OAuth 2.0 and OpenID Connect

## Setting Up Development Environment

### Clone the Repository

```bash
git clone https://github.com/Plainscope/oidc-provider.git
cd oidc-provider
```

### Install Dependencies

```bash
cd src/provider
npm install
```

### Build the Project

```bash
# One-time build
npm run build

# Watch mode (rebuild on file changes)
npm run dev

# Clean build artifacts
npm run clean
```

## Project Structure

```
src/provider/
├── src/
│   ├── index.ts           # Main server entry point
│   ├── configuration.ts   # OIDC configuration
│   ├── profile.ts         # User profile/account management
│   ├── user.ts            # Individual user model
│   ├── users.ts           # User database/storage
│   └── routes/
│       └── interactions.ts # Login/consent/logout routes
├── views/                  # Pug templates
│   ├── layout.pug
│   ├── login.pug
│   ├── consent.pug
│   ├── confirm.pug
│   ├── abort.pug
│   ├── error.pug
│   └── Auth/
│       └── SignedOut.pug
├── public/                 # Static assets
│   └── styles.css
├── Dockerfile             # Container image definition
├── package.json           # Dependencies and scripts
└── tsconfig.json          # TypeScript configuration
```

## Making Code Changes

### TypeScript Files

```bash
# Edit source files in src/
vim src/configuration.ts

# Rebuild
npm run build

# Changes are compiled to dist/
```

### View Templates

```bash
# Edit Pug templates (no rebuild needed for templates)
vim views/login.pug
```

### Styling

```bash
# Edit CSS
vim public/styles.css
```

## Running Locally

### Development Mode

```bash
# Terminal 1: Rebuild on changes
npm run dev

# Terminal 2: Run the provider
NODE_ENV=development PORT=8080 ISSUER=http://localhost:8080 \
  CLIENT_ID=dev-client CLIENT_SECRET=dev-secret \
  REDIRECT_URIS=http://localhost:3000/callback \
  node dist/index.js
```

### With Docker

```bash
# Build image
docker build -t oidc-provider:dev .

# Run container
docker run -d --name oidc-dev \
  -p 8080:8080 \
  -e PORT=8080 \
  -e ISSUER=http://localhost:8080 \
  -e CLIENT_ID=dev-client \
  -e CLIENT_SECRET=dev-secret \
  oidc-provider:dev

# View logs
docker logs -f oidc-dev

# Stop
docker stop oidc-dev
```

## Key Files to Understand

### index.ts - Main Server

```typescript
// Sets up Express app, OIDC provider, and routes
// Key components:
// - Express configuration
// - OIDC Provider initialization
// - Route registration
// - Error handling
```

### configuration.ts - OIDC Configuration

```typescript
// Loads OIDC configuration from:
// 1. Environment variables
// 2. config.json file
// 3. Defaults
// 
// Configures:
// - Client metadata
// - Supported scopes
// - Claims mapping
// - Cookie settings
```

### profile.ts - Account Management

```typescript
// Implements OIDC findAccount() for user lookup
// Returns user profile data for authorization
```

### users.ts - User Storage

```typescript
// Manages user database
// Supports user lookup, authentication
// Currently file-based (JSON)
```

### interactions.ts - Authorization Flow

```typescript
// Handles user interactions:
// - Login page rendering
// - Credential validation
// - Consent screen
// - Logout
```

## Adding Features

### Adding a New OAuth Scope

1. **Update configuration.ts**:

```typescript
scopes: ['openid', 'profile', 'email', 'custom_scope']
```

2. **Add claims mapping**:

```typescript
claims: {
  custom_scope: ['custom_claim1', 'custom_claim2']
}
```

3. **Return claims in profile.ts**:

```typescript
return {
  // ... existing claims
  custom_claim1: user.customData?.claim1
}
```

### Adding Custom Routes

1. **Create new route file**:

```typescript
// src/routes/custom.ts
import { Router } from 'express';

export default function useCustomRoutes(app) {
  app.get('/api/custom', (req, res) => {
    res.json({ message: 'Custom endpoint' });
  });
}
```

2. **Register in index.ts**:

```typescript
import useCustomRoutes from './routes/custom';
useCustomRoutes(app, provider);
```

### Adding New User Fields

1. **Update users.json schema**:

```json
{
  "id": "user-id",
  "email": "user@example.com",
  "password": "hashed-password",
  "custom_field": "value"
}
```

2. **Update Profile.ts**:

```typescript
return {
  // ...existing claims
  custom_field: account.custom_field
}
```

### Custom Styling

Edit `public/styles.css`:

```css
.login-form {
  /* Add custom styles */
}

.consent-screen {
  /* Custom consent styling */
}
```

## Testing

### Manual Testing with curl

```bash
# Get OpenID configuration
curl http://localhost:8080/.well-known/openid-configuration

# Authorization request
curl -v "http://localhost:8080/auth?client_id=CLIENT_ID&response_type=code&scope=openid&redirect_uri=http://localhost:3000/callback&state=STATE"

# Token request
curl -X POST http://localhost:8080/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=AUTH_CODE&client_id=CLIENT_ID&client_secret=CLIENT_SECRET&redirect_uri=REDIRECT_URI"

# Userinfo endpoint
curl -H "Authorization: Bearer ACCESS_TOKEN" \
  http://localhost:8080/me
```

### Client Testing

```bash
# Test with demo app
docker-compose up

# Access http://localhost:8080
# Go through auth flow
```

## Environment Variables for Development

```bash
export NODE_ENV=development
export PORT=8080
export ISSUER=http://localhost:8080
export CLIENT_ID=dev-client
export CLIENT_SECRET=dev-secret
export REDIRECT_URIS=http://localhost:3000/callback,http://localhost:4000/callback
export POST_LOGOUT_REDIRECT_URIS=http://localhost:3000/logout
export FEATURES_DEV_INTERACTIONS=true
export LOG_LEVEL=debug
```

## Debugging

### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "OIDC Provider",
      "program": "${workspaceFolder}/src/provider/dist/index.js",
      "preLaunchTask": "npm: build",
      "env": {
        "NODE_ENV": "development",
        "PORT": "8080",
        "ISSUER": "http://localhost:8080",
        "CLIENT_ID": "dev-client",
        "CLIENT_SECRET": "dev-secret"
      },
      "console": "integratedTerminal"
    }
  ]
}
```

### Console Logging

Already implemented throughout codebase:

```typescript
console.log('[MODULE_NAME] Message', data);
console.error('[ERROR] Error message', error);
```

### Request Logging

The provider logs all requests:

```typescript
provider.use(async (ctx, next) => {
  console.log(`[PROVIDER] ${ctx.method} ${ctx.path}`);
  await next();
});
```

## Building Docker Image

### Build

```bash
docker build -t plainscope/simple-oidc-provider:latest .
```

### Test Image

```bash
docker run -p 8080:8080 plainscope/simple-oidc-provider:latest
```

### Push to Registry

```bash
docker tag plainscope/simple-oidc-provider:latest docker.io/plainscope/simple-oidc-provider:latest
docker push docker.io/plainscope/simple-oidc-provider:latest
```

## Dependencies

### Runtime Dependencies

- **express**: Web framework
- **oidc-provider**: OAuth 2.0 / OpenID Connect implementation
- **pug**: Template engine

### Dev Dependencies

- **typescript**: TypeScript compiler
- **@types/node**: Node.js type definitions
- **@types/oidc-provider**: OIDC provider type definitions

### Updating Dependencies

```bash
# Check for updates
npm outdated

# Update all
npm update

# Update specific package
npm install express@latest

# Audit for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

## Code Quality

### TypeScript Compilation

```bash
# Check for type errors
npm run build

# Watch mode shows errors immediately
npm run dev
```

### Code Style

Follow existing conventions:

- Use TypeScript for type safety
- Use const/let (not var)
- Use arrow functions
- Use async/await
- Consistent indentation (2 spaces)

## Contributing Guidelines

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes and commit: `git commit -am 'Add my feature'`
4. Build and test: `npm run build`
5. Push to branch: `git push origin feature/my-feature`
6. Open a Pull Request

## Performance Optimization

### Memory Optimization

- Cache user lookups if implementing persistent storage
- Limit concurrent connections if needed
- Use connection pooling for database

### Request Optimization

- Implement caching for OIDC configuration
- Minimize redirect chains
- Optimize view rendering

## Additional Resources

- [node-oidc-provider Documentation](https://github.com/panva/node-oidc-provider)
- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [OpenID Connect 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [Express.js Guide](https://expressjs.com/)
