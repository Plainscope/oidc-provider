# Plan 03: Replace Alpine.js + Tailwind CDN Dashboard with Modern SPA

**Status**: Draft for review  
**Target component**: `src/directory` (views + new frontend)  
**Priority**: Medium-High  
**Estimated effort**: 6–10 days  
**Dependencies**: Benefits from API Plan 02 (stable contracts, OpenAPI client generation)

## Goals

- Replace the current server-rendered Jinja + Alpine.js + Tailwind CDN UI with a modern single-page application.
- Improve UX: faster interactions, better forms, real-time feedback, accessibility, responsive design, dark mode.
- Keep the UI optional (API-only deployments remain first-class).
- Ship a polished, maintainable admin experience that feels contemporary.

## Non-Goals

- Building a full identity-management product UI (focus stays on directory CRUD + audit).
- Supporting multiple simultaneous admin users with real-time collaboration (nice-to-have later).
- Native mobile apps.

## Current State

- Server-side Jinja2 templates under `src/directory/views/`.
- Alpine.js for interactivity, Tailwind via CDN.
- Session-based authentication for the UI (cookie).
- CSRF protection via Flask-WTF.
- Tabs for Users / Roles / Groups / Domains / Audit.
- Basic forms, confirmation dialogs, no advanced table features (sorting, bulk actions, column chooser).

## Technology Choice

**Recommended stack** (subject to review):

| Layer            | Choice                     | Rationale |
|------------------|----------------------------|---------|
| Framework        | **React 19 + TypeScript**  | Largest ecosystem, excellent tooling, easy to hire for |
| Build            | Vite                       | Fast, modern defaults |
| Routing          | React Router 7             | Standard |
| Data fetching    | TanStack Query (React Query) | Caching, mutations, optimistic updates |
| UI components    | shadcn/ui + Tailwind CSS   | Beautiful, accessible, copy-paste, fully controllable |
| Forms            | React Hook Form + Zod      | Type-safe validation matching OpenAPI schemas |
| Tables           | TanStack Table             | Powerful headless tables |
| Auth             | JWT (from Plan 04) stored in memory + httpOnly refresh cookie | Secure SPA pattern |
| Icons            | Lucide                     | Consistent with shadcn |

Alternatives considered:
- Vue 3 + Nuxt – lighter, still excellent; choose if team prefers Vue.
- SvelteKit – smallest bundle, great DX; smaller ecosystem.
- Keep Alpine but vendor it and improve templates – lower effort, lower ceiling.

**Decision needed**: Confirm React vs Vue vs Svelte before implementation starts.

## Architecture

```
src/directory/
├── api/                  # existing Flask backend (serves /api/v1)
├── frontend/             # new SPA
│   ├── package.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── api/          # generated OpenAPI client + React Query hooks
│   │   ├── components/   # shadcn + domain components
│   │   ├── pages/        # Users, Roles, Groups, Domains, Audit, Login
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── types/
│   └── index.html
└── ...
```

Deployment options:
1. **Embedded**: Vite builds to `src/directory/static/`, Flask serves the SPA + API (simplest).
2. **Separate**: Frontend on CDN / static host, API on its own origin (CORS + proper auth).

Recommend starting with embedded for the Docker image, with a clear path to split later.

## UX Improvements

- **Users page**: searchable, filterable, sortable data table; bulk activate/deactivate; quick-edit drawer; multi-email management; role/group assignment with multi-select.
- **Create/Edit forms**: progressive disclosure, live validation, password strength meter, “copy invite link” (future).
- **Audit log**: advanced filters (entity, action, date range, actor), expandable change diffs, export CSV.
- **Dashboard home**: high-level stats (user count, recent activity, health).
- **Global**: command palette (⌘K), dark/light theme, keyboard shortcuts, toast notifications, loading skeletons, empty states, error boundaries.
- **Accessibility**: WCAG 2.2 AA target, focus management, screen-reader labels, reduced-motion support.
- **Responsive**: full mobile layout for admin on the go.

## Implementation Steps

### Phase 1 – Scaffold & Design System (1.5–2 days)

1. Create `frontend/` with Vite + React + TS + Tailwind + shadcn/ui.
2. Set up path aliases, ESLint, Prettier, Vitest.
3. Implement layout shell (sidebar, top bar, theme toggle).
4. Generate TypeScript client from OpenAPI (Plan 02) and wire React Query.

### Phase 2 – Auth & Routing (1 day)

1. Login page using the new JWT / session endpoint (Plan 04).
2. Protected routes + auth context / interceptor that attaches Bearer token.
3. Logout, token refresh, redirect-to-login on 401.

### Phase 3 – Core CRUD Pages (3–4 days)

1. Users list + detail/edit drawer (highest priority).
2. Roles, Groups, Domains pages.
3. Audit log with filters.
4. Shared components: ConfirmDialog, DataTable, FormField, StatusBadge, etc.

### Phase 4 – Polish & Accessibility (1–1.5 days)

1. Loading / empty / error states everywhere.
2. Keyboard navigation and ARIA audit.
3. Dark mode persistence.
4. Performance: code-splitting, image optimisation (if any).

### Phase 5 – Integration & Packaging (1 day)

1. Vite production build → Flask static folder (or separate container).
2. Update Dockerfile (multi-stage: Node build + Python runtime).
3. Update Compose and docs.
4. Remove old Jinja views and Alpine/Tailwind CDN references.
5. Feature flag or env `UI_ENABLED=true/false` so pure-API deploys stay lean.

## Migration / Compatibility

- Old UI routes can redirect to the SPA for one release.
- Session-based auth can coexist briefly with JWT while the SPA is rolled out.
- No impact on the OIDC provider’s machine-to-machine calls.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Scope creep on UI features | Strict MVP list; ship Users first |
| Bundle size | Tree-shaking, code-splitting, analyse with `rollup-plugin-visualizer` |
| Auth complexity for SPA | Follow Plan 04; use httpOnly refresh tokens |
| Team unfamiliar with React | Document decisions; or choose Vue/Svelte if preferred |

## Success Criteria

- [ ] SPA loads in < 2 s on a typical connection and feels responsive.
- [ ] All current CRUD + audit functionality is available and improved.
- [ ] Lighthouse accessibility score ≥ 90.
- [ ] Works without the old Jinja templates.
- [ ] Docker image still single-container (or clearly documented multi-container).
- [ ] Dark mode and mobile layout ship in the first release.

## Open Questions for Review

1. React, Vue, or Svelte?
2. Embedded in the Python container or separate static site?
3. Any branding / design system constraints from Plainscope?
4. Should the UI support multi-tenancy / domain switching in the first version?
