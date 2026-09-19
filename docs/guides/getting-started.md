# Getting Started with Directory Integration

This guide covers integrating user directories with the OIDC Provider — local JSON, SQLite, or remote HTTP.

## Users.json schema

### Required fields

| Field | Type | Example |
|-------|------|--------|
| `id` | String | UUID recommended |
| `email` | String | `user@example.com` |
| `password` | String | `test-password` or bcrypt hash `$2a$10$...` |

Use `test-password` (or similar obvious placeholders) in documentation and local fixtures. Never commit realistic password phrases. See CONTRIBUTING.md (Test credentials).

### Minimal example

```json
[
  {
    "id": "user-1",
    "email": "admin@localhost",
    "password": "test-password"
  }
]
```

### Complete example

A fully populated record may include OpenID Connect profile claims (`name`, `given_name`, `family_name`, `email_verified`, `picture`, `address`, etc.). Passwords for SQLite seeding should be bcrypt-hashed for anything beyond local throwaway data.

## Remote Directory API contract

| Endpoint | Method | Purpose |
|----------|--------|--------|
| `/count` | GET | Total user count |
| `/find/:id` | GET | Find by id or email |
| `/validate` | POST | Validate credentials |
| `/healthz` | GET | Health check |

All requests require:

```http
Authorization: Bearer <token>
```

Configure the provider:

```yaml
environment:
  DIRECTORY_TYPE: remote
  DIRECTORY_BASE_URL: http://directory:5000
  DIRECTORY_HEADERS: '{"Authorization":"Bearer local-dev-bearer-token"}'
```

### POST /validate

```http
POST /validate
Content-Type: application/json

{"email":"admin@localhost","password":"test-password"}
```

Success returns `{ "valid": true, "user": { ... } }` without password fields.

## Quick start patterns

### Local JSON

```yaml
environment:
  DIRECTORY_TYPE: local
  DIRECTORY_USERS_FILE: /app/config/users.json
```

### SQLite with seed

```yaml
environment:
  DIRECTORY_TYPE: sqlite
  DIRECTORY_DATABASE_FILE: /data/users.db
  DIRECTORY_USERS_FILE: /app/config/users.json
```

### Remote service

Implement the four endpoints above, then point `DIRECTORY_BASE_URL` at your service. See [Remote Directory Implementation](./remote-directory-implementation.md).

## Related

- [User Management](../configuration/user-management.md)
- [Environment Variables](../configuration/environment-variables.md)
- [SQLite Directory](./sqlite-directory.md)
