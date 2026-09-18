# Plan 05: Admin UX, Security UX & Delivery Quality Enhancements

**Status**: Proposed enhancement  
**Target component**: `src/directory` (SPA, API integration, tests, deployment/docs)  
**Priority**: High  
**Estimated effort**: 3–5 days incremental to Plans 02–04  
**Dependencies**: Plans 02, 03 and 04

## Purpose

This plan captures additional enhancements to make the redesigned directory console safer and more operationally useful, without turning it into a full identity-management product.

The emphasis is on **clarity, safe administration, accessibility, and production feedback** rather than adding more screens.

## Enhancements

### 1. Admin-first information architecture

- Use a persistent navigation shell with clear **Manage** and **Observe** sections.
- Keep Users as the primary workflow; expose Roles, Groups and Domains as secondary resources.
- Put Audit and system health under an Observe section.
- Add breadcrumbs on detail/edit views so destructive workflows retain context.
- Provide a command palette (⌘K / Ctrl+K) for navigation and common actions.
- Make search state URL-addressable so filtered lists can be bookmarked/shared.

### 2. Safer destructive and privileged actions

- Require an explicit confirmation for delete, bulk deactivate, role replacement and other high-impact mutations.
- Confirmation dialogs must state the target, action and irreversible consequence where applicable.
- Disable submit controls while mutations are in flight and surface the server result.
- After mutation, invalidate affected TanStack Query caches rather than relying on stale optimistic state.
- For bulk actions, show the exact number of affected records before confirmation.
- Never display access tokens, refresh tokens, passwords, private keys or other secrets in tables, toasts, audit views or client-side logs.

### 3. Security-aware SPA authentication

- Keep access JWTs in memory by default.
- Use the httpOnly refresh cookie defined by Plan 04; do not persist refresh tokens in localStorage.
- Centralize 401 handling: attempt one silent refresh, then redirect to login.
- Prevent refresh loops and concurrent refresh storms with a single-flight refresh promise.
- Clear in-memory credentials on logout and browser-session teardown.
- Surface generic authentication errors to users while preserving detailed diagnostics in server-side logs.

### 4. Operational visibility

Add a compact status area to the dashboard:

- API reachability and latency.
- Database readiness when exposed by the backend.
- Authentication/session status.
- Last successful data refresh.
- Degraded/error states with a clear retry action.

For audit logs:

- Show actor/service identity, timestamp, action, resource and outcome.
- Support correlation/request IDs when supplied by the API.
- Make change details expandable rather than permanently occupying table width.
- Keep CSV export server-driven or generated from already-authorized API data.

### 5. Data-table quality

Standardize a reusable table component with:

- Server-side pagination, filtering and sorting aligned to Plan 02.
- Debounced search.
- Persisted column visibility and page size.
- Select-all semantics scoped explicitly to the current page/filter.
- Keyboard-accessible row selection and actions.
- Stable empty, loading, partial-error and retry states.
- Mobile fallback that converts dense rows into stacked record cards rather than horizontal scrolling wherever practical.

### 6. Forms and validation

- Share Zod schemas with API response/request types where feasible.
- Validate on blur and submit; avoid noisy validation while users are typing.
- Preserve entered values when a request fails.
- Mark required fields semantically, not only with color.
- Provide password strength guidance without logging or transmitting password values outside the intended request.
- Announce validation and mutation results to assistive technology with live regions.

### 7. Accessibility and interaction quality

Target WCAG 2.2 AA as stated in Plan 03, with additional checks for:

- Visible keyboard focus.
- Focus trapping and restoration in dialogs/drawers.
- Escape-to-close for overlays.
- Logical heading hierarchy.
- Color-independent status indicators.
- Reduced-motion preference.
- Screen-reader announcements for route changes and async mutations.
- Touch targets appropriate for mobile administration.

### 8. Performance and resilience

- Route-level code splitting for Users, Roles, Groups, Domains and Audit.
- Cache stable reference data such as roles/groups with sensible stale times.
- Abort obsolete search requests.
- Avoid rendering thousands of rows client-side; rely on API pagination.
- Add error boundaries around route-level UI.
- Keep the initial shell lightweight and defer non-critical screens.

### 9. Test strategy

Add tests at three levels:

1. **Unit/component**: forms, dialogs, auth state transitions, table selection/filtering.
2. **API contract**: generated client types and error handling against the Plan 02 OpenAPI contract.
3. **End-to-end**: login → list users → edit user → verify audit entry; plus logout/refresh and unauthorized flows.

Include accessibility checks in CI for the principal routes.

### 10. Secure deployment defaults

Extend the SPA packaging work with:

- CSP that permits only the resources actually required by the embedded build; remove CDN dependencies.
- HSTS and Permissions-Policy in production.
- No source maps containing sensitive deployment information in production unless explicitly required.
- Runtime configuration supplied through a safe server-rendered endpoint or build-time public configuration; never embed secrets in the frontend bundle.
- Read-only static assets and non-root runtime as supported by the container.
- Document proxy headers and trusted-proxy configuration so client IP/request IDs cannot be spoofed by untrusted upstreams.

## Rollout

1. Implement the design-system and safety primitives before the resource pages.
2. Ship Users first behind `UI_ENABLED=true`.
3. Run the SPA against the versioned API contract while retaining legacy routes.
4. Enable Roles, Groups, Domains and Audit after their contract tests pass.
5. Keep a documented rollback path to the existing UI during the first release.
6. Remove CDN-based assets and old templates only after the SPA has parity for all required workflows.

## Definition of Done

- [ ] No secret-bearing values are persisted by the SPA.
- [ ] High-impact mutations have explicit, accessible confirmation.
- [ ] Users supports server-side search/filter/sort/pagination and safe bulk actions.
- [ ] Auth refresh is single-flight and handles 401s without loops.
- [ ] Audit views expose actor/action/outcome/correlation context without leaking secrets.
- [ ] Principal routes pass automated accessibility checks.
- [ ] Route-level errors, loading states and retry paths are covered.
- [ ] Production build contains no CDN runtime dependencies.
- [ ] E2E coverage exercises login, refresh, CRUD, audit and logout.
- [ ] Deployment/rollback documentation is updated.

## Open Questions

1. Which actions should require step-up authentication once the authentication model supports it?
2. Should bulk operations be synchronous with a hard limit, or move to an asynchronous job model for large selections?
3. Should audit CSV export be limited to privileged roles?
4. What is the preferred public branding/design token set for the Plainscope/Cuemarshal deployment?
