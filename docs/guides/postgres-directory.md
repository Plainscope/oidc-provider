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

## Schema management strategy

This aligns with Plan 01 and the Directory ADRs (ADR-001 FastAPI consumer, ADR-004 Directory as backing store):

1. **Bootstrap (current PR):** On first connection the service applies a portable `CREATE TABLE IF NOT EXISTS` set so a fresh SQLite or PostgreSQL instance becomes usable immediately. This is intentional for development and single-node upgrades without an external migration step.
2. **Versioned migrations (follow-up):** Alembic will own schema evolution going forward. The bootstrap DDL is the baseline revision; subsequent changes ship as Alembic scripts. Existing deployments continue to work; new environments can either rely on bootstrap once or run `alembic upgrade head`.
3. **No competing token issuer:** Schema changes remain Directory-local and do not affect Provider token issuance (ADR-004).

Until Alembic revisions land, treat bootstrap as the source of truth for the logical schema used by both engines.

## Migrating data from SQLite to PostgreSQL

1. Ensure the target PostgreSQL database is empty (or has the Directory schema via bootstrap/Alembic).
2. Use a tool such as `pgloader` or a one-off export/import script:

   ```bash
   # Example with pgloader (install separately)
   pgloader sqlite:///path/to/users.db postgresql://user:pass@host/directory
   ```

3. Point the Directory service at the new `DATABASE_URL` and verify CRUD operations.
4. Keep a backup of the original SQLite file until validation is complete.

## Tests

- `python test_constraints.py` — SQLite CHECK constraint regression (existing).
- `python test_database_engines.py` — dual-engine smoke tests (placeholders, commit/rollback, schema bootstrap). Set `DATABASE_URL` to exercise PostgreSQL; otherwise those cases are skipped.

## Acceptance notes (issue #41)

- Existing SQLite deployments continue to work with no configuration change.
- A fresh PostgreSQL instance receives the schema on first start and serves Directory operations.
- Connection pooling is enabled for PostgreSQL (`pool_pre_ping`, bounded pool size).
- No secrets are committed in the Compose examples beyond clearly labelled development defaults.
