# User Management

## Overview

The OIDC provider supports local JSON, SQLite, and remote directory backends for user accounts.

## Default test user

```
# Email: admin@localhost
# Password: test-password
```

Use canonical non-production placeholders only (see CONTRIBUTING.md).

## Local JSON directory

```bash
DIRECTORY_TYPE=local
DIRECTORY_USERS_FILE=/app/config/users.json
```

Example seed:

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

## SQLite directory

```bash
DIRECTORY_TYPE=sqlite
DIRECTORY_DATABASE_FILE=/data/users.db
```

Optional seed via `DIRECTORY_USERS_FILE`. See [SQLite Directory](../guides/sqlite-directory.md).

## Remote directory

```bash
DIRECTORY_TYPE=remote
DIRECTORY_BASE_URL=http://directory:5000
DIRECTORY_HEADERS='{"Authorization":"Bearer local-dev-bearer-token"}'
```

See [Remote Directory](./remote-directory.md) and [Remote Directory Implementation](../guides/remote-directory-implementation.md).

## Production

Never deploy with documented test placeholders. Generate strong secrets and use bcrypt-hashed passwords for persistent stores.
