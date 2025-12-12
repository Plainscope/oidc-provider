# Remote Directory Service - Implementation Summary

## Overview

The Remote Directory Service has been significantly enhanced with SQLite-based persistence, comprehensive user management capabilities, and a professional web-based dashboard. This document summarizes the new features and how to use them.

## Recent Updates

### Database Constraints (December 2025)

Added CHECK constraints to enforce data validation at the database level:

- **Required Non-Empty Fields**: Domain names, role names, group names, usernames, passwords, and emails cannot be empty or whitespace-only
- **Three-Layer Validation**: Front-end (Alpine.js), back-end (Flask), and database (SQLite CHECK constraints)
- **Migration Script**: Provided for existing databases at `src/directory/migrate_constraints.py`

See [Database Constraints Documentation](docs/configuration/database-constraints.md) for migration instructions.

## What Was Implemented

### 1. SQLite Database Layer (`database.py`)

Complete database abstraction layer with:

- **Automatic Schema Creation**: Initializes all tables on first run
- **Foreign Key Support**: Enforces referential integrity
- **Connection Management**: Single persistent connection with proper cleanup
- **WAL Mode**: Write-Ahead Logging for concurrent access
- **Directory Creation**: Auto-creates database directory if missing

**Key Features:**

- Environment-configurable database path (`DB_PATH`)
- Transactional support with commit/rollback
- Row factory for dict-like access to results
- Comprehensive logging

### 2. Data Models and Repository Layer (`models.py`)

High-level Python API for all database operations:

- **Domain**: Manage user organizations
- **User**: Create, update, retrieve, delete users
- **UserEmail**: Support multiple emails per user
- **UserProperty**: Flexible key-value property storage
- **Role**: Define user roles/permissions
- **UserRole**: Assign roles to users (many-to-many)
- **Group**: Create user groups
- **UserGroup**: Add users to groups (many-to-many)
- **AuditLog**: Track all changes for compliance

**Features:**

- ID generation (UUID)
- Password validation
- Cascading deletes with foreign key constraints
- Comprehensive logging
- Error handling with rollback support

### 3. Database Initialization (`db_init.py`)

Automatic database setup and data seeding:

- **Schema Initialization**: Creates all tables
- **Default Domain**: Creates "localhost" domain
- **Default Roles**: Creates "admin", "user", "guest" roles
- **Data Seeding**: Imports users from `users.json`
- **Property Mapping**: Maps OIDC claims to user properties

**Features:**

- Idempotent initialization (safe to call multiple times)
- Flexible file location detection
- Error handling and logging
- Support for admin user detection

### 4. Comprehensive REST API (`app.py`)

#### Domain Endpoints

```
GET    /api/domains               - List all domains
POST   /api/domains               - Create domain
GET    /api/domains/<id>          - Get domain
DELETE /api/domains/<id>          - Delete domain
```

#### User Endpoints

```
GET    /api/users                 - List all users
GET    /api/users?domain_id=<id>  - List users in domain
POST   /api/users                 - Create user
GET    /api/users/<id>            - Get user (with relations)
PATCH  /api/users/<id>            - Update user
DELETE /api/users/<id>            - Delete user
```

#### Role Endpoints

```
GET    /api/roles                 - List all roles
POST   /api/roles                 - Create role
GET    /api/roles/<id>            - Get role
DELETE /api/roles/<id>            - Delete role
```

#### Group Endpoints

```
GET    /api/groups                - List all groups
GET    /api/groups?domain_id=<id> - List groups in domain
POST   /api/groups                - Create group
GET    /api/groups/<id>           - Get group
GET    /api/groups/<id>/users     - Get group members
DELETE /api/groups/<id>           - Delete group
```

#### Audit Endpoints

```
GET    /api/audit                 - Get audit logs (with pagination)
GET    /api/audit?entity_type=X&entity_id=Y - Get logs for entity
```

#### Legacy Endpoints (Backward Compatible)

```
GET    /count                     - User count
GET    /find/<id>                 - Find user by ID
POST   /validate                  - Validate credentials
GET    /healthz                   - Health check
```

**Features:**

- Full CRUD operations
- Audit logging on every change
- Bearer token authentication (optional)
- Comprehensive error handling
- Transaction support
- Proper HTTP status codes

### 5. Web-Based User Interface

Professional dashboard built with:

- **Tailwind CSS**: Modern, responsive styling
- **Alpine.js**: Interactive components without build step
- **Tabbed Interface**: Easy navigation between sections

#### Tabs

1. **Users Tab**
   - View all users with details
   - Create new users
   - Edit user information
   - Assign roles and groups
   - Delete users
   - Search and filter

2. **Roles Tab**
   - View all roles
   - Create new roles
   - Delete roles
   - See role descriptions

3. **Groups Tab**
   - View all groups
   - Create new groups
   - View group members
   - Manage memberships
   - Delete groups

4. **Domains Tab**
   - View all domains
   - Create new domains
   - Mark default domain
   - Delete domains

5. **Audit Tab**
   - View all changes (scrollable)
   - Entity type and ID
   - Action performed
   - Change details (expandable)
   - Timestamps
   - Pagination support

**Features:**

- Responsive design (mobile-friendly)
- Real-time updates
- Confirmation dialogs for destructive actions
- Error handling and user feedback
- No page reload needed for CRUD operations
- Clean, professional appearance

## Database Schema

### Design Philosophy

**Roles vs Groups:**

- **Roles** are system-wide concepts (no domain_id required)
  - Examples: "admin", "user", "guest"
  - Apply across all domains
  - Globally unique names
- **Groups** are domain-scoped organizational units (domain_id required)
  - Examples: "<Engineering@acme.com>", "<Sales@example.com>"
  - Organize users within specific domains
  - Same group name allowed across different domains via `UNIQUE(name, domain_id)`

### Tables Overview

```
domains (1) ----< users (many)
                    │
                    ├─ (1) ----< user_emails (many)
                    ├─ (1) ----< user_properties (many)
                    └─ (many) ----< roles (many) via user_roles
                    └─ (many) ----< groups (many) via user_groups

groups (1) ----< user_groups (many)
                    │
                    └─ (many) ----< users (many)

roles (1) ----< user_roles (many)
                   │
                   └─ (many) ----< users (many)

All entities tracked in audit_logs for change history
```

## API Usage Examples

### Create Domain

```bash
curl -X POST http://localhost:8080/api/domains \
  -H "Content-Type: application/json" \
  -d '{
    "name": "acme.com",
    "description": "ACME Corporation"
  }'
```

### Create User with Full Details

```bash
curl -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice@acme.com",
    "password": "SecurePass123!",
    "domain_id": "uuid-of-acme-domain",
    "first_name": "Alice",
    "last_name": "Smith",
    "display_name": "Alice Smith",
    "email": "alice@acme.com",
    "emails": ["alice.smith@work.com"],
    "properties": {
      "title": "Senior Developer",
      "department": "Engineering",
      "phone": "+1-555-0123"
    },
    "role_ids": ["uuid-of-admin-role"],
    "group_ids": ["uuid-of-engineering-group"]
  }'
```

### Update User

```bash
curl -X PATCH http://localhost:8080/api/users/user-uuid \
  -H "Content-Type: application/json" \
  -d '{
    "display_name": "Alice Johnson",
    "properties": {
      "title": "Principal Engineer"
    },
    "role_ids": ["uuid-of-lead-role"]
  }'
```

### Get Audit Trail

```bash
# All logs
curl http://localhost:8080/api/audit?limit=100

# For specific user
curl 'http://localhost:8080/api/audit?entity_type=user&entity_id=user-uuid'

# For specific group
curl 'http://localhost:8080/api/audit?entity_type=group&entity_id=group-uuid'
```

## Configuration

### Environment Variables

```bash
# Database path (default: /app/data/users.db)
DB_PATH=/app/data/users.db

# Optional API authentication
BEARER_TOKEN=your-secret-token-here

# Flask settings
DEBUG=false
PORT=8080

# Seed data location
USERS_FILE=/app/config/users.json
```

### Docker Compose Example

```yaml
services:
  remote-directory:
    build: ./src/directory
    ports:
      - "8080:8080"
    environment:
      DB_PATH: /app/data/users.db
      DEBUG: "false"
      PORT: 8080
    volumes:
      - remote-directory-data:/app/data
      - ./docker/provider/users.json:/app/config/users.json:ro
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  remote-directory-data:
```

## File Structure

```
src/directory/
├── app.py                    # Main Flask application with all endpoints
├── database.py              # SQLite connection and schema management
├── models.py                # Data models and repository layer
├── db_init.py               # Database initialization and seeding
├── requirements.txt         # Python dependencies
├── Dockerfile              # Container definition
└── users.json              # Sample seed data (optional)
```

## Usage Guide

### Starting the Service

**Docker:**

```bash
docker-compose up remote-directory
```

**Docker Production:**

```bash
docker-compose -f docker-compose.production.yml up remote-directory
```

**Local Development:**

```bash
cd src/directory
pip install -r requirements.txt
python app.py
```

### Accessing the UI

1. Open browser to `http://localhost:8080/ui`
2. Default users from `users.json` are available:
   - admin@localhost / Rays-93-Accident
   - user@localhost / Signal-27-Bridge

### Using the API

All endpoints available at `http://localhost:8080/api/`

With optional bearer token:

```bash
curl -H "Authorization: Bearer your-token" http://localhost:8080/api/users
```

## Data Seeding

The service automatically seeds data from `users.json` on startup:

1. Creates default "localhost" domain
2. Creates default roles (admin, user, guest)
3. Imports users with all properties
4. Assigns admin role to admin@localhost user
5. Adds user role to other users

The file is searched in these locations (in order):

- `/app/config/users.json` (Docker standard)
- `/app/docker/provider/users.json` (Compose volume)
- `docker/provider/users.json` (Local relative)

## Key Features

### 1. Relational Data Model

- **Multiple Domains**: Support organization hierarchies
- **Multiple Emails**: Users can have multiple email addresses
- **Flexible Properties**: Key-value store for custom attributes
- **Roles**: Permission-based role assignments
- **Groups**: User grouping for organization
- **Relationships**: Full many-to-many support with proper constraints

### 2. Data Integrity

- **Foreign Key Constraints**: Referential integrity enforced
- **Cascading Deletes**: Automatic cleanup of related data
- **Unique Constraints**: Prevents duplicate entries
- **Transactions**: ACID compliance for multi-operation changes

### 3. Audit & Compliance

- **Change Tracking**: Every operation logged
- **Metadata**: IP address and user agent captured
- **Full Details**: JSON change history stored
- **Query Support**: Filter by entity or action

### 4. Security

- **Bearer Token**: Optional API authentication
- **Password Validation**: User credentials supported
- **Access Logs**: All operations audited
- **Secure Cleanup**: Proper error handling without leaking info

### 5. Performance

- **Indexed Queries**: Fast lookups by ID or unique fields
- **Persistent Connection**: Single DB connection per process
- **WAL Mode**: Concurrent read/write support
- **Pagination**: Audit logs with limit/offset

## Backward Compatibility

Existing client code continues to work:

```bash
# Old endpoints still work
curl http://localhost:8080/count
curl http://localhost:8080/find/user-id
curl -X POST http://localhost:8080/validate -d '{"email":"...","password":"..."}'
curl http://localhost:8080/healthz
```

The legacy validation endpoint now uses the database instead of in-memory JSON array.

## Error Handling

Proper HTTP status codes and error messages:

- `200 OK`: Successful GET/PATCH
- `201 Created`: Successful POST
- `204 No Content`: Successful DELETE
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Authentication failed
- `404 Not Found`: Entity not found
- `500 Internal Error`: Server error

Error response format:

```json
{
  "error": "Description of error"
}
```

## Monitoring and Debugging

### Check Service Health

```bash
curl http://localhost:8080/healthz
```

### View Logs

```bash
docker logs remote-directory -f
```

### Query Database Directly

```bash
sqlite3 /app/data/users.db
SELECT * FROM users;
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;
```

### Common Issues

1. **Database locked**: Ensure only one instance running
2. **Users not seeded**: Check users.json location and format
3. **API returns 401**: Verify bearer token if required
4. **UI not loading**: Check Tailwind CSS CDN accessibility

## Future Enhancements

Potential improvements for future versions:

1. **Password Hashing**: Implement bcrypt for security
2. **Rate Limiting**: API rate limiting
3. **Encryption**: Database encryption at rest
4. **Multi-tenancy**: Separate data per tenant
5. **LDAP Integration**: Sync with LDAP directories
6. **OAuth/OIDC Attributes**: Native OIDC profile support
7. **Backup/Restore**: Automated backup system
8. **Replication**: Multi-node synchronization
9. **Search**: Full-text search on user profiles
10. **Webhooks**: Event notifications

## Support & Documentation

- **API Reference**: See `docs/configuration/remote-directory.md`
- **Database Schema**: See `database.py` schema creation
- **Models API**: See `models.py` docstrings
- **Examples**: Check curl examples in API sections
- **Logs**: Check service logs for detailed debugging

## License

Part of the OIDC Provider project - see LICENSE file for details.
