# Environment Variables Reference

Complete reference for all environment variables supported by the OIDC provider.

## Server Configuration

### PORT

- **Type**: Number
- **Default**: `8080`
- **Description**: Port the server listens on inside the container
- **Example**: `PORT=8080`

### ISSUER

- **Type**: String (URL)
- **Default**: `http://localhost:8080`
- **Description**: The OpenID Connect issuer identifier. Must be a valid HTTPS URL in production.
- **Example**: `ISSUER=https://oidc.example.com`

### PROXY

- **Type**: Boolean
- **Default**: `false`
- **Values**: `true` or `false`
- **Description**: Enable proxy mode when running behind a reverse proxy (Nginx, HAProxy, etc.)
- **Example**: `PROXY=true`

### NODE_ENV

- **Type**: String
- **Default**: `production`
- **Values**: `development`, `production`
- **Description**: Node.js environment mode
- **Example**: `NODE_ENV=production`

## Client Configuration

### CLIENT_ID

- **Type**: String
- **Default**: `325c2ce7-7390-411b-af3a-2bdf5a260f9d`
- **Description**: OAuth 2.0 client identifier. Should be a UUID in production.
- **Example**: `CLIENT_ID=85125d57-a403-4fe2-84d8-62c6db9b6d73`
- **Security**: Generate using `openssl rand -hex 16`

### CLIENT_SECRET

- **Type**: String
- **Default**: `a74566f905056b6806d69afc09f2803d1aa477e1d708540683994d6e4745334a`
- **Description**: OAuth 2.0 client secret for authentication. Keep secure!
- **Example**: `CLIENT_SECRET=+XiBpec4OAIeFBSbRdGaAGLNz6ZFfAbq`
- **Security**: Generate using `openssl rand -hex 32`

### CLIENT_NAME

- **Type**: String
- **Default**: `Demo`
- **Description**: Human-readable name for the registered client
- **Example**: `CLIENT_NAME="My Application"`

### REDIRECT_URIS

- **Type**: String (comma-separated URLs)
- **Default**: Empty (no default URIs)
- **Description**: Allowed redirect URIs for authorization responses. Multiple URIs separated by commas.
- **Example**: `REDIRECT_URIS=http://localhost:8080/signin-oidc,http://localhost:3000/callback`
- **Important**: Must match exactly in authorization requests (including protocol, domain, port)

### POST_LOGOUT_REDIRECT_URIS

- **Type**: String (comma-separated URLs)
- **Default**: Empty (no default URIs)
- **Description**: Allowed URIs to redirect to after logout
- **Example**: `POST_LOGOUT_REDIRECT_URIS=http://localhost:8080/signout-callback-oidc`

### RESPONSE_TYPES

- **Type**: JSON Array
- **Default**: `["code"]`
- **Description**: Supported OAuth 2.0 response types
- **Example**: `RESPONSE_TYPES=["code","id_token","token"]`
- **Valid Values**: `code`, `id_token`, `token`, combinations like `code id_token`

### GRANT_TYPES

- **Type**: JSON Array
- **Default**: `["authorization_code","refresh_token"]`
- **Description**: Supported OAuth 2.0 grant types
- **Example**: `GRANT_TYPES=["authorization_code","refresh_token","client_credentials"]`
- **Valid Values**: `authorization_code`, `refresh_token`, `client_credentials`, `implicit`, `password`

### TOKEN_ENDPOINT_AUTH_METHOD

- **Type**: String
- **Default**: `client_secret_basic`
- **Description**: Client authentication method for token endpoint
- **Example**: `TOKEN_ENDPOINT_AUTH_METHOD=client_secret_post`
- **Valid Values**: `client_secret_basic`, `client_secret_post`, `none`

### INTROSPECTION_ENDPOINT_AUTH_METHOD

- **Type**: String
- **Default**: `client_secret_basic`
- **Description**: Client authentication method for introspection endpoint
- **Example**: `INTROSPECTION_ENDPOINT_AUTH_METHOD=client_secret_post`

### APPLICATION_TYPE

- **Type**: String
- **Default**: `web`
- **Description**: Type of the registered application
- **Example**: `APPLICATION_TYPE=web`
- **Valid Values**: `web`, `native`

### CLIENTS

- **Type**: JSON (array of client objects)
- **Default**: Uses individual CLIENT_* variables
- **Description**: Multiple client configurations in JSON format
- **Example**:

```json
CLIENTS='[
  {
    "client_id": "client1",
    "client_secret": "secret1",
    "redirect_uris": ["http://app1.example.com/callback"]
  },
  {
    "client_id": "client2",
    "client_secret": "secret2",
    "redirect_uris": ["http://app2.example.com/callback"]
  }
]'
```

## Scopes and Claims

### SCOPES

- **Type**: String (comma-separated)
- **Default**: `openid,profile,email,offline_access`
- **Description**: Supported OAuth 2.0 scopes
- **Example**: `SCOPES=openid,profile,email,offline_access,address,phone`
- **Standard OIDC Scopes**:
  - `openid`: Required for OpenID Connect
  - `profile`: User profile information (name, picture, etc.)
  - `email`: User email address
  - `phone`: User phone number
  - `address`: User address
  - `offline_access`: Refresh token support

### CLAIMS

- **Type**: JSON object mapping scopes to claims
- **Default**:

```json
{
  "openid": ["sub", "sid"],
  "email": ["email", "email_verified"],
  "profile": ["name", "nickname", "given_name", "family_name", "groups", "picture"]
}
```

- **Description**: Maps scopes to user claims returned in tokens
- **Example**:

```json
CLAIMS='{
  "openid": ["sub", "sid"],
  "email": ["email", "email_verified"],
  "profile": ["name", "nickname", "given_name", "family_name", "picture"],
  "phone": ["phone_number", "phone_number_verified"],
  "address": ["address"]
}'
```

## Cookie Configuration

### COOKIES_KEYS

- **Type**: JSON Array of strings
- **Default**: `["40763539018b2f012d30aa7eba0123db3dc847b0eca146e5d7160838f8b2d092"]`
- **Description**: Array of cryptographic keys for signing cookies. Supports key rotation.
- **Example**: `COOKIES_KEYS='["new-key","old-key"]'`
- **Security**: Generate using `openssl rand -hex 32`
- **Important**: First key is used for signing; others for verification (rotation)

### COOKIES

- **Type**: JSON object
- **Default**: Uses COOKIES_KEYS
- **Description**: Advanced cookie configuration
- **Example**:

```json
COOKIES='{
  "keys": ["key1", "key2"],
  "secure": true,
  "httpOnly": true,
  "sameSite": "lax",
  "maxAge": 3600000
}'
```

## Configuration File

### CONFIG_FILE

- **Type**: String (file path)
- **Default**: `./config.json` (relative to working directory)
- **Description**: Path to JSON configuration file
- **Example**: `CONFIG_FILE=/etc/oidc-provider/config.json`

### CONFIG

- **Type**: JSON object (full OIDC configuration)
- **Description**: Full OIDC configuration as JSON string. Applied after config file but before explicit environment variables.
- **Example**:

```bash
CONFIG='{
  "clients": [{...}],
  "scopes": ["openid", "profile"],
  "claims": {...}
}'
```

## Configuration Precedence

The configuration is loaded and merged in the following order (later sources override earlier ones):

1. **Default values** - Built-in defaults in the code
2. **Config file** - JSON file at `CONFIG_FILE` path (default: `./config.json`)
3. **CONFIG environment variable** - Full JSON configuration
4. **Explicit environment variables** - Individual variables like `CLIENTS`, `SCOPES`, `COOKIES_KEYS`, etc.

**Important Notes:**
- Environment variables always override config file values
- Arrays (clients, scopes, cookies.keys) are replaced entirely (not concatenated)
- Use explicit environment variables for secrets (CLIENT_SECRET, COOKIES_KEYS)
- The config.json file should contain production-safe defaults without sensitive secrets

## Feature Flags

### FEATURES_DEV_INTERACTIONS

- **Type**: Boolean
- **Default**: `false`
- **Values**: `true` or `false`
- **Description**: Enable development interactions (simplified login without real authentication)
- **Example**: `FEATURES_DEV_INTERACTIONS=true`
- **Warning**: For development only! Never enable in production.

## Logging

### LOG_LEVEL

- **Type**: String
- **Default**: `info`
- **Values**: `debug`, `info`, `warn`, `error`
- **Description**: Logging verbosity level
- **Example**: `LOG_LEVEL=debug`

### DEBUG

- **Type**: String (wildcard patterns)
- **Default**: Not set
- **Description**: Enable debug logging for specific modules
- **Example**: `DEBUG=oidc-provider:*`

## Token Lifetimes

### ACCESS_TOKEN_LIFETIME

- **Type**: Number (seconds)
- **Default**: `3600` (1 hour)
- **Description**: Access token expiration time
- **Example**: `ACCESS_TOKEN_LIFETIME=900` (15 minutes)

### ID_TOKEN_LIFETIME

- **Type**: Number (seconds)
- **Default**: `3600` (1 hour)
- **Description**: ID token expiration time
- **Example**: `ID_TOKEN_LIFETIME=3600`

### REFRESH_TOKEN_LIFETIME

- **Type**: Number (seconds)
- **Default**: `604800` (7 days)
- **Description**: Refresh token expiration time
- **Example**: `REFRESH_TOKEN_LIFETIME=604800`

### AUTHORIZATION_CODE_LIFETIME

- **Type**: Number (seconds)
- **Default**: `600` (10 minutes)
- **Description**: Authorization code expiration time
- **Example**: `AUTHORIZATION_CODE_LIFETIME=600`

## Security

### CORS_ORIGINS

- **Type**: String (comma-separated URLs)
- **Default**: Not set (no CORS)
- **Description**: Allowed cross-origin resource sharing origins
- **Example**: `CORS_ORIGINS=https://app1.example.com,https://app2.example.com`

### RATE_LIMIT_WINDOW

- **Type**: Number (milliseconds)
- **Default**: `60000` (1 minute)
- **Description**: Time window for rate limiting
- **Example**: `RATE_LIMIT_WINDOW=60000`

### RATE_LIMIT_MAX_REQUESTS

- **Type**: Number
- **Default**: `100`
- **Description**: Maximum requests per rate limit window
- **Example**: `RATE_LIMIT_MAX_REQUESTS=100`

## Database

### SQLITE_DB_PATH

- **Type**: String (file path)
- **Default**: `../../data/oidc.db` (relative to adapter file)
- **Description**: Path to SQLite database file for persistent storage of sessions, tokens, grants, and interactions
- **Example**: `SQLITE_DB_PATH=/data/oidc.db`
- **Note**: The directory will be created automatically if it doesn't exist. In Docker, use a volume to persist data.
- **Docker Volume Example**:

```yaml
services:
  provider:
    environment:
      SQLITE_DB_PATH: /data/oidc.db
    volumes:
      - provider-data:/data
volumes:
  provider-data:
```

See the [SQLite Adapter Documentation](../configuration/sqlite-adapter.md) for detailed implementation information.

### USERS_FILE

- **Type**: String (file path)
- **Default**: `./users.json`
- **Description**: Path to JSON file containing user database
- **Example**: `USERS_FILE=/var/lib/oidc-provider/users.json`

## Quick Reference Table

| Variable | Type | Default | Required | Example |
|----------|------|---------|----------|---------|
| PORT | Number | 8080 | No | 8080 |
| ISSUER | URL | <http://localhost:8080> | Yes (prod) | <https://oidc.example.com> |
| CLIENT_ID | String | 325c2ce7... | Yes | my-client-id |
| CLIENT_SECRET | String | a74566f... | Yes | my-client-secret |
| REDIRECT_URIS | Comma-CSV | - | Yes | <http://localhost:3000/callback> |
| PROXY | Boolean | false | No | true |
| NODE_ENV | String | production | No | production |
| SCOPES | Comma-CSV | openid,profile,email | No | openid,profile,email,phone |
| SQLITE_DB_PATH | Path | ../../data/oidc.db | No | /data/oidc.db |
| FEATURES_DEV_INTERACTIONS | Boolean | false | No | true |

## Setting Environment Variables

### Docker Run

```bash
docker run -e PORT=8080 -e ISSUER=http://localhost:8080 ...
```

### Docker Compose

```yaml
environment:
  PORT: 8080
  ISSUER: http://localhost:8080
```

### .env File

```bash
PORT=8080
ISSUER=http://localhost:8080
CLIENT_ID=my-client-id
```

### Shell

```bash
export PORT=8080
export ISSUER=http://localhost:8080
```

## Validation Notes

- ISSUER must be a valid HTTPS URL in production (http allowed only for development)
- REDIRECT_URIS must exactly match the redirect_uri in authorization requests
- CLIENT_SECRET should be at least 32 characters in production
- COOKIES_KEYS should contain strong random keys
- JSON values must be valid JSON (use proper escaping)
