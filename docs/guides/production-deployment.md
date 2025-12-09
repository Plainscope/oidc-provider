# Production Deployment Guide

Best practices and guidelines for deploying the OIDC provider in production environments.

## Pre-Deployment Checklist

- [ ] SSL/TLS certificates obtained and configured
- [ ] Environment variables reviewed and secured
- [ ] User database configured and backed up
- [ ] Client credentials generated and stored securely
- [ ] Reverse proxy configured (Nginx/HAProxy)
- [ ] Database backups scheduled
- [ ] Monitoring and logging configured
- [ ] Firewall rules configured
- [ ] Rate limiting configured
- [ ] Load balancing strategy determined

## HTTPS/TLS Configuration

### Obtaining Certificates

Use Let's Encrypt for free SSL certificates:

```bash
# Using Certbot
certbot certonly --standalone -d oidc.example.com -d www.oidc.example.com
```

### Nginx Configuration with SSL

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name oidc.example.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name oidc.example.com;

    ssl_certificate /etc/letsencrypt/live/oidc.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/oidc.example.com/privkey.pem;

    # SSL security headers
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://oidc-provider:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Environment Configuration

### Production Environment Variables

```bash
# Node environment
export NODE_ENV=production

# Server configuration
export PORT=8080
export ISSUER=https://oidc.example.com
export PROXY=true

# Client configuration (use strong secrets)
export CLIENT_ID=$(openssl rand -hex 16)
export CLIENT_SECRET=$(openssl rand -hex 32)
export REDIRECT_URIS=https://app.example.com/callback

# Session security
export COOKIES_KEYS=["$(openssl rand -hex 32)","$(openssl rand -hex 32)"]

# Feature flags
export FEATURES_DEV_INTERACTIONS=false
```

### Environment File (.env)

```bash
NODE_ENV=production
PORT=8080
ISSUER=https://oidc.example.com
PROXY=true
CLIENT_ID=xxx
CLIENT_SECRET=xxx
REDIRECT_URIS=https://app.example.com/callback
POST_LOGOUT_REDIRECT_URIS=https://app.example.com/logout
COOKIES_KEYS=["key1","key2"]
FEATURES_DEV_INTERACTIONS=false
```

## Docker Compose Production Setup

### Basic Production Configuration

```yaml
version: '3.8'

services:
  oidc-provider:
    image: docker.io/plainscope/simple-oidc-provider:latest
    container_name: oidc-provider
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 8080
      ISSUER: https://oidc.example.com
      PROXY: 'true'
      CLIENT_ID: ${CLIENT_ID}
      CLIENT_SECRET: ${CLIENT_SECRET}
      REDIRECT_URIS: ${REDIRECT_URIS}
      POST_LOGOUT_REDIRECT_URIS: ${POST_LOGOUT_REDIRECT_URIS}
      COOKIES_KEYS: ${COOKIES_KEYS}
      FEATURES_DEV_INTERACTIONS: 'false'
      SQLITE_DB_PATH: /data/oidc.db
    volumes:
      - ./data/users.json:/app/dist/users.json:ro
      - ./data/config.json:/app/config.json:ro
      - provider-data:/data
      - provider-logs:/var/log/oidc-provider
    expose:
      - "8080"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - backend
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    # Security options
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    read_only: false  # Set to true for maximum security (requires tmpfs mounts)

  reverse-proxy:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt/live/oidc.example.com:/etc/nginx/ssl:ro
      - nginx-logs:/var/log/nginx
    depends_on:
      - oidc-provider
    networks:
      - backend
      - frontend
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    security_opt:
      - no-new-privileges:true

volumes:
  provider-data:
    driver: local
  provider-logs:
    driver: local
  nginx-logs:
    driver: local

networks:
  backend:
    driver: bridge
    internal: false
  frontend:
    driver: bridge
```

### High-Availability Configuration

For production environments requiring high availability:

```yaml
version: '3.8'

services:
  # Load Balancer
  traefik:
    image: traefik:v2.10
    restart: unless-stopped
    command:
      - "--api.insecure=false"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik-certs:/letsencrypt
    networks:
      - frontend
    security_opt:
      - no-new-privileges:true

  # OIDC Provider Instances
  provider-1:
    image: docker.io/plainscope/simple-oidc-provider:latest
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 8080
      ISSUER: https://oidc.example.com
      PROXY: 'true'
      CLIENT_ID: ${CLIENT_ID}
      CLIENT_SECRET: ${CLIENT_SECRET}
      REDIRECT_URIS: ${REDIRECT_URIS}
      POST_LOGOUT_REDIRECT_URIS: ${POST_LOGOUT_REDIRECT_URIS}
      COOKIES_KEYS: ${COOKIES_KEYS}
      FEATURES_DEV_INTERACTIONS: 'false'
      SQLITE_DB_PATH: /data/oidc.db
    volumes:
      - ./data/users.json:/app/dist/users.json:ro
      - provider-data:/data
    networks:
      - backend
      - frontend
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.oidc.rule=Host(`oidc.example.com`)"
      - "traefik.http.routers.oidc.entrypoints=websecure"
      - "traefik.http.routers.oidc.tls.certresolver=letsencrypt"
      - "traefik.http.services.oidc.loadbalancer.server.port=8080"
      - "traefik.http.services.oidc.loadbalancer.healthcheck.path=/healthz"
      - "traefik.http.services.oidc.loadbalancer.healthcheck.interval=30s"
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
    security_opt:
      - no-new-privileges:true

  provider-2:
    extends: provider-1
    container_name: oidc-provider-2

  provider-3:
    extends: provider-1
    container_name: oidc-provider-3

volumes:
  provider-data:
    driver: local
  traefik-certs:
    driver: local

networks:
  backend:
    driver: bridge
    internal: true
  frontend:
    driver: bridge
```

## Security Hardening

### Docker Security Best Practices

```yaml
services:
  oidc-provider:
    security_opt:
      - no-new-privileges:true
    read_only_root_filesystem: true
    tmpfs:
      - /tmp
      - /var/run
    user: "node"
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
```

### Secrets Management

Use Docker secrets or external secret management:

```bash
# Create secrets
echo "my-client-secret" | docker secret create client_secret -
echo '["secret-key-1","secret-key-2"]' | docker secret create cookies_keys -

# Reference in compose
services:
  oidc-provider:
    secrets:
      - client_secret
      - cookies_keys
    environment:
      CLIENT_SECRET_FILE: /run/secrets/client_secret
      COOKIES_KEYS_FILE: /run/secrets/cookies_keys
```

## Monitoring and Logging

### Application Logging

```yaml
services:
  oidc-provider:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "10"
        labels: "service=oidc-provider"
```

### Prometheus Metrics (Future)

Configure monitoring endpoint:

```bash
export METRICS_ENABLED=true
export METRICS_PORT=9090
```

### ELK Stack Integration

```yaml
services:
  oidc-provider:
    logging:
      driver: "awslogs"
      options:
        awslogs-group: "/ecs/oidc-provider"
        awslogs-region: "us-east-1"
        awslogs-stream-prefix: "ecs"
```

## Rate Limiting

### Nginx Rate Limiting

```nginx
limit_req_zone $binary_remote_addr zone=oidc_limit:10m rate=10r/s;

server {
    location / {
        limit_req zone=oidc_limit burst=20 nodelay;
        proxy_pass http://oidc-provider:8080;
    }
}
```

## Load Balancing

### Multiple Provider Instances

```yaml
version: '3.8'

services:
  provider-1:
    image: docker.io/plainscope/simple-oidc-provider
    environment:
      PORT: 8080
      ISSUER: https://oidc.example.com
    networks:
      - backend

  provider-2:
    image: docker.io/plainscope/simple-oidc-provider
    environment:
      PORT: 8080
      ISSUER: https://oidc.example.com
    networks:
      - backend

  provider-3:
    image: docker.io/plainscope/simple-oidc-provider
    environment:
      PORT: 8080
      ISSUER: https://oidc.example.com
    networks:
      - backend

  nginx:
    image: nginx:alpine
    volumes:
      - ./load-balancer.conf:/etc/nginx/nginx.conf:ro
    ports:
      - "443:443"
    depends_on:
      - provider-1
      - provider-2
      - provider-3
```

### Nginx Load Balancer Config

```nginx
upstream oidc_providers {
    least_conn;
    server provider-1:8080 weight=1;
    server provider-2:8080 weight=1;
    server provider-3:8080 weight=1;
}

server {
    listen 443 ssl http2;
    location / {
        proxy_pass http://oidc_providers;
    }
}
```

## Backup and Recovery

### User Data Backup

```bash
#!/bin/bash
# Backup script
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Backup users.json
docker cp oidc-provider:/app/dist/users.json $BACKUP_DIR/users_$TIMESTAMP.json

# Backup config.json
docker cp oidc-provider:/app/dist/config.json $BACKUP_DIR/config_$TIMESTAMP.json

# Compress
tar -czf $BACKUP_DIR/oidc-backup_$TIMESTAMP.tar.gz $BACKUP_DIR/users_$TIMESTAMP.json $BACKUP_DIR/config_$TIMESTAMP.json

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "oidc-backup_*.tar.gz" -mtime +30 -delete
```

### Automated Backups with Cron

```bash
0 2 * * * /opt/scripts/backup-oidc.sh
```

## Maintenance and Updates

### Image Updates

```bash
# Pull latest image
docker pull docker.io/plainscope/simple-oidc-provider:latest

# Stop running containers
docker-compose down

# Update compose file with new image hash
docker-compose pull

# Start with new image
docker-compose up -d

# Verify health
docker-compose logs oidc-provider
```

### Graceful Shutdown

```bash
# Graceful shutdown
docker stop --time=30 oidc-provider

# Check if stopped
docker ps | grep oidc-provider
```

## Performance Tuning

### Resource Allocation

```yaml
services:
  oidc-provider:
    resources:
      limits:
        cpus: '2'
        memory: 2G
      reservations:
        cpus: '1'
        memory: 1G
```

### Connection Pooling

Configure via environment:

```bash
NODE_POOL_SIZE=10
```

## Troubleshooting Production Issues

See [Troubleshooting Guide](troubleshooting.md) for production-specific issues.
