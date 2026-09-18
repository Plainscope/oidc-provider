# Directory Service Redesign Plans

These implementation plans describe the redesign of the `src/directory` remote Directory service. The accepted ADRs in `docs/adr/` are the source of truth for architectural decisions.

## Plans

| # | Plan | Status | Est. Effort | Priority |
|---|------|--------|-------------|----------|
| 01 | [PostgreSQL Support](./01-postgres-support.md) | Draft | 3–5 days | High |
| 02 | [FastAPI v1 API Redesign](./02-api-redesign.md) | Draft | 4–6 days | High |
| 03 | [React + TypeScript Embedded SPA](./03-ui-spa-redesign.md) | Draft | 6–10 days | Medium-High |
| 04 | [Security & Production Readiness](./04-security-production-readiness.md) | Draft | 4–7 days | Critical |
| 05 | [Admin UX, Security UX & Delivery Quality](./05-admin-ux-security-enhancements.md) | Proposed | 3–5 days | High |

## Accepted Architecture Decisions

- **FastAPI** is the Directory API framework ([ADR-001](../adr/001-fastapi-for-directory-api.md)).
- **React + TypeScript** is the admin UI stack ([ADR-002](../adr/002-react-typescript-admin-ui.md)).
- The SPA is **embedded** in the Directory deployment ([ADR-003](../adr/003-embedded-spa-deployment.md)).
- The Directory is a **backing store**; the Provider remains responsible for token issuance ([ADR-004](../adr/004-directory-is-backing-store.md)).
- Legacy API endpoints may be removed after the Provider is migrated and verified against `/api/v1`; Provider compatibility is a release gate ([ADR-005](../adr/005-immediate-legacy-api-deprecation.md)).

Plans must implement these decisions rather than reopen them.

## Execution Order

1. **Plan 01 (PostgreSQL)** and **Plan 04 (security foundations)** can proceed in parallel.
2. **Plan 02 (FastAPI v1)** establishes the API contract and updates the Provider.
3. **Plan 03 (embedded React SPA)** integrates against the v1 contract and Directory admin authentication.
4. **Plan 05** adds cross-cutting UX, resilience, accessibility and E2E coverage.
5. Remove legacy API endpoints only after the Provider migration and verification gates in Plan 02/ADR-005 are complete.

Plan 01 and security scaffolding can proceed before the full API migration, but all implementation PRs must respect the settled architecture.

## Review Checklist

- [ ] FastAPI is used for the redesigned Directory API.
- [ ] React + TypeScript is used for the admin UI.
- [ ] SPA assets are embedded in the Directory deployable artifact.
- [ ] Provider remains the token-issuing authority.
- [ ] Provider compatibility tests pass before legacy API removal.
- [ ] No plan reintroduces a separate Directory token authority.

## Next Steps

Create/execute implementation issues #41–#45 against these plans. #40 is satisfied by this reconciliation update.
