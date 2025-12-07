# OpenID Connect Endpoints

Reference for all OpenID Connect protocol endpoints provided by the OIDC provider.

## Metadata Endpoint

Returns provider configuration and capabilities.

### Request

```http
GET /.well-known/openid-configuration
```

### Response

```json
{
  "issuer": "https://oidc.example.com",
  "authorization_endpoint": "https://oidc.example.com/auth",
  "token_endpoint": "https://oidc.example.com/token",
  "userinfo_endpoint": "https://oidc.example.com/me",
  "end_session_endpoint": "https://oidc.example.com/logout",
  "jwks_uri": "https://oidc.example.com/.well-known/jwks",
  "registration_endpoint": "https://oidc.example.com/register",
  "scopes_supported": [
    "openid",
    "profile",
    "email",
    "phone",
    "address",
    "offline_access"
  ],
  "response_types_supported": [
    "code",
    "id_token",
    "token"
  ],
  "grant_types_supported": [
    "authorization_code",
    "implicit",
    "refresh_token"
  ],
  "response_modes_supported": [
    "form_post",
    "fragment",
    "query"
  ],
  "subject_types_supported": [
    "public"
  ],
  "id_token_signing_alg_values_supported": [
    "RS256"
  ],
  "token_endpoint_auth_methods_supported": [
    "client_secret_basic",
    "client_secret_post"
  ],
  "claim_types_supported": [
    "normal"
  ],
  "claims_supported": [
    "sub",
    "name",
    "given_name",
    "family_name",
    "email",
    "email_verified",
    "phone_number",
    "address"
  ],
  "claim_parameter_supported": false,
  "request_parameter_supported": false,
  "request_uri_parameter_supported": false
}
```

## JWKS Endpoint

Returns public keys for verifying tokens.

### Request

```http
GET /.well-known/jwks
```

### Response

```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "kid": "key-1",
      "n": "...",
      "e": "AQAB"
    }
  ]
}
```

## Authorization Endpoint

Initiates the OAuth 2.0 authorization flow.

### Request

```http
GET /auth?
  response_type=code&
  client_id=CLIENT_ID&
  redirect_uri=REDIRECT_URI&
  scope=SCOPE&
  state=STATE&
  nonce=NONCE
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `response_type` | String | Yes | `code` for authorization code flow |
| `client_id` | String | Yes | Client identifier |
| `redirect_uri` | String | Yes | Redirect URL for response (must match configured) |
| `scope` | String | Yes | Requested scopes (space-separated, must include `openid`) |
| `state` | String | Recommended | CSRF protection token |
| `nonce` | String | Recommended | Value to link ID token to request |
| `response_mode` | String | No | `query`, `fragment`, or `form_post` |
| `prompt` | String | No | `login`, `consent`, `select_account`, or `none` |
| `max_age` | Number | No | Maximum authentication age in seconds |
| `ui_locales` | String | No | Preferred locales (space-separated) |
| `id_token_hint` | String | No | Previously issued ID token |
| `login_hint` | String | No | Hint about user identity |
| `display` | String | No | `page`, `popup`, `touch`, or `wap` |
| `acr_values` | String | No | Requested authentication context class |

### Response

Redirects to `redirect_uri` with:

```
REDIRECT_URI?code=AUTHORIZATION_CODE&state=STATE
```

### Example

```bash
curl -X GET "https://oidc.example.com/auth?response_type=code&client_id=my-app&redirect_uri=https://app.example.com/callback&scope=openid+profile+email&state=abc123&nonce=xyz789"
```

## Token Endpoint

Exchanges authorization code for tokens.

### Request

```http
POST /token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=AUTHORIZATION_CODE&
redirect_uri=REDIRECT_URI&
client_id=CLIENT_ID&
client_secret=CLIENT_SECRET
```

### Authentication Methods

#### HTTP Basic Auth (Recommended)

```bash
Authorization: Basic base64(client_id:client_secret)
```

#### POST Body

```
client_id=CLIENT_ID&
client_secret=CLIENT_SECRET
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `grant_type` | String | Yes | `authorization_code` or `refresh_token` |
| `code` | String | Yes (auth_code) | Authorization code from `/auth` endpoint |
| `redirect_uri` | String | Yes (auth_code) | Must match original redirect_uri |
| `refresh_token` | String | Yes (refresh) | Refresh token from previous response |
| `client_id` | String | Yes | Client identifier |
| `client_secret` | String | Yes | Client secret (if configured) |

### Response

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "abc123def456...",
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Example

```bash
curl -X POST https://oidc.example.com/token \
  -H "Authorization: Basic $(echo -n 'my-app:secret' | base64)" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=AUTH_CODE&redirect_uri=https://app.example.com/callback"
```

## Userinfo Endpoint

Returns authenticated user's profile information.

### Request

```http
GET /me
Authorization: Bearer ACCESS_TOKEN
```

### Response

```json
{
  "sub": "user-id",
  "name": "John Doe",
  "given_name": "John",
  "family_name": "Doe",
  "email": "john@example.com",
  "email_verified": true,
  "picture": "https://example.com/photo.jpg",
  "phone_number": "+1-555-0123",
  "phone_number_verified": true,
  "address": {
    "formatted": "123 Main Street, Anytown, ST 12345, USA",
    "street_address": "123 Main Street",
    "locality": "Anytown",
    "region": "ST",
    "postal_code": "12345",
    "country": "USA"
  }
}
```

### Example

```bash
curl -X GET https://oidc.example.com/me \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

## Logout Endpoint

Terminates the user's session and redirects after logout.

### Request

```http
GET /logout?
  id_token_hint=ID_TOKEN&
  post_logout_redirect_uri=REDIRECT_URI&
  state=STATE
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id_token_hint` | String | No | Previously issued ID token |
| `post_logout_redirect_uri` | String | No | Redirect URI after logout (must be configured) |
| `state` | String | No | Value passed back in redirect |

### Response

Redirects to `post_logout_redirect_uri` with state:

```
POST_LOGOUT_REDIRECT_URI?state=STATE
```

### Example

```bash
curl -X GET "https://oidc.example.com/logout?post_logout_redirect_uri=https://app.example.com/goodbye&state=xyz123"
```

## Token Introspection Endpoint

Check if a token is valid and active.

### Request

```http
POST /introspect
Authorization: Basic base64(client_id:client_secret)
Content-Type: application/x-www-form-urlencoded

token=ACCESS_TOKEN&
token_type_hint=access_token
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | String | Yes | Token to introspect |
| `token_type_hint` | String | No | `access_token` or `refresh_token` |

### Response (Valid Token)

```json
{
  "active": true,
  "scope": "openid profile email",
  "client_id": "my-app",
  "username": "john@example.com",
  "token_type": "Bearer",
  "exp": 1704067200,
  "iat": 1704063600,
  "sub": "user-id",
  "iss": "https://oidc.example.com",
  "aud": "my-app"
}
```

### Response (Invalid Token)

```json
{
  "active": false
}
```

### Example

```bash
curl -X POST https://oidc.example.com/introspect \
  -H "Authorization: Basic $(echo -n 'my-app:secret' | base64)" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=ACCESS_TOKEN&token_type_hint=access_token"
```

## Token Revocation Endpoint

Revokes an issued token.

### Request

```http
POST /revoke
Authorization: Basic base64(client_id:client_secret)
Content-Type: application/x-www-form-urlencoded

token=TOKEN&
token_type_hint=access_token
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | String | Yes | Token to revoke |
| `token_type_hint` | String | No | `access_token` or `refresh_token` |

### Response

```
HTTP/1.1 200 OK
```

The endpoint returns 200 OK even if the token is invalid or expired.

### Example

```bash
curl -X POST https://oidc.example.com/revoke \
  -H "Authorization: Basic $(echo -n 'my-app:secret' | base64)" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=ACCESS_TOKEN&token_type_hint=access_token"
```

## Registration Endpoint

Registers a new OAuth 2.0 client dynamically.

### Request

```http
POST /register
Content-Type: application/json

{
  "client_name": "My Application",
  "redirect_uris": ["https://app.example.com/callback"],
  "response_types": ["code"],
  "grant_types": ["authorization_code", "refresh_token"],
  "token_endpoint_auth_method": "client_secret_basic"
}
```

### Response

```json
{
  "client_id": "auto-generated-id",
  "client_secret": "auto-generated-secret",
  "client_id_issued_at": 1704063600,
  "client_secret_expires_at": 0,
  "client_name": "My Application",
  "redirect_uris": ["https://app.example.com/callback"]
}
```

### Example

```bash
curl -X POST https://oidc.example.com/register \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "My App",
    "redirect_uris": ["https://app.example.com/callback"]
  }'
```

## Common Error Responses

### Invalid Request

```json
{
  "error": "invalid_request",
  "error_description": "Missing required parameter: client_id"
}
```

### Invalid Client

```json
{
  "error": "invalid_client",
  "error_description": "Client authentication failed"
}
```

### Invalid Grant

```json
{
  "error": "invalid_grant",
  "error_description": "Authorization code expired"
}
```

### Invalid Scope

```json
{
  "error": "invalid_scope",
  "error_description": "Requested scope not available"
}
```

### Unauthorized Client

```json
{
  "error": "unauthorized_client",
  "error_description": "Client not authorized for this grant type"
}
```

### Access Denied

```json
{
  "error": "access_denied",
  "error_description": "User denied access"
}
```

## Best Practices

1. Always use HTTPS in production
2. Validate state parameter to prevent CSRF attacks
3. Use nonce parameter to prevent token replay attacks
4. Keep client secrets secure
5. Implement proper error handling
6. Use secure token storage (httpOnly cookies, secure storage)
7. Implement token refresh before expiration
8. Revoke tokens on logout
9. Validate token signatures before using
10. Implement rate limiting on sensitive endpoints
