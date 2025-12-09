# Docker Deployment Guide

Comprehensive guide for deploying the OIDC provider using Docker and Docker Compose.

## Image Information

- **Repository**: `docker.io/plainscope/simple-oidc-provider`
- **Base Image**: `node:25-alpine` (multi-stage build)
- **Size**: ~180MB (runtime image)
- **Exposed Port**: 8080

## Single Container Deployment

### Basic Deployment

```bash
docker run -d \
  --name simple-oidc-provider \
  -p 8080:8080 \
  -e PORT=8080 \
  -e ISSUER=http://localhost:8080 \
  -e CLIENT_ID=my-client-id \
  -e CLIENT_SECRET=my-client-secret \
  docker.io/plainscope/simple-oidc-provider
```

### With User Configuration

```bash
docker run -d \
  --name simple-oidc-provider \
  -p 8080:8080 \
  -e PORT=8080 \
  -e ISSUER=http://oidc.example.com \
  -e CLIENT_ID=my-client-id \
  -e CLIENT_SECRET=my-client-secret \
  -e REDIRECT_URIS=https://app.example.com/callback \
  -v /path/to/users.json:/app/dist/users.json:ro \
  docker.io/plainscope/simple-oidc-provider
```

### With Configuration File

```bash
docker run -d \
  --name simple-oidc-provider \
  -p 8080:8080 \
  -e PORT=8080 \
  -e ISSUER=http://oidc.example.com \
  -e CONFIG_FILE=/app/config.json \
  -v /path/to/config.json:/app/config.json:ro \
  docker.io/plainscope/simple-oidc-provider
```

## Docker Compose Deployment

### Development Setup

```yaml
version: '3.8'

services:
  oidc-provider:
    image: docker.io/plainscope/simple-oidc-provider
    container_name: oidc-provider
    environment:
      PORT: 8080
      ISSUER: http://provider:8080
      CLIENT_ID: 85125d57-a403-4fe2-84d8-62c6db9b6d73
      CLIENT_SECRET: +XiBpec4OAIeFBSbRdGaAGLNz6ZFfAbq
      REDIRECT_URIS: http://localhost:8080/signin-oidc
      POST_LOGOUT_REDIRECT_URIS: http://localhost:8080/signout-callback-oidc
      FEATURES_DEV_INTERACTIONS: false
      SQLITE_DB_PATH: /data/oidc.db
    volumes:
      - ./users.json:/app/dist/users.json:ro
      - provider-data:/data
    ports:
      - "8080:8080"
    networks:
      - oidc-network

networks:
  oidc-network:
    driver: bridge

volumes:
  provider-data:
```

**Note**: The `provider-data` volume ensures SQLite database persistence across container restarts. See [SQLite Adapter Documentation](../configuration/sqlite-adapter.md) for more details.

## Remote Directory Deployment

For enterprise deployments with external user management systems, use the Remote Directory service:

```yaml
version: '3.8'

services:
  remote-directory:
    build:
      context: ./src/remote-directory
      dockerfile: Dockerfile
    container_name: oidc-remote-directory
    restart: always
    environment:
      PORT: 5000
      USERS_FILE: /app/config/users.json
      BEARER_TOKEN: ${REMOTE_DIRECTORY_TOKEN:-your-secure-token}
    volumes:
      - ./users.json:/app/config/users.json:ro
    networks:
      - oidc-network
    healthcheck:
      test: ["CMD", "curl", "-f", "-H", "Authorization: Bearer ${REMOTE_DIRECTORY_TOKEN:-your-secure-token}", "http://localhost:5000/healthz"]
      interval: 10s
      timeout: 5s
      retries: 3

  oidc-provider:
    image: docker.io/plainscope/simple-oidc-provider
    container_name: oidc-provider
    restart: always
    environment:
      NODE_ENV: production
      PORT: 8080
      ISSUER: https://oidc.example.com
      CLIENT_ID: ${OIDC_CLIENT_ID}
      CLIENT_SECRET: ${OIDC_CLIENT_SECRET}
      REDIRECT_URIS: https://app.example.com/callback
      POST_LOGOUT_REDIRECT_URIS: https://app.example.com/logout
      PROXY: 'true'
      DIRECTORY_TYPE: remote
      DIRECTORY_BASE_URL: http://remote-directory:5000
      DIRECTORY_HEADERS: '{"Authorization":"Bearer ${REMOTE_DIRECTORY_TOKEN:-your-secure-token}"}'
    depends_on:
      remote-directory:
        condition: service_healthy
    expose:
      - "8080"
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8080/.well-known/openid-configuration"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - oidc-network

networks:
  oidc-network:
    driver: bridge
```

**Benefits of Remote Directory**:

- Centralized user management
- Integration with Active Directory / LDAP
- Support for custom authentication flows
- Scalable enterprise deployments

See [Remote Directory Configuration](../configuration/remote-directory.md) for detailed setup and API documentation.

### Production Setup (Local Directory)

```yaml
version: '3.8'

services:
  oidc-provider:
    image: docker.io/plainscope/simple-oidc-provider
    container_name: oidc-provider
    restart: always
    environment:
      NODE_ENV: production
      PORT: 8080
      ISSUER: https://oidc.example.com
      CLIENT_ID: ${OIDC_CLIENT_ID}
      CLIENT_SECRET: ${OIDC_CLIENT_SECRET}
      REDIRECT_URIS: https://app.example.com/callback
      POST_LOGOUT_REDIRECT_URIS: https://app.example.com/logout
      PROXY: 'true'
      COOKIES_KEYS: ${COOKIES_KEYS}
      SQLITE_DB_PATH: /data/oidc.db
    volumes:
      - ./users.json:/app/dist/users.json:ro
      - ./config.json:/app/config.json:ro
      - provider-data:/data
    expose:
      - "8080"
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8080/.well-known/openid-configuration"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - oidc-network
    labels:
      - "com.example.description=OIDC Provider"

  reverse-proxy:
    image: nginx:alpine
    restart: always
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt/live/oidc.example.com:/etc/nginx/ssl:ro
    depends_on:
      - oidc-provider
    networks:
      - oidc-network

networks:
  oidc-network:
    driver: bridge
```

## Environment Variables

For Docker deployments, set via `-e` flag or `.env` file:

```bash
# Required
PORT=8080
ISSUER=http://localhost:8080
CLIENT_ID=your-client-id
CLIENT_SECRET=your-client-secret

# Redirect URIs (comma-separated)
REDIRECT_URIS=http://localhost:3000/callback,http://app.example.com/callback
POST_LOGOUT_REDIRECT_URIS=http://localhost:3000/logout

# Optional
PROXY=false
FEATURES_DEV_INTERACTIONS=false
COOKIES_KEYS=["key1","key2"]
```

## Health Checks

### Manual Health Check

```bash
curl http://localhost:8080/.well-known/openid-configuration
```

### Docker Health Check

Add to Docker Compose:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8080/.well-known/openid-configuration"]
  interval: 30s
  timeout: 10s
  retries: 3
```

## Logging

### View Logs

```bash
# Single container
docker logs oidc-provider

# Docker Compose
docker-compose logs -f oidc-provider

# Tail logs
docker logs -f --tail=100 oidc-provider
```

### Log Output Examples

```
[INIT] Starting OIDC Provider with environment: {...}
[INIT] Express app configured with Pug view engine
[INIT] OIDC Provider initialized with issuer: http://provider:8080
[SERVER] OIDC Provider is listening on port 8080
[PROVIDER] GET /.well-known/openid-configuration
```

## Resource Limits

### CPU and Memory Constraints

```bash
docker run -d \
  --name oidc-provider \
  --cpus="1" \
  --memory="512m" \
  --memory-reservation="256m" \
  -p 8080:8080 \
  docker.io/plainscope/simple-oidc-provider
```

Or in Docker Compose:

```yaml
services:
  oidc-provider:
    resources:
      limits:
        cpus: '1'
        memory: 512M
      reservations:
        cpus: '0.5'
        memory: 256M
```

## Container Management

### Start/Stop/Restart

```bash
docker stop oidc-provider
docker start oidc-provider
docker restart oidc-provider
```

### Remove Container

```bash
docker rm oidc-provider
```

### View Running Containers

```bash
docker ps
```

## Networking

### Port Publishing

```bash
# Map to different host port
docker run -p 9080:8080 docker.io/plainscope/simple-oidc-provider

# Map to specific host IP
docker run -p 127.0.0.1:8080:8080 docker.io/plainscope/simple-oidc-provider
```

### Inter-container Communication

```bash
# Create network
docker network create oidc-net

# Run provider on network
docker run --network oidc-net --name provider docker.io/plainscope/simple-oidc-provider

# Access as http://provider:8080 from other containers
```

## Reverse Proxy Integration

### Nginx Configuration

```nginx
upstream oidc_provider {
    server oidc-provider:8080;
}

server {
    listen 443 ssl http2;
    server_name oidc.example.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location / {
        proxy_pass http://oidc_provider;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Enable Proxy Mode

Set `PROXY=true` when behind a reverse proxy:

```bash
docker run -e PROXY=true docker.io/plainscope/simple-oidc-provider
```

## Troubleshooting

See [Troubleshooting Guide](troubleshooting.md) for common issues specific to Docker deployments.
