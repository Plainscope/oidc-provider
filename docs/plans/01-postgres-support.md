# Plan 01: Add PostgreSQL Support to Directory Service

**Status**: Draft for implementation  
**Target component**: `src/directory` persistence layer  
**Priority**: High  
**Estimated effort**: 3–5 days  
**Dependencies**: None

## Goals

- Support SQLite for simple/default deployments and PostgreSQL for production multi-instance deployments.
- Preserve the existing logical Directory data model and Provider-facing semantics.
- Introduce a database abstraction that is independent of the API framework.
- Provide migrations, connection pooling, Docker/Compose examples and dual-engine CI.

## Non-Goals

- Changing the Directory API contract as part of the database work.
- Changing Provider token issuance.
- Supporting additional database engines in the first iteration.

## Architecture

The persistence layer is shared by the FastAPI Directory application and must not depend on Flask request globals.

```
FastAPI routes / services
          |
   database abstraction
       /       \
   SQLite     PostgreSQL
```

Use SQLAlchemy 2.x Core where it simplifies cross-engine behavior, `psycopg` for PostgreSQL, and Alembic for schema migrations.

## Implementation Steps

1. Introduce a database abstraction and engine factory.
2. Preserve `DATABASE_FILE` for SQLite and add `DATABASE_URL` for PostgreSQL.
3. Move schema creation into Alembic migrations.
4. Audit SQL for cross-engine behavior and replace SQLite-specific row/connection assumptions.
5. Add PostgreSQL Docker/Compose configuration.
6. Run the relevant test suite against both engines in CI.
7. Document SQLite and PostgreSQL configuration and migration procedures.

## Compatibility

- Existing SQLite deployments remain supported.
- The logical schema and Directory operations required by the Provider remain stable.
- Database work must not retain or introduce Flask-specific application assumptions; the redesigned API is FastAPI.
- Legacy API endpoint retention/removal is governed by Plan 02 and ADR-005, not by this database plan.

## Success Criteria

- [ ] SQLite remains functional.
- [ ] PostgreSQL migrations apply cleanly.
- [ ] Full relevant tests pass against both engines.
- [ ] Provider-required Directory operations retain their logical semantics.
- [ ] Documentation and Compose examples are complete.

## Settled Architecture Constraints

The database layer is consumed by FastAPI (**ADR-001**), supports the embedded React/TypeScript admin deployment (**ADR-002/003**), does not issue tokens (**ADR-004**), and does not determine legacy API removal (**ADR-005**).
