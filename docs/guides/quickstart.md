# Quick Start Guide

Get the Simple OIDC Provider running in just a few minutes using Docker.

## Prerequisites

- Docker and Docker Compose installed
- Basic understanding of OAuth 2.0 and OpenID Connect

## Running with Docker Compose

The fastest way to get started is using the included `docker-compose.yml`:

```bash
docker-compose up
```

This will start:

- **OIDC Provider** on `http://localhost:9080`
- **Demo Application** on `http://localhost:8080`

## Testing the Provider

1. Open your browser and navigate to `http://localhost:8080`
2. Click the login button
3. You'll be redirected to the OIDC provider's login page
4. Use the following test credentials:
   - **Email**: `admin@localhost`
   - **Password**: `Rays-93-Accident`
5. Grant consent to access your profile
6. You'll be redirected back to the demo application and logged in

## Default Configuration

The docker-compose setup includes:

- **Client ID**: `85125d57-a403-4fe2-84d8-62c6db9b6d73`
- **Client Secret**: `+XiBpec4OAIeFBSbRdGaAGLNz6ZFfAbq`
- **Issuer**: `http://provider:8080`
- **Redirect URI**: `http://localhost:8080/signin-oidc`

## Stopping the Services

```bash
docker-compose down
```

## Next Steps

- See [Installation Guide](installation.md) for custom setup
- Review [Environment Variables](../configuration/environment-variables.md) for configuration options
- Check [Docker Deployment](docker-deployment.md) for production guidelines

## Troubleshooting

If you encounter issues:

1. Check the logs: `docker-compose logs provider`
2. Verify Docker is running: `docker ps`
3. Review the [Troubleshooting Guide](troubleshooting.md)
