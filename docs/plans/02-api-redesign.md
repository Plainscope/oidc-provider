# Plan 02: FastAPI v1 API Redesign

**Status**: Draft for implementation  
**Target component**: `src/directory` and Provider remote-directory client  
**Priority**: High  
**Estimated effort**: 4–6 days  
**Dependencies**: Plan 01 may proceed independently; Provider compatibility is a release gate.

## Goals

- Replace the Directory API layer with **FastAPI**.
- Define and implement a versioned `/api/v1` contract with OpenAPI 3.x.
- Use typed request/response models and validation.
- Standardize pagination, filtering, sorting, and RFC 9457 Problem Details errors.
- Preserve the logical Directory operations required by the Provider even when paths or payloads change.
- Update the Provider to consume `/api/v1` before legacy endpoints are removed.

## Non-Goals

- GraphQL or gRPC.
- Making the Directory an OIDC/token issuer.
- Maintaining a long-term legacy compatibility window.
- Breaking the Provider's required Directory semantics without an explicit migration decision.

## Current State

The Directory API is Flask-based and exposes resource routes plus legacy endpoints such as `/count`, `/find/<id>`, and `/validate`. The Provider consumes Directory operations and remains the token-issuing authority.

## Target API Surface

Use a URL prefix of `/api/v1/`. Illustrative resources:

```
GET    /api/v1/domains
POST   /api/v1/domains
GET    /api/v1/domains/{id}
PATCH  /api/v1/domains/{id}
DELETE /api/v1/domains/{id}

GET    /api/v1/users
POST   /api/v1/users
GET    /api/v1/users/{id}
PATCH  /api/v1/users/{id}
DELETE /api/v1/users/{id}

GET    /api/v1/users/{id}/emails
GET    /api/v1/users/{id}/roles
PUT    /api/v1/users/{id}/roles
GET    /api/v1/users/{id}/groups

GET    /api/v1/roles
GET    /api/v1/groups
GET    /api/v1/audit-logs
GET    /api/v1/health
```

The final contract must enumerate every operation required by the Provider and admin UI.

### Pagination, Filtering, Sorting

Use a consistent `page`, `per_page`, `sort`, `filter[field]`, `q`, and `fields` convention. Responses use `data`, `meta`, and navigation links where applicable.

### Errors

Return RFC 9457 Problem Details for API errors, with documented field-level validation details where applicable.

### OpenAPI

FastAPI is the source of the generated OpenAPI contract. Publish the contract at `/api/v1/openapi.json` and interactive documentation at the FastAPI documentation endpoint. Do not maintain a separate hand-authored implementation contract that can drift from the application.

## Implementation Steps

### Phase 1 – FastAPI application and contract

1. Introduce the FastAPI application and router structure.
2. Define Pydantic request/response models.
3. Mount all new resources below `/api/v1`.
4. Add authentication dependencies appropriate to Provider-to-Directory and admin callers.
5. Generate and validate OpenAPI documentation.

### Phase 2 – Resource behavior

1. Port existing Directory operations to FastAPI while preserving required logical semantics.
2. Implement pagination/filtering/sorting consistently.
3. Implement RFC 9457 error handling.
4. Add contract tests for all Provider-facing operations.

### Phase 3 – Provider migration

1. Update the Provider's remote-directory client to call `/api/v1`.
2. Preserve the Provider's expected Directory semantics across changed paths, payloads, and error formats.
3. Run integration tests against the new Directory implementation.
4. Verify the Provider no longer depends on legacy endpoints.

### Phase 4 – Legacy removal

1. Keep legacy endpoints only as long as the Provider still requires them during migration.
2. Once the Provider has been updated and verified, remove the legacy endpoints; no fixed 6–12 month compatibility period is required.
3. Document deployment and rollback sequencing for the coupled Directory/Provider migration.

## Backward Compatibility

Compatibility is defined by the Provider's required Directory operations, not by retaining legacy URL paths indefinitely.

The migration gate is:

1. `/api/v1` contract implemented.
2. Provider updated to use it.
3. Provider integration/contract tests pass.
4. Required Directory operations have equivalent documented `/api/v1` behavior.
5. Deployment/rollback procedure is documented.
6. Only then may `/count`, `/find/<id>`, `/validate`, and other legacy endpoints be removed.

The Provider continues to issue OIDC tokens; the Directory does not introduce a competing token lifecycle.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Provider breaks during migration | Provider integration tests are a release gate before legacy removal |
| FastAPI migration changes semantics | Preserve logical Provider-facing operations and test them explicitly |
| Spec drift | Use FastAPI-generated OpenAPI plus contract tests |
| API query complexity | Whitelist sortable/filterable fields and enforce bounded pagination |

## Success Criteria

- [ ] Directory API is implemented with FastAPI.
- [ ] Complete `/api/v1` OpenAPI contract is generated and validated.
- [ ] Provider consumes `/api/v1` successfully.
- [ ] Provider integration/contract tests pass.
- [ ] Required resource operations have documented v1 equivalents.
- [ ] Legacy endpoints are removed only after the Provider migration gate passes.

## Decisions Already Settled

- FastAPI: **ADR-001**.
- Provider is the token issuer: **ADR-004**.
- Legacy endpoints may be removed immediately after verified Provider migration: **ADR-005**.

These are not open questions for this plan.
