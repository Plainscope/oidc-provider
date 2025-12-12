# Database Constraints Migration

## Overview

The directory service database now includes CHECK constraints to enforce data validation at the database level, ensuring data integrity matches front-end and back-end validations.

## Constraints Added

### Required Non-Empty Fields

The following fields now have CHECK constraints that prevent empty or whitespace-only values:

1. **domains.name** - `CHECK(length(trim(name)) > 0)`
2. **roles.name** - `CHECK(length(trim(name)) > 0)`
3. **groups.name** - `CHECK(length(trim(name)) > 0)`
4. **users.username** - `CHECK(length(trim(username)) > 0)`
5. **users.password** - `CHECK(length(trim(password)) > 0)`
6. **user_emails.email** - `CHECK(length(trim(email)) > 0)`

### Uniqueness Constraints

The following uniqueness constraints ensure data consistency:

1. **domains.name** - Globally unique (cannot have duplicate domain names)
2. **roles.name** - Globally unique (system-wide roles like "admin", "user", "guest")
3. **groups.name** - Unique per domain via `UNIQUE(name, domain_id)` - same group name allowed across different domains
4. **users.username** - Globally unique
5. **user_emails.email** - Globally unique

### Design Rationale

**Roles vs Groups:**

- **Roles** are system-wide concepts (e.g., "admin", "user", "guest") that apply across all domains
- **Groups** are domain-scoped organizational units (e.g., "<Engineering@acme.com>", "<Engineering@example.com>")
- Groups with the same name can exist in different domains (composite unique constraint)

### Benefits

- **Data Integrity**: Prevents invalid data from being stored even if application-level validation is bypassed
- **Defense in Depth**: Provides an additional layer of validation beyond front-end and back-end checks
- **Database-Level Enforcement**: Ensures consistency even with direct database access or bulk imports
- **Clear Error Messages**: SQLite will reject constraint violations with descriptive errors

## Migration Instructions

### For New Installations

New installations automatically get the updated schema with CHECK constraints. No action required.

### For Existing Databases

If you have an existing database, run the migration script to add constraints while preserving all data:

#### Docker Environment

```bash
# Enter the directory container
docker-compose exec directory bash

# Run the migration script
python migrate_constraints.py

# Or specify a custom database path
python migrate_constraints.py --db-path /path/to/users.db
```

#### Local Development

```bash
# Navigate to the directory source
cd src/directory

# Run the migration script
python migrate_constraints.py

# Or specify a custom database path
python migrate_constraints.py --db-path /path/to/users.db
```

### Migration Process

The migration script:

1. ✓ **Creates a timestamped backup** of your database (e.g., `users.db.backup_20251212_143022`)
2. ✓ **Validates all existing data** - If any records have empty names, migration will fail with details
3. ✓ **Recreates tables** with CHECK constraints while preserving all data
4. ✓ **Maintains foreign key relationships** and indexes
5. ✓ **Automatically rolls back** on error by restoring from backup

### Validation Before Migration

To check if your database has any records that would violate constraints:

```sql
-- Check for empty domain names
SELECT id, name FROM domains WHERE trim(name) = '';

-- Check for empty role names
SELECT id, name FROM roles WHERE trim(name) = '';

-- Check for empty group names
SELECT id, name FROM groups WHERE trim(name) = '';

-- Check for empty usernames
SELECT id, username FROM users WHERE trim(username) = '';

-- Check for empty emails
SELECT id, email FROM user_emails WHERE trim(email) = '';
```

If any of these queries return results, clean up the data before running the migration.

## Error Handling

### Constraint Violation Examples

If an application attempts to insert invalid data, you'll see errors like:

```
sqlite3.IntegrityError: CHECK constraint failed: length(trim(name)) > 0
```

### Application-Level Error Handling

The back-end routes already catch these errors and return user-friendly messages:

- `400 Bad Request` with `{"error": "Domain name is required"}`
- `400 Bad Request` with `{"error": "Username is required"}`
- etc.

## Rollback Instructions

If you need to rollback the migration:

```bash
# List available backups
ls -la /app/data/users.db.backup_*

# Restore from a specific backup
cp /app/data/users.db.backup_20251212_143022 /app/data/users.db

# Restart the application
docker-compose restart directory
```

## Testing

After migration, verify constraints are working:

```bash
# Run validation tests
cd test
npm test -- directory-crud.spec.ts

# Should see tests passing for:
# - "should reject empty domain name"
# - "should reject empty role name"
# - "should reject empty group name"
# - "should reject empty username"
# - "should reject empty password"
```

## Schema Reference

### Updated Table Definitions

<details>
<summary>domains table</summary>

```sql
CREATE TABLE domains (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL CHECK(length(trim(name)) > 0),
    description TEXT,
    is_default BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

</details>

<details>
<summary>roles table</summary>

```sql
CREATE TABLE roles (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL CHECK(length(trim(name)) > 0),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

</details>

<details>
<summary>groups table</summary>

```sql
CREATE TABLE groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL CHECK(length(trim(name)) > 0),
    description TEXT,
    domain_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, domain_id),
    FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
);
```

**Note**: Groups use a composite unique constraint `UNIQUE(name, domain_id)` allowing the same group name to exist in different domains.

</details>

<details>
<summary>users table</summary>

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL CHECK(length(trim(username)) > 0),
    password TEXT NOT NULL CHECK(length(trim(password)) > 0),
    first_name TEXT,
    last_name TEXT,
    display_name TEXT,
    domain_id TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE RESTRICT
);
```

</details>

<details>
<summary>user_emails table</summary>

```sql
CREATE TABLE user_emails (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL CHECK(length(trim(email)) > 0),
    is_primary BOOLEAN DEFAULT 0,
    is_verified BOOLEAN DEFAULT 0,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

</details>

## Troubleshooting

### "CHECK constraint failed" Error

**Problem**: Application showing database constraint violation errors.

**Solution**: Ensure all input is properly validated:

- Front-end validates before submission
- Back-end strips whitespace and validates before database insert
- Database enforces as final safety net

### Migration Fails with "Data would violate constraint"

**Problem**: Existing database has records with empty names.

**Solution**:

1. Check the migration output for specific record IDs
2. Clean up the problematic records
3. Re-run the migration

Example cleanup:

```sql
-- Update empty names to placeholder values or delete records
UPDATE domains SET name = 'unnamed-domain' WHERE trim(name) = '';
DELETE FROM domains WHERE trim(name) = '';
```

### Container Won't Start After Migration

**Problem**: Docker container crashes after running migration.

**Solution**:

1. Check logs: `docker-compose logs directory`
2. Restore from backup if needed
3. Ensure database file permissions are correct: `chmod 644 /app/data/users.db`

## See Also

- [User Management Documentation](../configuration/user-management.md)
- [Remote Directory Configuration](../configuration/remote-directory.md)
- [SQLite Adapter Documentation](../configuration/sqlite-adapter.md)
