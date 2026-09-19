# SQLite Directory - Quick Start Guide

This guide shows you how to use the SQLite-based directory for user management in the OIDC Provider.

## Overview

The SQLite directory provides a local database for user accounts, roles, and groups without requiring an external directory service. It is ideal for self-hosted and development deployments.

## Features

- Relational data model with foreign keys
- Multiple emails per user
- Roles and groups support
- Custom user properties
- Audit logging
- No external database server required
- Optional management UI via the directory service

## Quick Start

### Docker Compose

```yaml
services:
  directory:
    image: plainscope/simple-oidc-provider-directory
    ports:
      - "7080:8080"
    environment:
      PORT: 8080
      DATABASE_FILE: /data/users.db
      BEARER_TOKEN: local-dev-bearer-token
    volumes:
      - shared-data:/data

  provider:
    image: plainscope/simple-oidc-provider
    ports:
      - "8080:8080"
    environment:
      ISSUER: http://localhost:8080
      CLIENT_ID: test-client-id
      CLIENT_SECRET: local-dev-secret
      REDIRECT_URIS: http://localhost:8080/callback
      DIRECTORY_TYPE: sqlite
      DIRECTORY_DATABASE_FILE: /data/users.db
    volumes:
      - shared-data:/data
    depends_on:
      - directory

volumes:
  shared-data:
```

### Environment Variables

| Variable | Description | Example |
|----------|-------------|--------|
| `DIRECTORY_TYPE` | Must be `sqlite` | `sqlite` |
| `DIRECTORY_DATABASE_FILE` | Path to SQLite DB | `/data/users.db` |
| `DIRECTORY_USERS_FILE` | Optional seed JSON | `/app/config/users.json` |

### Seed users

Example seed entry (development only):

```json
[
  {
    "id": "user-1",
    "email": "admin@localhost",
    "password": "test-password",
    "name": "Admin User"
  }
]
```

Passwords in the seed file may be plain text for local development; the SQLite directory hashes them with bcrypt on first use. Prefer bcrypt hashes in any shared or long-lived data.

## Management UI

With the directory service running:

```
http://localhost:7080
```

Authenticate using the configured bearer token (`local-dev-bearer-token` in the example above). Generate a strong token for any non-local deployment.

## Production notes

- Persist `/data` with a volume or bind mount
- Use strong `BEARER_TOKEN` and `CLIENT_SECRET` values (`openssl rand -hex 32`)
- Do not use `test-password`, `local-dev-secret`, or other documented placeholders outside local/dev
- See CONTRIBUTING.md (Test credentials) and [Environment Variables](../configuration/environment-variables.md)

## Related documentation

- [User Management](../configuration/user-management.md)
- [Docker Deployment](./docker-deployment.md)
- [Getting Started](./getting-started.md)
