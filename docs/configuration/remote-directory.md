# Remote Directory Configuration

This guide explains how to configure the OIDC Provider to use a remote directory service for user management and authentication instead of a local user file.

## Overview

The OIDC Provider supports two user directory modes:

- **Local Mode** (default): Users are loaded from a JSON file at startup
- **Remote Mode**: Users are managed by an external HTTP service (ideal for enterprise integration)

The Remote Directory service is implemented as a Python Flask application that exposes REST API endpoints for user operations.

## Architecture

```
┌──────────────────┐
│   OIDC Provider  │
│   (Node.js)      │
└────────┬─────────┘
         │
         │ HTTP + Bearer Token
         │
┌────────▼─────────────────┐
│ Remote Directory Service │
│ (Python Flask)           │
├──────────────────────────┤
│  GET    /count           │
│  GET    /find/:id        │
│  POST   /validate        │
│  GET    /health          │
└──────────────────────────┘
```

## Quick Start

### Enable Remote Directory with Docker Compose

Add the `DIRECTORY_TYPE=remote` environment variable to the provider service:

```yaml
services:
  provider:
    environment:
      DIRECTORY_TYPE: remote
      DIRECTORY_BASE_URL: http://remote-directory:5000
      DIRECTORY_HEADERS: '{"Authorization":"Bearer your-token-here"}'
```

Then start all services:

```bash
docker-compose up -d
```

## Configuration

### Provider Service Environment Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `DIRECTORY_TYPE` | String | `local` | Set to `remote` to use remote directory |
| `DIRECTORY_BASE_URL` | String | `http://remote-directory:5000` | Base URL of remote directory service |
| `DIRECTORY_HEADERS` | JSON | `{"Authorization":"Bearer remote-directory-secret-token"}` | HTTP headers (must include Authorization) |
| `DIRECTORY_COUNT_ENDPOINT` | String | `/count` | Endpoint for counting users |
| `DIRECTORY_FIND_ENDPOINT` | String | `/find` | Endpoint for finding users by ID |
| `DIRECTORY_VALIDATE_ENDPOINT` | String | `/validate` | Endpoint for validating credentials |

### Remote Directory Service Environment Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `PORT` | Number | `5000` | Port the service listens on |
| `USERS_FILE` | String | `/app/config/users.json` | Path to users JSON file |
| `BEARER_TOKEN` | String | (required) | Bearer token for API authentication |
| `DEBUG` | Boolean | `false` | Enable Flask debug mode |

## API Endpoints

### GET /count

Returns the total number of users.

**Authentication**: Bearer token required

**Response**:

```
200 OK
Content-Type: application/json
<number>

Example: 42
```

### GET /find/:id

Find and return a user by ID.

**Authentication**: Bearer token required

**Parameters**:

- `id` (path): User ID (UUID format)

**Response**:

```json
200 OK
{
  "id": "8276bb5b-d0b7-41e9-a805-77b62a2865f4",
  "email": "admin@localhost",
  "name": "John Doe",
  "email_verified": false,
  "given_name": "John",
  "family_name": "Doe",
  // ... other user claims
}
```

**Errors**:

- `401 Unauthorized`: Missing or invalid bearer token
- `404 Not Found`: User ID not found

### POST /validate

Validate user credentials (login).

**Authentication**: Bearer token required

**Request Body**:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:

```json
200 OK
{
  "id": "user-id-uuid",
  "email": "user@example.com",
  "name": "User Name",
  // ... other user claims
}
```

**Errors**:

- `400 Bad Request`: Missing email or password
- `401 Unauthorized`: Invalid credentials or missing bearer token
- `404 Not Found`: User not found

### GET /health

Health check endpoint for container orchestration.

**Authentication**: Bearer token required

**Response**:

```json
200 OK
{
  "status": "ok",
  "users_count": 42
}
```

## Usage Examples

### Using Docker Compose (Recommended)

The docker-compose.yml includes both services pre-configured:

```bash
# Start all services (local mode by default)
docker-compose up -d

# Switch to remote directory mode
DIRECTORY_TYPE=remote docker-compose up -d

# Custom bearer token
REMOTE_DIRECTORY_TOKEN=my-custom-token DIRECTORY_TYPE=remote docker-compose up -d
```

### Manual Docker Commands

Start the remote directory service:

```bash
docker run -d \
  --name oidc-remote-directory \
  -p 7090:5000 \
  -e BEARER_TOKEN=secret-token \
  -v ./docker/provider/users.json:/app/config/users.json:ro \
  oidc-provider/remote-directory
```

Configure provider to use remote directory:

```bash
docker run -d \
  --name oidc-provider \
  -p 9080:8080 \
  -e DIRECTORY_TYPE=remote \
  -e DIRECTORY_BASE_URL=http://oidc-remote-directory:5000 \
  -e DIRECTORY_HEADERS='{"Authorization":"Bearer secret-token"}' \
  --link oidc-remote-directory \
  oidc-provider/provider
```

### Testing the Remote Directory

Use the included test script:

```bash
./test-remote-directory.sh
```

Or test manually with curl:

```bash
# Test health endpoint
curl -X GET http://localhost:7090/health \
  -H "Authorization: Bearer remote-directory-secret-token"

# Test count endpoint
curl -X GET http://localhost:7090/count \
  -H "Authorization: Bearer remote-directory-secret-token"

# Test find endpoint
curl -X GET http://localhost:7090/find/8276bb5b-d0b7-41e9-a805-77b62a2865f4 \
  -H "Authorization: Bearer remote-directory-secret-token"

# Test validate endpoint
curl -X POST http://localhost:7090/validate \
  -H "Authorization: Bearer remote-directory-secret-token" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@localhost","password":"Rays-93-Accident"}'
```

## Security Considerations

### Bearer Token

1. **Generate a strong token** for production:

   ```bash
   openssl rand -hex 32
   ```

2. **Use environment variables** instead of hardcoding tokens:

   ```bash
   export REMOTE_DIRECTORY_TOKEN=$(openssl rand -hex 32)
   ```

3. **Rotate tokens periodically** in production

4. **Use HTTPS** in production environments

### Network Security

1. **Restrict network access** to the remote directory service:

   ```yaml
   remote-directory:
     networks:
       - oidc-net
     # Do NOT expose port to host in production
     # ports:
     #   - "7090:5000"
   ```

2. **Use service discovery** instead of hardcoded URLs in Kubernetes

3. **Implement rate limiting** at the reverse proxy level

### User Data

1. **Never store passwords in plaintext** in production
   - Implement proper password hashing (bcrypt, Argon2)

2. **Use HTTPS** for all communication

3. **Enable audit logging** for user operations

## Switching Between Modes

### Local to Remote

```bash
# Stop current containers
docker-compose down

# Switch to remote mode
DIRECTORY_TYPE=remote docker-compose up -d
```

### Remote to Local

```bash
# Stop current containers
docker-compose down

# Switch to local mode (default)
DIRECTORY_TYPE=local docker-compose up -d
```

## Troubleshooting

### Provider Cannot Connect to Remote Directory

Check logs:

```bash
docker logs oidc-provider
docker logs oidc-remote-directory
```

Verify network connectivity:

```bash
docker exec oidc-provider curl -v http://remote-directory:5000/health
```

### Authentication Failures

Verify bearer token:

```bash
docker-compose ps  # Check environment variables
docker logs oidc-remote-directory  # Check auth logs
```

### User Not Found Errors

Check users.json is accessible:

```bash
docker exec oidc-remote-directory ls -la /app/config/users.json
docker logs oidc-remote-directory  # Check user loading logs
```

## Extending the Remote Directory

The remote directory service can be extended with additional endpoints:

```python
@app.route('/api/users/<user_id>/attributes', methods=['GET'])
def get_attributes(user_id):
    """Custom endpoint for user attributes"""
    # Implementation here
    pass

@app.route('/api/users', methods=['GET'])
def list_users():
    """List all users with optional filters"""
    # Implementation here
    pass
```

Update the provider's directory factory to support new endpoints:

```typescript
const { baseUrl, headers, countEndpoint, findEndpoint, 
        validateEndpoint, attributesEndpoint } = config;

return new RemoteDirectory(
  baseUrl, 
  headers, 
  countEndpoint, 
  findEndpoint, 
  validateEndpoint,
  attributesEndpoint  // New parameter
);
```

## Integration with External Systems

The remote directory design enables integration with:

- **Active Directory / LDAP**: Implement a proxy service
- **OAuth 2.0 Providers**: Delegate to external provider
- **Database-backed services**: Connect to enterprise databases
- **API-first identity systems**: Okta, Auth0, Azure AD, etc.

Example proxy pattern:

```python
# Proxy to Active Directory
@app.route('/validate', methods=['POST'])
def validate_ad():
    email, password = request.json['email'], request.json['password']
    
    # Authenticate against AD
    user_info = authenticate_active_directory(email, password)
    if not user_info:
        abort(401)
    
    # Transform AD user to OIDC user format
    return jsonify(transform_ad_user(user_info))
```

## Performance Considerations

### Caching

For high-traffic deployments, implement caching:

```python
from functools import lru_cache
import hashlib

@lru_cache(maxsize=1000)
def get_user_cached(user_id):
    return find_user(user_id)
```

### Connection Pooling

Use connection pooling for database backends:

```python
from sqlalchemy.pool import QueuePool

db = create_engine(
    'postgresql://...',
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=40
)
```

### Rate Limiting

Implement rate limiting:

```python
from flask_limiter import Limiter

limiter = Limiter(app)

@app.route('/validate', methods=['POST'])
@limiter.limit("10 per minute")
def validate():
    # Implementation
    pass
```

## Additional Resources

- [OIDC Provider Documentation](../README.md)
- [Local Directory Mode](../configuration/user-management.md)
- [Security Best Practices](./security.md)
- [Docker Deployment Guide](../guides/docker-deployment.md)
