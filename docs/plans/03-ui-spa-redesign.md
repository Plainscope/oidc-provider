# Plan 03: React + TypeScript Embedded Admin SPA

**Status**: Draft for implementation  
**Target component**: `src/directory` (API integration, frontend, static assets)  
**Priority**: Medium-High  
**Estimated effort**: 6–10 days  
**Dependencies**: React/TypeScript and embedded deployment are settled by ADR-002/ADR-003; final API integration follows Plan 02.

## Goals

- Replace the server-rendered Jinja + Alpine.js admin UI with a **React + TypeScript** SPA.
- Build the SPA with Vite and package its static assets with the Directory service.
- Serve the SPA alongside the Directory API from the same deployable service.
- Provide accessible, responsive administration workflows for Directory data and audit views.
- Keep API-only operation possible; the SPA is an admin surface, not a token issuer.

## Non-Goals

- A separate frontend hosting tier in the initial deployment.
- A full identity-management product.
- Native mobile applications.
- Introducing an independent authentication/token authority.

## Technology

| Layer | Choice |
|---|---|
| Framework | React + TypeScript |
| Build | Vite |
| Routing | React Router |
| Data fetching | TanStack Query |
| UI | shadcn/ui + Tailwind CSS |
| Forms/validation | React Hook Form + Zod |
| Tables | TanStack Table |

These choices implement the accepted architecture decision; React/Vue/Svelte and embedded/separate hosting are no longer open questions.

## Architecture

```
src/directory/
├── frontend/                 # React + TypeScript source
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/              # generated/typesafe v1 client
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       └── lib/
├── static/                   # Vite production output
└── ...                       # FastAPI application and persistence
```

The Directory build produces the frontend assets and packages them into the Directory deployable artifact. The Directory service serves the SPA and `/api/v1` from the same deployment.

Keep static hosting concerns isolated so the assets can move to a dedicated host later without changing the API contract.

## Authentication Boundary

The SPA authenticates to the Directory administration surface using the Directory's admin authentication mechanism. It must not treat the Directory as an OIDC/token issuer for end users.

Provider token issuance remains entirely owned by the Provider. The SPA may obtain an authenticated Directory session/access credential as required for administration, but that credential is not a Provider OIDC token.

Coordinate the exact admin authentication flow with Plan 04 and use the `/api/v1` contract from Plan 02.

## UX Scope

- Users, Roles, Groups, Domains and Audit workflows.
- Search, filtering, sorting, server-side pagination and safe mutation confirmation.
- Accessible forms and dialogs targeting WCAG 2.2 AA.
- Responsive layout, loading/empty/error states, keyboard navigation and reduced-motion support.
- No secret-bearing values in rendered UI, browser storage, or client-side logs.

## Implementation Steps

### Phase 1 – Scaffold

1. Create the Vite React/TypeScript application.
2. Configure linting, formatting, tests and path aliases.
3. Implement the shared layout and design primitives.
4. Generate/typesafe the client for the FastAPI `/api/v1` contract.

### Phase 2 – Authentication and routing

1. Implement the Directory admin login/session flow defined by Plan 04.
2. Protect admin routes.
3. Centralize authentication failure handling and logout.
4. Ensure no Provider/OIDC token lifecycle is implemented in the Directory UI.

### Phase 3 – Core administration

1. Implement Users first.
2. Add Roles, Groups and Domains.
3. Add Audit views.
4. Implement server-side table operations against `/api/v1`.

### Phase 4 – Accessibility and resilience

1. Add keyboard/focus management and screen-reader announcements.
2. Add error boundaries, retry states and request cancellation.
3. Add route-level code splitting and sensible caching.
4. Add unit/component and accessibility tests.

### Phase 5 – Embedded packaging

1. Build with Vite as part of the Directory build.
2. Copy/package output into the Directory static asset location.
3. Configure FastAPI to serve the SPA and static assets alongside the API.
4. Remove CDN runtime dependencies.
5. Update Docker/Compose and deployment documentation.
6. Remove the old Jinja/Alpine UI only after SPA parity for required workflows is verified.

## Compatibility and Rollout

- The Provider's machine-to-machine integration is independent of the admin UI.
- The SPA consumes the same versioned API contract used for supported Directory clients.
- During rollout, the old UI may remain available only as an implementation transition; it is not a long-term architectural dependency.
- Embedded deployment is the initial and supported deployment model.
- Keep a documented rollback path for the combined Directory release.

## Security

- No secrets in the frontend bundle.
- No refresh credentials in localStorage.
- CSP/HSTS/Permissions-Policy must match the embedded asset model.
- Static assets are bundled rather than loaded from runtime CDNs.
- Do not expose Provider signing keys or Provider-issued tokens through the admin UI.

## Success Criteria

- [ ] React + TypeScript SPA replaces the required Jinja/Alpine workflows.
- [ ] Vite production assets are embedded in the Directory deployable artifact.
- [ ] FastAPI serves the SPA and `/api/v1` from the Directory service.
- [ ] SPA uses the final v1 contract.
- [ ] No CDN runtime dependencies remain.
- [ ] Accessibility and core E2E coverage pass.
- [ ] Provider token issuance remains outside Directory.

## Settled Decisions

- React + TypeScript: **ADR-002**.
- Embedded SPA deployment: **ADR-003**.
- Directory is a backing store, not a token issuer: **ADR-004**.
