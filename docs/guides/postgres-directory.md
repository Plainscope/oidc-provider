# PostgreSQL backend for the Directory service

The Directory service supports both SQLite (default) and PostgreSQL.

## Configuration

| Variable | Purpose |
|----------|---------|
| `DATABASE_FILE` | Path to the SQLite file (default `/app/data/users.db`). Used when `DATABASE_URL` is not set. |
| `DATABASE_URL` | SQLAlchemy-style URL for PostgreSQL, e.g. `postgresql+psycopg://user:pass@host:5432/dbname`. Takes precedence over `DATABASE_FILE`. |

The driver used for PostgreSQL is **psycopg 3** (`postgresql+psycopg://…`). Plain `postgresql://` and `postgres://` URLs are normalised automatically.

## Local development with Docker Compose

```bash
# Start Postgres + Directory with the overlay file
export DATABASE_URL=postgresql+psycopg://directory:directory@postgres:5432/directory
docker compose -f docker-compose.yml -f docker-compose.postgres.yml up -d postgres directory
```

The credentials in `docker-compose.postgres.yml` are **development-only**. Override them for any shared or production environment.

## Schema bootstrap

On first connection the service creates the required tables with `CREATE TABLE IF NOT EXISTS`.  
Alembic migrations will be added in a follow-up to support versioned schema evolution and SQLite → PostgreSQL data migration.

## Migrating data from SQLite to PostgreSQL

1. Ensure the target PostgreSQL database is empty (or has the Directory schema).
2. Use a tool such as `pgloader` or a one-off export/import script:

   ```bash
   # Example with pgloader (install separately)
   pgloader sqlite:///path/to/users.db postgresql://user:pass@host/directory
   ```

3. Point the Directory service at the new `DATABASE_URL` and verify CRUD operations.
4. Keep a backup of the original SQLite file until validation is complete.

## Acceptance notes (issue #41)

- Existing SQLite deployments continue to work with no configuration change.
- A fresh PostgreSQL instance receives the schema on first start and serves Directory operations.
- Connection pooling is enabled for PostgreSQL (`pool_pre_ping`, bounded pool size).
- No secrets are committed in the Compose examples beyond clearly labelled development defaults.
