# ADR-001: Use FastAPI for the Directory API

- **Status:** Accepted
- **Date:** 2026-09-17
- **Decision:** Implement the redesigned Directory API with FastAPI.

## Context

The Directory service is being redesigned around a versioned API contract, OpenAPI documentation, structured errors, pagination, and production-oriented security controls. The existing service is Flask-based.

## Decision

Use **FastAPI** as the application framework for the new Directory API.

The implementation should:
- expose the new API under `/api/v1`;
- generate and publish an OpenAPI 3.x contract;
- use typed request/response models and validation;
- provide structured API errors;
- preserve the existing Directory data model and provider-facing semantics where practical;
- treat compatibility with the Provider service as an explicit acceptance criterion.

The migration should be incremental where feasible so that the Provider can be updated and tested against the new API before legacy endpoints are removed.

## Consequences

### Positive
- Strong request/response typing and validation.
- OpenAPI is a first-class part of the framework.
- Clear separation between API contracts and persistence.

### Negative
- This is a framework migration from Flask.
- Existing Jinja/admin routes and Flask-specific code will require migration or replacement.
- Deployment, middleware, testing, and operational conventions must be updated.

## Compatibility

FastAPI is an implementation choice; it must not change the logical Directory contract required by the Provider without an explicit API migration. Provider integration tests should exercise the new API before legacy endpoints are removed.
