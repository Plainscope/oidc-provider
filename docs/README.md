# OIDC Provider Documentation

Welcome to the Simple OIDC Provider documentation. This comprehensive guide covers setup, configuration, usage, and troubleshooting.

## Documentation Structure

### Getting Started

- **[Quick Start Guide](guides/quickstart.md)** - Get the OIDC provider up and running in minutes
- **[Installation Guide](guides/installation.md)** - Detailed setup instructions

### Configuration

- **[Environment Variables](configuration/environment-variables.md)** - Complete reference for all configurable options
- **[Client Configuration](configuration/client-configuration.md)** - Register and manage OAuth 2.0 clients
- **[User Management](configuration/user-management.md)** - User authentication and profile setup
- **[Remote Directory Configuration](configuration/remote-directory.md)** - Integrate with external user management systems
- **[Advanced Configuration](configuration/advanced-configuration.md)** - Fine-tuning and custom configurations

### API & Endpoints

- **[OpenID Connect Endpoints](api/endpoints.md)** - Standard OIDC protocol endpoints
- **[OAuth 2.0 Flows](api/oauth-flows.md)** - Supported authorization flows and grant types
- **[Token Endpoints](api/token-endpoints.md)** - Token generation and validation

### Deployment

- **[Docker Deployment](guides/docker-deployment.md)** - Running with Docker and Docker Compose
- **[Production Deployment](guides/production-deployment.md)** - Best practices for production environments
- **[Security Considerations](guides/security.md)** - Security best practices and recommendations

### Troubleshooting & Development

- **[Troubleshooting Guide](guides/troubleshooting.md)** - Common issues and solutions
- **[Development Guide](guides/development.md)** - Building and extending the provider

### Testing

- **[Testing Index](testing/index.md)** - Complete testing documentation hub
- **[Quick Start Guide](testing/quick-start.md)** - Get running in 4 commands
- **[Complete Guide](testing/complete-guide.md)** - Full overview and features
- **[Implementation Details](testing/implementation.md)** - Technical deep dive
- **[Reference](testing/reference.md)** - Comprehensive testing reference

## Quick Links

- **Image Repository**: `docker.io/plainscope/simple-oidc-provider`
- **GitHub Repository**: <https://github.com/Plainscope/oidc-provider>
- **License**: MIT

## What is OIDC?

OpenID Connect (OIDC) is an authentication layer built on top of OAuth 2.0. It allows applications to verify user identities and obtain basic user profile information in a standardized and interoperable way.

### Key Features

- **OAuth 2.0 Compliance**: Full RFC 6749 Authorization Server implementation
- **OpenID Connect Support**: Complete OIDC authentication protocol
- **Docker Ready**: Production-ready Docker image included
- **Highly Configurable**: Extensive environment variable support
- **User-Friendly Interaction Pages**: Built-in login and consent UI

## Support

For issues, questions, or contributions, please visit the [GitHub repository](https://github.com/Plainscope/oidc-provider).
