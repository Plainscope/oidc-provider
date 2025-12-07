# OAuth 2.0 Flows

Comprehensive guide to supported OAuth 2.0 and OpenID Connect flows.

## Authorization Code Flow (Recommended)

The most secure flow for web applications. Authorization code is exchanged at the backend for tokens.

### Sequence

```
1. User initiates login in application
2. Application redirects to authorization endpoint
3. Provider displays login and consent screens
4. User authenticates and grants access
5. Provider redirects to application with authorization code
6. Application exchanges code for tokens at backend
7. Application stores tokens securely
8. User is logged in
```

### Implementation Steps

**Step 1: Create Authorization Request**

```bash
https://oidc.example.com/auth?
  response_type=code&
  client_id=my-app&
  redirect_uri=https://app.example.com/callback&
  scope=openid+profile+email&
  state=abc123&
  nonce=xyz789
```

**Step 2: User Authentication**

User is redirected to login page if not authenticated. Provider validates credentials.

**Step 3: Consent Screen**

Provider displays requested scopes and asks for consent (if configured).

**Step 4: Authorization Response**

Provider redirects back to application:

```
https://app.example.com/callback?code=AUTH_CODE&state=abc123
```

**Step 5: Validate State**

Application verifies state parameter matches original request (CSRF protection).

**Step 6: Exchange Code for Tokens**

Backend application calls token endpoint:

```bash
curl -X POST https://oidc.example.com/token \
  -H "Authorization: Basic $(echo -n 'my-app:secret' | base64)" \
  -d "grant_type=authorization_code&code=AUTH_CODE&redirect_uri=https://app.example.com/callback"
```

**Step 7: Token Response**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "abc123...",
  "id_token": "eyJhbGciOiJSUzI1NiJ9..."
}
```

**Step 8: Validate ID Token**

Application validates ID token signature and claims:

- Verify signature
- Check issuer
- Check audience (client_id)
- Verify expiration
- Validate nonce (if provided)

**Step 9: Establish Session**

Application creates user session using ID token claims.

### Security Features

- Authorization code is single-use and short-lived
- Code is server-side, never exposed to browser
- Tokens obtained at backend (secure channel)
- CSRF protection via state parameter
- Token replay prevention via nonce parameter

### Configuration

```bash
docker run -e RESPONSE_TYPES=code -e GRANT_TYPES=authorization_code,refresh_token ...
```

## Refresh Token Flow

Obtain new access token using a refresh token.

### Request

```bash
curl -X POST https://oidc.example.com/token \
  -H "Authorization: Basic $(echo -n 'my-app:secret' | base64)" \
  -d "grant_type=refresh_token&refresh_token=REFRESH_TOKEN"
```

### Response

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### Implementation

```javascript
// Check if access token is expiring
if (accessToken.expiresIn < 60) {
  // Refresh the token
  const response = await fetch('https://oidc.example.com/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa('my-app:secret')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `grant_type=refresh_token&refresh_token=${refreshToken}`
  });
  
  const data = await response.json();
  accessToken = data.access_token;
}
```

### Configuration

```bash
export GRANT_TYPES=authorization_code,refresh_token
export REFRESH_TOKEN_LIFETIME=604800  # 7 days
```

## Implicit Flow (Deprecated)

Direct token return in URL fragment. **Not recommended for new applications.**

### Sequence

```
1. User initiates login in application
2. Application redirects to authorization endpoint
3. Provider displays login screen
4. User authenticates
5. Provider redirects with tokens in URL fragment
6. Application extracts tokens from URL
```

### Request

```
https://oidc.example.com/auth?
  response_type=id_token+token&
  client_id=my-app&
  redirect_uri=https://app.example.com/callback&
  scope=openid+profile&
  state=abc123&
  nonce=xyz789
```

### Response

```
https://app.example.com/callback#
  id_token=eyJhbGciOiJSUzI1NiJ9...&
  access_token=eyJhbGciOiJSUzI1NiJ9...&
  token_type=Bearer&
  expires_in=3600&
  state=abc123
```

### Risks

- Tokens exposed in URL (browser history, server logs, referrer headers)
- No backend validation possible
- Tokens sent to browser
- Legacy browsers may cache tokens

### When to Use

Only for legacy SPAs without backend (and even then, use Authorization Code with PKCE instead).

## Hybrid Flow

Combination of authorization code and implicit flows.

### Response Type: code id_token

```
https://oidc.example.com/auth?
  response_type=code+id_token&
  client_id=my-app&
  redirect_uri=https://app.example.com/callback
```

Response includes both:

```
https://app.example.com/callback?
  code=AUTH_CODE&
  id_token=eyJhbGciOiJSUzI1NiJ9...
```

### Response Type: code token

```
https://oidc.example.com/auth?
  response_type=code+token&
  client_id=my-app&
  redirect_uri=https://app.example.com/callback
```

### Response Type: code id_token token

Returns authorization code, ID token, and access token.

### Use Cases

- Immediate token access for initial requests
- Authorization code for backend verification
- Validate tokens early in session initialization

## Proof Key for Public Clients (PKCE)

Enhanced security for public clients (SPAs, mobile apps) without client secrets.

### Overview

PKCE adds a code verifier and code challenge to prevent authorization code interception attacks.

### Sequence

**Step 1: Generate Code Verifier and Challenge**

```javascript
// Generate random string (43-128 characters)
const codeVerifier = window.crypto.getRandomValues(
  new Uint8Array(32)
).reduce((a, b) => a + String.fromCharCode(b), '');

// Create challenge (base64url hash of verifier)
const buffer = new TextEncoder().encode(codeVerifier);
const hash = await window.crypto.subtle.digest('SHA-256', buffer);
const hashArray = Array.from(new Uint8Array(hash));
const codeChallenge = btoa(String.fromCharCode(...hashArray))
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=/g, '');
```

**Step 2: Authorization Request with Challenge**

```
https://oidc.example.com/auth?
  response_type=code&
  client_id=my-spa&
  redirect_uri=https://app.example.com/callback&
  scope=openid+profile&
  state=abc123&
  nonce=xyz789&
  code_challenge=CHALLENGE&
  code_challenge_method=S256
```

**Step 3: Exchange Code with Verifier**

```bash
curl -X POST https://oidc.example.com/token \
  -d "grant_type=authorization_code&
      code=AUTH_CODE&
      redirect_uri=https://app.example.com/callback&
      client_id=my-spa&
      code_verifier=VERIFIER"
```

### Configuration

```bash
export PKCE_REQUIRED=false  # Make it optional or required
```

## Client Credentials Grant

Service-to-service authentication without user context.

### Use Cases

- Backend services calling APIs
- Microservices authentication
- Scheduled jobs requiring authentication
- Administrative operations

### Request

```bash
curl -X POST https://oidc.example.com/token \
  -H "Authorization: Basic $(echo -n 'my-service:secret' | base64)" \
  -d "grant_type=client_credentials&scope=api"
```

### Response

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### Configuration

```bash
export GRANT_TYPES=client_credentials
export CLIENT_CREDENTIALS_SCOPES=api,admin
```

## Resource Owner Password Credentials Grant

User credentials passed directly. **Deprecated and not recommended.**

### Request

```bash
curl -X POST https://oidc.example.com/token \
  -H "Authorization: Basic $(echo -n 'client_id:secret' | base64)" \
  -d "grant_type=password&
      username=user@example.com&
      password=PASSWORD&
      scope=openid+profile"
```

### Risks

- User credentials exposed to application
- Browser history contains credentials
- Difficult to revoke access
- No user interaction or consent

### When to Use

Only for legacy applications with no alternatives. Use Authorization Code Flow instead.

## Device Authorization Flow

For devices without web browsers or input capabilities.

### Use Cases

- Smart TVs
- IoT devices
- Smart home devices
- CLI tools

### Step 1: Device Authorization Request

```bash
curl -X POST https://oidc.example.com/device_authorization \
  -d "client_id=my-device&scope=openid"
```

### Response

```json
{
  "device_code": "GmRhmhcxhwa...",
  "user_code": "WDJB-MJHT",
  "verification_uri": "https://oidc.example.com/device",
  "verification_uri_complete": "https://oidc.example.com/device?user_code=WDJB-MJHT",
  "expires_in": 1800,
  "interval": 5
}
```

### Step 2: User Authorizes on Separate Device

User enters user_code on their phone/computer at verification_uri.

### Step 3: Device Polls for Authorization

```bash
curl -X POST https://oidc.example.com/token \
  -d "grant_type=urn:ietf:params:oauth:grant-type:device_code&
      device_code=GmRhmhcxhwa&
      client_id=my-device"
```

Polls every `interval` seconds until user authorizes.

### Step 4: Token Response

Once authorized:

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

## OpenID Connect Core vs Extension Flows

### Supported Flows

| Flow | Type | Recommendation |
|------|------|---|
| Authorization Code | Core | ✅ Use for web apps |
| Authorization Code + PKCE | Core | ✅ Use for SPAs/mobile |
| Refresh Token | Core | ✅ Use for token refresh |
| Implicit | Core | ❌ Deprecated |
| Hybrid | Core | ⚠️ Only if needed |
| Client Credentials | Extension | ✅ Use for services |
| Device Flow | Extension | ✅ Use for IoT |
| Resource Owner Password | Legacy | ❌ Avoid |

## Choosing the Right Flow

### Web Application (Backend)

→ Use **Authorization Code Flow**

```
Browser → App Backend → OIDC Provider
```

### Single Page Application (SPA)

→ Use **Authorization Code Flow + PKCE**

```
Browser (SPA) → OIDC Provider → Browser (SPA)
```

### Mobile Application

→ Use **Authorization Code Flow + PKCE**

```
Mobile App → OIDC Provider → Mobile App
```

### Backend Service

→ Use **Client Credentials Flow**

```
Service → OIDC Provider (direct)
```

### IoT Device

→ Use **Device Authorization Flow**

```
Device → OIDC Provider
User (Separate Device) → OIDC Provider
```

## Token Management

### Access Token Lifetime

Access tokens typically expire after 15 minutes to 1 hour to limit damage from token theft.

```bash
export ACCESS_TOKEN_LIFETIME=900  # 15 minutes
```

### Refresh Token Lifetime

Refresh tokens typically expire after 7-30 days, allowing long-lived sessions without user re-authentication.

```bash
export REFRESH_TOKEN_LIFETIME=604800  # 7 days
```

### Token Refresh Strategy

```javascript
// Refresh before expiration
function maybeRefreshToken() {
  const expiresIn = getExpiresIn(accessToken);
  
  if (expiresIn < 300) {  // 5 minutes remaining
    return refreshAccessToken();
  }
  
  return Promise.resolve();
}
```

### Revoking Access

Immediate revocation via token revocation endpoint:

```bash
curl -X POST https://oidc.example.com/revoke \
  -H "Authorization: Basic $(echo -n 'client_id:secret' | base64)" \
  -d "token=ACCESS_TOKEN"
```

Or via logout:

```
https://oidc.example.com/logout?post_logout_redirect_uri=...
```
