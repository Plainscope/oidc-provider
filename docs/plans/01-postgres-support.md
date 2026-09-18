# Plan 01: Add PostgreSQL Support to Directory Service

**Status**: Draft for review  
**Target component**: `src/directory`  
**Priority**: High (enables production multi-instance deployments)  
**Estimated effort**: 3–5 days  
**Dependencies**: None (can be done first)

## Goals

- Support both SQLite (default, zero-config, single-node) and PostgreSQL (production, multi-instance, concurrent writes).
- Keep existing SQLite behaviour and schema intact for backward compatibility.
- Use a single abstraction so models/routes do not care about the underlying engine.
- Provide clean migration path and Docker Compose examples.

## Non-Goals

- Full multi-database support (MySQL, etc.) in the first iteration.
- Automatic data migration tools beyond a documented one-time script.
- Changing the logical schema (tables, constraints, relationships stay the same).

## Current State

- Pure SQLite via `sqlite3` stdlib.
- Schema created with `CREATE TABLE IF NOT EXISTS` + CHECK constraints in `database.py`.
- Per-request connections stored on Flask `g`.
- Models in `models/*.py` issue raw SQL.
- `DB_PATH` / `DATABASE_FILE` env var points to a file.
- Dockerfile and Compose assume a volume-mounted SQLite file.

## Proposed Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Application                      │
│  models / routes  →  Database abstraction           │
└──────────────────────────┬──────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                                 ▼
   SQLiteBackend                    PostgresBackend
   (sqlite3)                        (psycopg / SQLAlchemy)
```

### Recommended Stack

| Layer              | Choice                          | Rationale |
|--------------------|---------------------------------|---------|
| Connection pool    | SQLAlchemy 2.x (Core only)      | Unified API for both engines, connection pooling, dialect handling |
| Driver (Postgres)  | `psycopg[binary]` 3.x           | Modern, async-ready, well-maintained |
| Migrations         | Alembic                          | Industry standard, works with SQLAlchemy |
| Config             | `DATABASE_URL` (preferred) + fallback to `DATABASE_FILE` | 12-factor friendly |

Alternatively, keep raw SQL and only introduce a thin adapter; SQLAlchemy Core is preferred for type safety and future-proofing.

## Implementation Steps

### Phase 1 – Abstraction Layer (1–1.5 days)

1. Introduce `src/directory/db/` package:
   - `base.py` – abstract `DatabaseBackend` protocol (connect, execute, commit, rollback, close).
   - `sqlite.py` – existing logic moved here.
   - `postgres.py` – new backend.
   - `factory.py` – `get_backend()` based on `DATABASE_URL` scheme or `DATABASE_ENGINE` env.

2. Environment variables (document in `.env.production.example` and docs):

   | Variable            | Example                                      | Notes |
   |---------------------|----------------------------------------------|-------|
   | `DATABASE_URL`      | `postgresql://user:pass@host:5432/directory` | Preferred |
   | `DATABASE_ENGINE`   | `sqlite` / `postgres`                        | Explicit override |
   | `DATABASE_FILE`     | `/data/users.db`                             | SQLite only |
   | `DB_POOL_SIZE`      | `5`                                          | Postgres pool |
   | `DB_MAX_OVERFLOW`   | `10`                                         | Postgres pool |

3. Update `get_db()` / `close_db()` to use the factory. Keep Flask `g` for request-scoped connection/session.

### Phase 2 – Schema & Migrations (1 day)

1. Move current `CREATE TABLE` statements into Alembic migration `0001_initial.py` (SQLite-compatible).
2. Add Postgres-specific adjustments in the same migration (or a follow-up):
   - Use `UUID` type or keep `TEXT` for IDs (recommend keep `TEXT` for simplicity and cross-engine compatibility).
   - Replace SQLite `CHECK(length(trim(...)) > 0)` with equivalent Postgres constraints or application-level validation.
   - Enable `uuid-ossp` or use `gen_random_uuid()` if we switch to native UUID later.
3. `alembic.ini` + `env.py` configured for both engines.
4. Startup behaviour:
   - SQLite: auto-create schema if missing (current behaviour) **or** run Alembic.
   - Postgres: **require** Alembic migrations; refuse to start if schema is missing (safer for production).

### Phase 3 – Models & Code Changes (1 day)

1. Audit every raw SQL string in `models/*.py` and `routes/*.py` for engine-specific syntax.
   - `?` placeholders → SQLAlchemy `:param` or keep `?` with dialect translation.
   - `BOOLEAN` / `TIMESTAMP` handling is already portable.
2. Replace direct `sqlite3.Row` usage with SQLAlchemy `Row` or plain dicts.
3. Ensure password hashing (already using `bcrypt`) stays unchanged.
4. Update `db_init.py` seeding to be engine-agnostic.

### Phase 4 – Docker & Compose (0.5 day)

1. Add optional `postgres` service to `docker-compose.yml` and `docker-compose.production.yml`:

   ```yaml
   postgres:
     image: postgres:16-alpine
     environment:
       POSTGRES_USER: directory
       POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
       POSTGRES_DB: directory
     volumes:
       - postgres-data:/var/lib/postgresql/data
     healthcheck:
       test: ["CMD-SHELL", "pg_isready -U directory"]
   ```

2. Directory service env when using Postgres:

   ```yaml
   environment:
     DATABASE_URL: postgresql://directory:${POSTGRES_PASSWORD}@postgres:5432/directory
   depends_on:
     postgres:
       condition: service_healthy
   ```

3. Keep SQLite as the default for the simple `docker-compose up` experience.

### Phase 5 – Testing & Documentation (0.5–1 day)

1. Unit tests for both backends (pytest + pytest-postgresql or testcontainers).
2. Integration tests that run against both engines in CI (GitHub Actions matrix).
3. Update docs:
   - `docs/configuration/remote-directory.md`
   - `docs/guides/sqlite-directory.md` → rename/expand to `database-backends.md`
   - New `docs/guides/postgres-setup.md`
4. Migration guide: “Moving from SQLite to Postgres” (dump/restore or Alembic offline SQL).

## Backward Compatibility

- Existing deployments that only set `DATABASE_FILE` continue to work with zero changes.
- Legacy endpoints (`/count`, `/find`, `/validate`) remain functional.
- Schema stays identical at the logical level.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Subtle SQL dialect differences | Use SQLAlchemy Core; extensive test matrix |
| Connection pool exhaustion under Gunicorn multi-worker | Document recommended pool size; use `--workers 1` or PgBouncer for high scale |
| Accidental schema drift | Alembic as single source of truth; CI checks |
| Performance regression on SQLite | Keep current single-connection-per-request pattern for SQLite |

## Success Criteria

- [ ] `DATABASE_URL=postgresql://...` starts the service and serves all existing API/UI endpoints.
- [ ] `DATABASE_FILE=...` (or no URL) continues to use SQLite unchanged.
- [ ] Alembic migrations apply cleanly on a fresh Postgres instance.
- [ ] CI runs the full test suite against both engines.
- [ ] Documentation and Compose examples are complete.

## Open Questions for Review

1. Prefer SQLAlchemy Core only, or also introduce ORM models later?
2. Keep TEXT primary keys or migrate to native UUID in Postgres?
3. Should we drop the auto-schema-creation path for SQLite in favour of pure Alembic?
4. Any desire for read replicas / connection routing in the first release?
