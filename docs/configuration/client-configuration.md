# Client Configuration

Guide for registering and configuring OAuth 2.0 clients with the OIDC provider.

## Client Registration

### Register a Single Client

Use environment variables to register a single client:

```bash
docker run -d \
  -e CLIENT_ID=my-app \
  -e CLIENT_SECRET=$(openssl rand -hex 32) \
  -e REDIRECT_URIS=https://app.example.com/callback,https://app.example.com/callback2 \
  -e POST_LOGOUT_REDIRECT_URIS=https://app.example.com/logout \
  docker.io/plainscope/simple-oidc-provider
```

### Register Multiple Clients

Use the CLIENTS environment variable for multiple clients:

```bash
CLIENTS='[
  {
    "client_id": "app1",
    "client_name": "My First App",
    "client_secret": "secret1",
    "redirect_uris": [
      "https://app1.example.com/callback",
      "https://app1.example.com/callback2"
    ],
    "post_logout_redirect_uris": [
      "https://app1.example.com/logout"
    ],
    "response_types": ["code"],
    "grant_types": ["authorization_code", "refresh_token"],
    "token_endpoint_auth_method": "client_secret_basic",
    "application_type": "web"
  },
  {
    "client_id": "app2",
    "client_name": "My Second App",
    "client_secret": "secret2",
    "redirect_uris": [
      "https://app2.example.com/callback"
    ],
    "post_logout_redirect_uris": [
      "https://app2.example.com/logout"
    ]
  }
]'

docker run -d \
  -e CLIENTS="$CLIENTS" \
  docker.io/plainscope/simple-oidc-provider
```

### Client Configuration via config.json

Create a `config.json` file:

```json
{
  "clients": [
    {
      "client_id": "my-app",
      "client_name": "My Application",
      "client_secret": "super-secret-key",
      "redirect_uris": [
        "https://app.example.com/callback",
        "https://app.example.com/signin-oidc"
      ],
      "post_logout_redirect_uris": [
        "https://app.example.com/logout",
        "https://app.example.com/signout-callback-oidc"
      ],
      "response_types": ["code", "id_token", "token id_token"],
      "grant_types": [
        "authorization_code",
        "refresh_token",
        "implicit"
      ],
      "token_endpoint_auth_method": "client_secret_basic",
      "introspection_endpoint_auth_method": "client_secret_basic",
      "application_type": "web",
      "contacts": ["support@example.com"],
      "logo_uri": "https://app.example.com/logo.png",
      "policy_uri": "https://app.example.com/policy"
    }
  ]
}
```

Mount the file:

```bash
docker run -d \
  -e CONFIG_FILE=/app/config.json \
  -v /path/to/config.json:/app/config.json:ro \
  docker.io/plainscope/simple-oidc-provider
```

## Client Metadata

### Required Fields

```json
{
  "client_id": "my-app",
  "client_secret": "secret-key",
  "redirect_uris": ["https://app.example.com/callback"]
}
```

### Common Optional Fields

```json
{
  "client_name": "My Application",
  "client_uri": "https://app.example.com",
  "logo_uri": "https://app.example.com/logo.png",
  "contacts": ["support@example.com"],
  "response_types": ["code"],
  "grant_types": ["authorization_code", "refresh_token"],
  "post_logout_redirect_uris": ["https://app.example.com/logout"],
  "token_endpoint_auth_method": "client_secret_basic",
  "application_type": "web"
}
```

### Advanced Fields

```json
{
  "policy_uri": "https://app.example.com/privacy",
  "tos_uri": "https://app.example.com/tos",
  "jwks_uri": "https://app.example.com/.well-known/jwks.json",
  "initiate_login_uri": "https://app.example.com/login",
  "sector_identifier_uri": "https://app.example.com/.well-known/sector",
  "subject_type": "public",
  "id_token_signed_response_alg": "RS256",
  "id_token_encrypted_response_alg": "RSA-OAEP"
}
```

## Response Types

### Authorization Code Flow (Recommended)

```json
{
  "response_types": ["code"],
  "grant_types": ["authorization_code", "refresh_token"]
}
```

Returns an authorization code that is exchanged for tokens at the backend. Most secure for web applications.

### Implicit Flow (Deprecated)

```json
{
  "response_types": ["id_token", "token"],
  "grant_types": ["implicit"]
}
```

Tokens returned directly in the callback URL. Legacy, not recommended.

### Hybrid Flow

```json
{
  "response_types": ["code id_token", "code token", "code id_token token"],
  "grant_types": ["authorization_code", "implicit"]
}
```

Combination of authorization code and implicit flows.

## Grant Types

### Authorization Code Grant

```json
{
  "grant_types": ["authorization_code"]
}
```

Standard OAuth 2.0 flow for web applications. Use with `response_type=code`.

### Refresh Token Grant

```json
{
  "grant_types": ["refresh_token"]
}
```

Allows obtaining new access tokens using a refresh token. Enables long-lived sessions.

### Client Credentials Grant

```json
{
  "grant_types": ["client_credentials"]
}
```

For service-to-service authentication. Client authenticates directly without user context.

### Resource Owner Password Credentials (Deprecated)

```json
{
  "grant_types": ["password"]
}
```

User credentials passed directly to the authorization server. Not recommended for new applications.

## Token Endpoint Authentication

### Client Secret Basic (HTTP Basic Auth)

```json
{
  "token_endpoint_auth_method": "client_secret_basic"
}
```

Most common. Client ID and secret sent via HTTP Basic Authorization header:

```bash
Authorization: Basic base64(client_id:client_secret)
```

Example:

```bash
curl -X POST https://oidc.example.com/token \
  -H "Authorization: Basic $(echo -n 'my-app:secret-key' | base64)" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=AUTH_CODE&redirect_uri=https://app.example.com/callback"
```

### Client Secret Post

```json
{
  "token_endpoint_auth_method": "client_secret_post"
}
```

Client credentials sent in the request body:

```bash
curl -X POST https://oidc.example.com/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=AUTH_CODE&redirect_uri=https://app.example.com/callback&client_id=my-app&client_secret=secret-key"
```

### No Authentication

```json
{
  "token_endpoint_auth_method": "none"
}
```

Public clients (no secret). Use only for SPAs and native mobile apps:

```bash
curl -X POST https://oidc.example.com/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=AUTH_CODE&redirect_uri=https://app.example.com/callback&client_id=my-app"
```

## Client Redirect URIs

### Single Redirect URI

```json
{
  "redirect_uris": ["https://app.example.com/callback"]
}
```

### Multiple Redirect URIs

```json
{
  "redirect_uris": [
    "https://app.example.com/callback",
    "https://app.example.com/signin-oidc",
    "https://staging.app.example.com/callback",
    "https://localhost:3000/callback"
  ]
}
```

### Important Rules

- URIs must match exactly (including protocol, domain, port, path)
- Trailing slashes must match
- Query strings are not allowed in redirect URIs
- Wildcards are not allowed
- Use `localhost` for development, `127.0.0.1` in production must match exactly

### Examples of Mismatches

```
Registered:      https://app.example.com/callback
Attempted:       https://app.example.com/callback/  ❌ Trailing slash
Attempted:       https://app.example.com:443/callback  ❌ Port mismatch
Attempted:       http://app.example.com/callback  ❌ Protocol mismatch
Attempted:       https://app.example.com/callback?state=123  ❌ Query string
Attempted:       https://app.example.com/  ❌ Path mismatch
```

## Post Logout Redirect URIs

Configure where users are redirected after logout:

```json
{
  "post_logout_redirect_uris": [
    "https://app.example.com/logout",
    "https://app.example.com/goodbye",
    "https://app.example.com"
  ]
}
```

## Docker Compose Example

```yaml
version: '3.8'

services:
  oidc-provider:
    image: docker.io/plainscope/simple-oidc-provider
    environment:
      PORT: 8080
      ISSUER: https://oidc.example.com
      CLIENTS: |
        [
          {
            "client_id": "frontend-app",
            "client_name": "Frontend Application",
            "client_secret": "frontend-secret-key",
            "redirect_uris": [
              "https://app.example.com/callback",
              "https://app.example.com/signin-oidc"
            ],
            "post_logout_redirect_uris": [
              "https://app.example.com/logout"
            ],
            "response_types": ["code"],
            "grant_types": ["authorization_code", "refresh_token"],
            "token_endpoint_auth_method": "client_secret_basic",
            "application_type": "web"
          },
          {
            "client_id": "mobile-app",
            "client_name": "Mobile Application",
            "redirect_uris": [
              "com.example.myapp://oauth/callback",
              "exp://localhost:19000/oauth/callback"
            ],
            "post_logout_redirect_uris": [
              "com.example.myapp://oauth/logout"
            ],
            "response_types": ["code"],
            "grant_types": ["authorization_code", "refresh_token"],
            "token_endpoint_auth_method": "none",
            "application_type": "native"
          }
        ]
```

## Client Best Practices

1. **Use HTTPS**: Always use HTTPS redirect URIs in production
2. **Rotate Secrets**: Change client secrets regularly (annually minimum)
3. **Limit Scope**: Request only necessary OAuth scopes
4. **Use PKCE**: For native and SPA clients, implement PKCE (RFC 7636)
5. **Secure Storage**: Never store client secrets in frontend code
6. **Unique Per Environment**: Use different client IDs/secrets for dev/staging/prod
7. **Monitor Usage**: Log and audit all client authentication attempts
8. **Update Endpoints**: Keep redirect URIs updated when application URLs change

## Revoking Clients

To revoke a client's access:

1. Remove the client from the `CLIENTS` configuration
2. Restart the provider
3. Existing tokens remain valid until expiration
4. New authorization requests from the client will be rejected

To immediately revoke tokens:

1. Rotate session keys (COOKIES_KEYS)
2. Restart the provider
3. All sessions will be invalidated
