# Plan 02: API Redesign – OpenAPI-first, Versioning, Pagination, Error Shapes

**Status**: Draft for review  
**Target component**: `src/directory` (routes + models)  
**Priority**: High  
**Estimated effort**: 4–6 days  
**Dependencies**: Benefits from Postgres plan (connection pooling) but can start in parallel

## Goals

- Make the API **OpenAPI 3.1 first** (spec is the source of truth).
- Introduce explicit versioning (`/api/v1/...`).
- Standardise pagination, filtering, sorting and field selection.
- Remove or deprecate the legacy endpoints (`/count`, `/find/:id`, `/validate`).
- Adopt consistent, machine-readable error shapes (RFC 9457 Problem Details).
- Improve discoverability, client generation, and contract testing.

## Non-Goals

- GraphQL or gRPC in this iteration.
- Breaking changes for the OIDC provider’s internal remote-directory client without a compatibility layer.
- Full HATEOAS / hypermedia controls (optional later).

## Current State

- Flask blueprints under `/api/*` (domains, users, roles, groups, property_keys, audit).
- Legacy compatibility routes: `/count`, `/find/<id>`, `/validate`, `/healthz`.
- Ad-hoc query parameters, no formal pagination contract.
- Errors are simple `{"error": "message"}` JSON.
- No OpenAPI document; documentation is Markdown only.
- Bearer-token auth only (see Plan 04 for JWT).

## Target API Surface (v1)

### Versioning Strategy

- URL path prefix: `/api/v1/`.
- Accept header fallback: `Accept: application/vnd.plainscope.directory.v1+json` (optional).
- Breaking changes → new major version (`/api/v2/`).
- Deprecation headers: `Deprecation: true`, `Sunset: <date>` on old routes.

### Resource Endpoints (illustrative)

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

# nested / related
GET    /api/v1/users/{id}/emails
POST   /api/v1/users/{id}/emails
GET    /api/v1/users/{id}/roles
PUT    /api/v1/users/{id}/roles          # replace set
GET    /api/v1/users/{id}/groups
...

GET    /api/v1/roles
...
GET    /api/v1/groups
...
GET    /api/v1/audit-logs
GET    /api/v1/health
```

Legacy endpoints will be moved under `/api/v1/legacy/...` for one major version, then removed.

### Pagination, Filtering, Sorting

Adopt a consistent query-parameter convention (inspired by JSON:API / GitHub / Stripe):

| Parameter       | Type     | Description |
|-----------------|----------|-------------|
| `page`          | integer  | 1-based page number (default 1) |
| `per_page`      | integer  | 1–100 (default 20) |
| `sort`          | string   | Comma-separated fields, prefix `-` for desc (`-created_at,name`) |
| `filter[field]` | string   | Exact or operator-based (`filter[email]=alice@...`, `filter[is_active]=true`) |
| `q`             | string   | Free-text search across name/email/username |
| `fields`        | string   | Sparse fieldsets (`fields=id,username,email`) |

Response envelope:

```json
{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 142,
    "total_pages": 8
  },
  "links": {
    "self": "/api/v1/users?page=1&per_page=20",
    "next": "/api/v1/users?page=2&per_page=20",
    "prev": null,
    "first": "/api/v1/users?page=1&per_page=20",
    "last": "/api/v1/users?page=8&per_page=20"
  }
}
```

### Error Shape (RFC 9457 Problem Details)

```json
{
  "type": "https://plainscope.dev/errors/validation-error",
  "title": "Validation Error",
  "status": 422,
  "detail": "One or more fields failed validation.",
  "instance": "/api/v1/users",
  "errors": [
    { "field": "email", "code": "invalid_format", "message": "Must be a valid email" }
  ]
}
```

Common problem types will be documented and versioned.

### OpenAPI-first Workflow

1. Author OpenAPI 3.1 YAML in `src/directory/openapi/v1.yaml` (or split by resource).
2. Generate Flask route stubs / Pydantic (or marshmallow) models from the spec using `openapi-generator` or `datamodel-code-generator`.
3. Validate requests/responses against the schema at runtime (optional middleware).
4. Serve the live spec at `/api/v1/openapi.json` and Swagger UI / ReDoc at `/api/v1/docs`.
5. Contract tests: Schemathesis or Dredd against the live server.

## Implementation Steps

### Phase 1 – Spec & Tooling (1–1.5 days)

1. Write complete OpenAPI 3.1 document covering all current resources + new pagination/error models.
2. Add `openapi-python-client` / `fastapi` style generators or keep Flask and use `flask-smorest` / `apispec`.
   - Recommendation: migrate the API layer to **Flask-Smorest** (or switch the whole service to FastAPI). Flask-Smorest keeps Flask while giving OpenAPI-first ergonomics.
3. CI step that fails if the implementation drifts from the committed OpenAPI file.

### Phase 2 – Versioned Routes & Envelope (1.5 days)

1. Create `/api/v1` blueprint tree.
2. Implement pagination helper (`paginate(query, page, per_page)`).
3. Implement filtering/sorting parser (whitelist fields per resource).
4. Standard response serializers that produce the `data`/`meta`/`links` envelope.
5. Move existing handlers under the new structure; keep old paths temporarily with deprecation headers.

### Phase 3 – Error Handling (0.5 day)

1. Global error handler that converts exceptions → Problem Details.
2. Validation errors (from Marshmallow/Pydantic) mapped to 422 with field-level details.
3. Consistent status codes (401, 403, 404, 409, 422, 429, 500).

### Phase 4 – Legacy Endpoint Strategy (0.5 day)

1. Re-implement `/count`, `/find/:id`, `/validate` under `/api/v1/legacy/...` (or keep original paths with `Deprecation` + `Sunset` headers for 6–12 months).
2. Update the OIDC provider’s remote-directory client to use the new endpoints (coordinate with provider team).
3. Document migration guide for external consumers.

### Phase 5 – Documentation & Client Generation (1 day)

1. Auto-generate Markdown or HTML docs from OpenAPI.
2. Publish example TypeScript / Python clients.
3. Update `docs/api/` and README.

## Backward Compatibility Plan

- Keep original `/api/*` routes for one minor release with deprecation warnings in logs and headers.
- Provide a compatibility shim that maps old responses to new shapes if needed by the OIDC provider.
- Announce sunset date in release notes and OpenAPI `deprecated: true`.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| OIDC provider breaks | Ship compatibility layer; update provider in the same PR series |
| Over-engineering pagination | Start with page/per_page only; add cursor later if needed |
| Spec drift | CI contract tests + generated code |
| Performance of complex filters | Index the filtered columns; limit allowed operators |

## Success Criteria

- [ ] Complete OpenAPI 3.1 document committed and served at `/api/v1/openapi.json`.
- [ ] All list endpoints support the standard pagination/filter/sort contract.
- [ ] All error responses conform to RFC 9457.
- [ ] Legacy endpoints either removed or clearly deprecated with a sunset date.
- [ ] Generated client can perform full CRUD against a running instance.
- [ ] CI fails on OpenAPI ↔ implementation drift.

## Open Questions for Review

1. Stay on Flask + Flask-Smorest, or migrate the directory service to FastAPI?
2. Prefer offset pagination or cursor-based for large result sets?
3. How long should the legacy endpoints remain (6 months / 1 major version)?
4. Should we expose a `/api/v1/me` endpoint for the authenticated admin user?
