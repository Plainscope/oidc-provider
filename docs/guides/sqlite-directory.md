# SQLite Directory - Quick Start Guide

This guide shows you how to use the SQLite-based directory for user management in the OIDC Provider.

## Overview

The SQLite directory provides a local database solution for user management with:

- ✅ **Relational data model** - Users, emails, roles, groups, properties
- ✅ **No external dependencies** - Self-contained SQLite database
- ✅ **Compatible schema** - Works with remote directory database
- ✅ **Bcrypt password hashing** - Secure credential storage
- ✅ **Web management UI** - Optional directory service for user management
- ✅ **Performance** - Fast lookups with SQLite B-tree indexes

## Quick Start

### Option 1: Provider Only (No Management UI)

Use this if you already have a populated database or plan to manage users programmatically.

```yaml
# docker-compose.yml
services:
  provider:
    image: plainscope/simple-oidc-provider
    ports:
      - "8080:8080"
    environment:
      DIRECTORY_TYPE: sqlite
      DIRECTORY_DATABASE_FILE: /data/users.db
      CLIENT_ID: your-client-id
      CLIENT_SECRET: your-client-secret
      REDIRECT_URIS: http://localhost:8080/callback
    volumes:
      - ./data:/data
```

### Option 2: Provider + Directory Service (Recommended)

Use this to get both the OIDC provider and a web UI for managing users.

```yaml
# docker-compose.yml
services:
  directory:
    image: plainscope/simple-oidc-provider-directory
    ports:
      - "7080:8080"
    environment:
      DATABASE_FILE: /data/users.db
      BEARER_TOKEN: your-secret-token
    volumes:
      - shared-data:/data

  provider:
    image: plainscope/simple-oidc-provider
    ports:
      - "8080:8080"
    environment:
      DIRECTORY_TYPE: sqlite
      DIRECTORY_DATABASE_FILE: /data/users.db
      CLIENT_ID: your-client-id
      CLIENT_SECRET: your-client-secret
      REDIRECT_URIS: http://localhost:8080/callback
    volumes:
      - shared-data:/data
    depends_on:
      - directory

volumes:
  shared-data:
```

Start the services:

```bash
docker-compose up -d
```

Access:
- **OIDC Provider**: http://localhost:8080
- **Directory Management UI**: http://localhost:7080

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DIRECTORY_TYPE` | Yes | `local` | Set to `sqlite` |
| `DIRECTORY_DATABASE_FILE` | No | `/data/users.db` | Path to SQLite database file |

### Complete Example

```bash
# Generate secrets
CLIENT_SECRET=$(openssl rand -hex 32)
BEARER_TOKEN=$(openssl rand -hex 32)

# Start with environment variables
docker run -d \
  -p 8080:8080 \
  -e DIRECTORY_TYPE=sqlite \
  -e DIRECTORY_DATABASE_FILE=/data/users.db \
  -e CLIENT_ID=85125d57-a403-4fe2-84d8-62c6db9b6d73 \
  -e CLIENT_SECRET=$CLIENT_SECRET \
  -e REDIRECT_URIS=http://localhost:8080/callback \
  -v $(pwd)/data:/data \
  plainscope/simple-oidc-provider
```

## Database Schema

The SQLite database includes these tables:

- **domains** - Multi-tenancy support (default: localhost)
- **users** - User accounts with username, password, display name
- **user_emails** - Multiple email addresses per user (primary flag)
- **user_properties** - Custom key-value attributes (JSON support)
- **roles** - Global roles (admin, user, guest, etc.)
- **user_roles** - User-to-role assignments
- **groups** - Domain-scoped groups
- **user_groups** - User-to-group assignments
- **audit_logs** - Change tracking for compliance

## Managing Users

### Using the Web UI

1. Start the directory service (port 7080 by default)
2. Log in with your bearer token
3. Use the dashboard to:
   - Create/edit/delete users
   - Manage roles and groups
   - Assign permissions
   - View audit logs

### Using the API

The directory service provides a REST API:

```bash
# Create a user
curl -X POST http://localhost:7080/api/users \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john.doe",
    "password": "hashed-password",
    "first_name": "John",
    "last_name": "Doe",
    "domain_id": "domain-id",
    "email": "john@example.com"
  }'

# List users
curl http://localhost:7080/api/users \
  -H "Authorization: Bearer your-token"

# Get user
curl http://localhost:7080/api/users/{user-id} \
  -H "Authorization: Bearer your-token"
```

### Password Hashing

Passwords must be bcrypt-hashed. Use these tools:

**Python:**
```python
import bcrypt
password = "MyPassword123"
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
print(hashed.decode())
```

**Node.js:**
```javascript
const bcrypt = require('bcrypt');
const password = 'MyPassword123';
bcrypt.hash(password, 10, (err, hash) => {
  console.log(hash);
});
```

**Online Tool:**
- https://bcrypt-generator.com/ (for testing only)

## Migration from JSON File

To migrate from JSON file storage to SQLite:

1. **Start the directory service** with your database path:
   ```bash
   docker run -d -p 7080:8080 \
     -e DATABASE_FILE=/data/users.db \
     -e BEARER_TOKEN=your-token \
     -v $(pwd)/data:/data \
     plainscope/simple-oidc-provider-directory
   ```

2. **Import users** via the API or web UI

3. **Update provider configuration**:
   ```yaml
   environment:
     DIRECTORY_TYPE: sqlite  # Changed from 'local'
     DIRECTORY_DATABASE_FILE: /data/users.db
   ```

4. **Restart the provider**

## Sharing Database Between Services

The provider and directory service can share the same database file:

```yaml
services:
  directory:
    environment:
      DATABASE_FILE: /data/users.db
    volumes:
      - shared-data:/data

  provider:
    environment:
      DIRECTORY_TYPE: sqlite
      DIRECTORY_DATABASE_FILE: /data/users.db
    volumes:
      - shared-data:/data

volumes:
  shared-data:
```

**Benefits:**
- Single source of truth
- Real-time updates
- Use directory service for management
- Use provider for authentication

## Troubleshooting

### Database not found

**Error**: `ENOENT: no such file or directory`

**Solution**: Ensure the database directory exists and is writable:
```bash
mkdir -p ./data
chmod 755 ./data
```

### Database locked

**Error**: `database is locked`

**Solution**: SQLite uses WAL mode for better concurrency. If you still see locks:
- Ensure both services mount the same volume
- Check file permissions
- Verify no other process is using the database

### Authentication fails

**Error**: User login fails

**Checklist:**
1. Verify password is bcrypt-hashed (starts with `$2a$`, `$2b$`, or `$2y$`)
2. Check user is marked as active (`is_active = 1`)
3. Verify email exists in `user_emails` table
4. Check database file path matches between provider and directory

### Plain text password rejected

**Error**: `Plain text password detected. Authentication denied.`

**Solution**: The SQLite directory requires bcrypt-hashed passwords for security. Hash your passwords:
```bash
node -e "require('bcrypt').hash('password', 10, (e, h) => console.log(h))"
```

## Performance Tips

1. **Use indexes** - The schema includes indexes on frequently queried fields
2. **Enable WAL mode** - Automatically enabled for better concurrency
3. **Shared cache** - SQLite uses a shared cache for efficiency
4. **Read-only replicas** - For high-traffic scenarios, use read replicas

## Security Best Practices

1. **File permissions** - Set database file to mode 600 or 640
2. **Bcrypt only** - Never use plain text passwords
3. **Bearer token** - Use strong random tokens for directory API
4. **HTTPS** - Always use HTTPS in production
5. **Regular backups** - Backup the database file regularly

## Backup and Recovery

### Backup

```bash
# Stop services
docker-compose down

# Backup database
cp data/users.db data/users.db.backup

# Or use SQLite backup command
sqlite3 data/users.db ".backup data/users.db.backup"

# Restart services
docker-compose up -d
```

### Restore

```bash
# Stop services
docker-compose down

# Restore database
cp data/users.db.backup data/users.db

# Restart services
docker-compose up -d
```

## Further Reading

- [User Management Documentation](../docs/configuration/user-management.md)
- [Environment Variables Reference](../docs/configuration/environment-variables.md)
- [Remote Directory Implementation](../docs/guides/remote-directory-implementation.md)
- [Security Best Practices](../docs/guides/security.md)
