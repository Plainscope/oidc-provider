# Plan 05: Admin UX, Security UX & Delivery Quality Enhancements

**Status**: Proposed enhancement  
**Target component**: Directory SPA, FastAPI API integration, tests and deployment/docs  
**Priority**: High  
**Estimated effort**: 3–5 days incremental to Plans 02–04  
**Dependencies**: Plans 02, 03 and 04

## Purpose

Improve the embedded React + TypeScript administration experience with safe workflows, accessibility, resilience and operational visibility without expanding the Directory into a token-issuing identity product.

## Enhancements

### 1. Admin-first information architecture

- Persistent navigation with Manage and Observe sections.
- Users as the primary workflow; Roles, Groups and Domains as secondary resources.
- Audit and health under Observe.
- Breadcrumbs, command palette and URL-addressable search state.

### 2. Safer privileged actions

- Explicit confirmation for deletes, bulk deactivation, role replacement and other high-impact mutations.
- Disable controls during mutations and show authoritative server results.
- Invalidate affected query caches after mutations.
- Never display passwords, access/refresh credentials, private keys or other secrets in UI, audit views or client logs.

### 3. Directory admin authentication

- Use the admin authentication/session contract defined by Plan 04.
- Keep browser credentials scoped to the Directory administration surface.
- Do not persist sensitive credentials in localStorage.
- Centralize 401 handling and prevent refresh loops/storms where refresh is supported.
- Do not implement Provider/OIDC token issuance in the Directory.

### 4. Operational visibility

Show API reachability/latency, database readiness where exposed, authentication/session state, refresh timestamps and degraded/error states.

Audit views should include actor/service identity, timestamp, action, resource, outcome and correlation/request IDs without exposing secrets.

### 5. Data tables and forms

- Server-side pagination/filtering/sorting aligned to Plan 02.
- Debounced search, stable loading/empty/error states and explicit select-all semantics.
- Keyboard-accessible controls.
- Preserve entered form values after failed requests.
- Semantic required fields and accessible validation announcements.

### 6. Accessibility

Target WCAG 2.2 AA with visible focus, focus trapping/restoration, logical headings, color-independent status, reduced-motion support and screen-reader announcements.

### 7. Performance and resilience

- Route-level code splitting.
- Abort obsolete requests.
- Bounded server-side pagination.
- Route-level error boundaries.
- Lightweight initial shell.

### 8. Testing

1. Unit/component tests for forms, dialogs, auth state and table behavior.
2. API contract tests against the FastAPI `/api/v1` contract.
3. E2E coverage for login, CRUD, audit, logout and unauthorized flows.
4. Accessibility checks in CI.

### 9. Secure embedded deployment

- CSP permits only resources required by the embedded build.
- No CDN runtime dependencies.
- No secrets in frontend build/runtime configuration.
- Read-only static assets and non-root runtime where supported.
- Document trusted-proxy headers.

## Rollout

1. Build safety/design primitives first.
2. Ship Users first against `/api/v1`.
3. Add Roles, Groups, Domains and Audit as their contract tests pass.
4. Complete authentication integration with Plan 04.
5. Verify required workflows before removing old Jinja/Alpine assets.
6. Keep a documented rollback path for the embedded Directory release.

## Definition of Done

- [ ] High-impact mutations have explicit accessible confirmation.
- [ ] SPA uses the FastAPI `/api/v1` contract.
- [ ] No secret-bearing values are persisted or logged by the SPA.
- [ ] Authentication handling does not imply Directory token issuance.
- [ ] Accessibility, resilience and E2E coverage pass.
- [ ] Embedded production build contains no CDN runtime dependencies.
- [ ] Deployment/rollback documentation is updated.

## Settled Decisions

This enhancement plan follows FastAPI (**ADR-001**), React + TypeScript (**ADR-002**), embedded deployment (**ADR-003**), Provider token authority (**ADR-004**), and Provider-gated legacy API removal (**ADR-005**).
