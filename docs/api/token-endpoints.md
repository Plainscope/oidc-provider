# Token Endpoints and Management

Comprehensive guide to token creation, validation, and management.

## Token Types

### Access Token

Short-lived token granting access to protected resources.

**Characteristics**:

- Issued by token endpoint
- Sent with requests to `/me` (userinfo) and other protected endpoints
- Typically expires in 15 minutes to 1 hour
- Revocable
- Scope-limited

**Example**:

```
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLWlkIiwic2NvcGUiOiJvcGVuaWQgcHJvZmlsZSIsImV4cCI6MTcwNDEwNzIwMH0.signature
```

### Refresh Token

Long-lived token used to obtain new access tokens.

**Characteristics**:

- Issued with access token (if `offline_access` scope requested)
- Typically expires in 7-30 days
- Used offline (no user interaction needed)
- Enables long-lived sessions
- Revocable
- Should be stored securely (httpOnly cookies or secure storage)

### ID Token

JWT containing user identity information (OpenID Connect specific).

**Characteristics**:

- Contains authenticated user claims
- Cryptographically signed
- Includes `nonce` to prevent token replay
- Contains `sub` (subject/user ID)
- Typically not used for API access
- Not revocable (but signature expires)

**Structure**:

```json
{
  "iss": "https://oidc.example.com",
  "sub": "user-id",
  "aud": "client-id",
  "exp": 1704067200,
  "iat": 1704063600,
  "nonce": "nonce-value",
  "name": "John Doe",
  "email": "john@example.com",
  "email_verified": true
}
```

## Token Endpoints

### Token Endpoint

Main endpoint for obtaining tokens.

#### Authorization Code Exchange

**Request**:

```bash
curl -X POST https://oidc.example.com/token \
  -H "Authorization: Basic $(echo -n 'client_id:client_secret' | base64)" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=AUTH_CODE&redirect_uri=REDIRECT_URI"
```

**Required Parameters**:

- `grant_type`: "authorization_code"
- `code`: Authorization code from `/auth` endpoint
- `redirect_uri`: Must match original redirect_uri
- `client_id`: Client identifier
- `client_secret`: Client secret (if confidential client)

**Response**:

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "abc123def456...",
  "id_token": "eyJhbGciOiJSUzI1NiJ9..."
}
```

#### Refresh Token Exchange

**Request**:

```bash
curl -X POST https://oidc.example.com/token \
  -H "Authorization: Basic $(echo -n 'client_id:client_secret' | base64)" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token&refresh_token=REFRESH_TOKEN"
```

**Parameters**:

- `grant_type`: "refresh_token"
- `refresh_token`: Refresh token from previous response

**Response**:

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "new-refresh-token..."
}
```

#### Client Credentials

**Request**:

```bash
curl -X POST https://oidc.example.com/token \
  -H "Authorization: Basic $(echo -n 'service_id:service_secret' | base64)" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&scope=api"
```

**Parameters**:

- `grant_type`: "client_credentials"
- `scope`: Requested scope(s)

**Response**:

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

## Using Access Tokens

### Userinfo Endpoint

Call protected endpoint with access token:

```bash
curl -X GET https://oidc.example.com/me \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

**Response**:

```json
{
  "sub": "user-id",
  "name": "John Doe",
  "email": "john@example.com",
  "email_verified": true,
  "picture": "https://example.com/photo.jpg"
}
```

### Custom Protected Endpoints

Application endpoints can validate tokens:

```javascript
// Validate token in Express middleware
app.use((req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }
  
  // Validate token signature and expiration
  try {
    const decoded = jwt.verify(token, publicKey);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});
```

## Token Introspection

Check if a token is still valid and active.

### Request

```bash
curl -X POST https://oidc.example.com/introspect \
  -H "Authorization: Basic $(echo -n 'client_id:client_secret' | base64)" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=ACCESS_TOKEN&token_type_hint=access_token"
```

### Response (Valid)

```json
{
  "active": true,
  "scope": "openid profile email",
  "client_id": "my-app",
  "username": "john@example.com",
  "token_type": "Bearer",
  "exp": 1704107200,
  "iat": 1704103600,
  "sub": "user-id",
  "iss": "https://oidc.example.com",
  "aud": "my-app"
}
```

### Response (Invalid/Expired)

```json
{
  "active": false
}
```

## Token Revocation

Revoke an issued token to immediately invalidate it.

### Request

```bash
curl -X POST https://oidc.example.com/revoke \
  -H "Authorization: Basic $(echo -n 'client_id:client_secret' | base64)" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=TOKEN&token_type_hint=access_token"
```

### Parameters

- `token`: Token to revoke
- `token_type_hint`: "access_token" or "refresh_token" (optional)

### Response

Always returns 200 OK (RFC 7009):

```
HTTP/1.1 200 OK
```

### Use Cases

- User logout
- User revokes application access
- Suspected token compromise
- Administrative revocation

## Token Validation

### Client-Side Validation (Frontend)

```javascript
// Check if token needs refresh
function isTokenExpired(token, threshold = 300) {
  const decoded = jwt_decode(token);
  const expiresIn = decoded.exp * 1000 - Date.now();
  return expiresIn < threshold;
}

// Refresh if needed
async function maybeRefreshToken() {
  if (isTokenExpired(accessToken)) {
    const response = await fetch('/api/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    
    const data = await response.json();
    accessToken = data.access_token;
    refreshToken = data.refresh_token;
  }
}
```

### Server-Side Validation (Backend)

```javascript
const jwt = require('jsonwebtoken');

// Get JWKS from provider
const jwksClient = require('jwks-rsa')({
  cache: true,
  cacheMaxAge: 600000,  // 10 minutes
  jwksUri: 'https://oidc.example.com/.well-known/jwks'
});

async function verifyToken(token) {
  try {
    // Get signing key
    const kid = jwt.decode(token, { complete: true }).header.kid;
    const key = await jwksClient.getSigningKey(kid);
    const signingKey = key.getPublicKey();
    
    // Verify token
    const decoded = jwt.verify(token, signingKey);
    
    // Verify claims
    if (decoded.iss !== 'https://oidc.example.com') {
      throw new Error('Invalid issuer');
    }
    if (decoded.aud !== 'my-client-id') {
      throw new Error('Invalid audience');
    }
    
    return decoded;
  } catch (error) {
    throw new Error('Token validation failed: ' + error.message);
  }
}
```

## Token Storage

### Secure Storage for Browsers

**httpOnly Cookies (Recommended)**:

- Secure: Cannot be accessed by JavaScript
- Automatic: Sent with every request
- CSRF: Vulnerable to CSRF attacks (mitigated with SameSite)

```javascript
// Server sets token in httpOnly cookie
res.cookie('access_token', token, {
  httpOnly: true,
  secure: true,  // HTTPS only
  sameSite: 'lax',
  maxAge: 3600000  // 1 hour
});
```

**Secure Local Storage**:

- Not recommended for sensitive tokens
- Accessible to JavaScript (XSS vulnerability)
- Not sent automatically

```javascript
// Vulnerable to XSS
localStorage.setItem('access_token', token);
```

**Session Storage**:

- Cleared when browser tab closes
- Still vulnerable to XSS

```javascript
sessionStorage.setItem('access_token', token);
```

### Secure Storage for Native Apps

**Keychain (iOS)**:

```swift
let attributes: [String: Any] = [
  kSecClass as String: kSecClassGenericPassword,
  kSecAttrAccount as String: "accessToken",
  kSecValueData as String: token.data(using: .utf8)!
]
SecItemAdd(attributes as CFDictionary, nil)
```

**Keystore (Android)**:

```kotlin
val keyStore = KeyStore.getInstance("AndroidKeyStore")
keyStore.load(null)
// Store token in encrypted preferences
```

## Token Expiration Handling

### Access Token Refresh Flow

```
1. Application makes request with access token
2. Endpoint returns 401 Unauthorized (token expired)
3. Application uses refresh token to get new access token
4. Application retries original request
5. Request succeeds with new token
```

### Implementation

```javascript
async function authenticatedFetch(url, options = {}) {
  let response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      ...options.headers
    }
  });
  
  if (response.status === 401) {
    // Token expired, refresh it
    await refreshToken();
    
    // Retry request
    response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        ...options.headers
      }
    });
  }
  
  return response;
}

async function refreshToken() {
  const response = await fetch('https://oidc.example.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=refresh_token&refresh_token=${refreshToken}`
  });
  
  const data = await response.json();
  accessToken = data.access_token;
  refreshToken = data.refresh_token;
}
```

## Error Handling

### Invalid Token Response

```json
{
  "error": "invalid_token",
  "error_description": "Token signature is invalid"
}
```

### Expired Token Response

```json
{
  "error": "token_expired",
  "error_description": "The access token expired"
}
```

### Insufficient Scope Response

```json
{
  "error": "insufficient_scope",
  "error_description": "Token does not have required scope: admin"
}
```

### Handling Errors

```javascript
try {
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) {
    const error = await response.json();
    
    if (error.error === 'token_expired') {
      await refreshToken();
      // Retry
    } else if (error.error === 'invalid_token') {
      // Clear stored tokens and redirect to login
      logout();
    }
  }
} catch (error) {
  console.error('Request failed:', error);
}
```

## Token Rotation

Rotate tokens periodically to limit damage from token compromise.

### Automatic Rotation

```bash
# Force new token generation
POST /token
  grant_type=refresh_token
  refresh_token=REFRESH_TOKEN
  force_rotation=true
```

### Manual Rotation Strategy

```javascript
// Refresh tokens every 30 minutes
setInterval(async () => {
  await refreshToken();
}, 30 * 60 * 1000);
```

## Best Practices

1. **Keep Access Tokens Short-Lived**: 15-60 minutes
2. **Use Refresh Tokens for Extended Access**: 7-30 days
3. **Store Tokens Securely**: Use httpOnly cookies or secure storage
4. **Validate Token Signatures**: Always verify JWTs server-side
5. **Check Token Claims**: Verify issuer, audience, and scope
6. **Implement Token Rotation**: Periodically refresh tokens
7. **Revoke on Logout**: Immediately revoke tokens
8. **Handle Expiration Gracefully**: Implement automatic refresh
9. **Implement Rate Limiting**: Prevent token endpoint abuse
10. **Monitor Token Usage**: Log and audit token issuance
