# Installation Guide

## System Requirements

- Docker 20.10+
- Docker Compose 2.0+
- 512MB RAM minimum
- 1GB disk space minimum

## Installation Methods

### Method 1: Docker (Recommended)

Pull the image from Docker Hub:

```bash
docker pull docker.io/plainscope/simple-oidc-provider
```

Run the container:

```bash
docker run -d \
  --name oidc-provider \
  -p 8080:8080 \
  -e PORT=8080 \
  -e ISSUER=http://localhost:8080 \
  -e CLIENT_ID=my-client-id \
  -e CLIENT_SECRET=my-client-secret \
  -e REDIRECT_URIS=http://localhost:3000/callback \
  -v users.json:/app/dist/users.json:ro \
  docker.io/plainscope/simple-oidc-provider
```

### Method 2: Docker Compose

Clone the repository:

```bash
git clone https://github.com/Plainscope/oidc-provider.git
cd oidc-provider
```

Start the services:

```bash
docker-compose up -d
```

### Method 3: Build from Source

Clone and build locally:

```bash
git clone https://github.com/Plainscope/oidc-provider.git
cd oidc-provider/src/provider

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in production
NODE_ENV=production PORT=8080 ISSUER=http://localhost:8080 node dist/index.js
```

## Network Configuration

### Docker Network

When running multiple containers, create a shared network:

```bash
docker network create oidc-net

docker run -d \
  --name oidc-provider \
  --network oidc-net \
  -e PORT=8080 \
  -e ISSUER=http://oidc-provider:8080 \
  docker.io/plainscope/simple-oidc-provider

docker run -d \
  --name my-app \
  --network oidc-net \
  -e OIDC_ISSUER=http://oidc-provider:8080 \
  my-app-image
```

### Port Mapping

- Container port: `8080` (default)
- Host port: Configure via `-p` flag or `docker-compose.yml`

## Volume Mounting

Mount user configuration:

```bash
docker run -d \
  --name oidc-provider \
  -v /path/to/users.json:/app/dist/users.json:ro \
  -v /path/to/config.json:/app/dist/config.json:ro \
  docker.io/plainscope/simple-oidc-provider
```

## Health Check

Verify the provider is running:

```bash
curl http://localhost:8080/.well-known/openid-configuration
```

Expected response includes metadata about the OIDC provider.

## Next Steps

- Configure clients: [Client Configuration](../configuration/client-configuration.md)
- Set up users: [User Management](../configuration/user-management.md)
- Review environment variables: [Environment Variables](../configuration/environment-variables.md)
