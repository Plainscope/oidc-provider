# ADR-003: Embed the Admin SPA in the Directory Service

- **Status:** Accepted
- **Date:** 2026-09-17
- **Decision:** Build the React SPA into the Directory service's deployable artifact and serve it from the Directory service.

## Context

The Directory service should remain straightforward to deploy and operate. A separate frontend hosting tier would add infrastructure before it is needed.

## Decision

Use an **embedded SPA deployment** initially:
1. Build the React/TypeScript application with Vite.
2. Produce static assets as part of the Directory build.
3. Package those assets with the Directory service.
4. Serve the SPA alongside the versioned API.

Keep static hosting concerns sufficiently isolated that assets can move to a dedicated static host later without changing the API contract.

## Consequences

### Positive
- Single deployable service.
- No cross-origin frontend/API requirement for the default deployment.
- Simpler local development and reference deployment.
- Easier rollout and rollback.

### Negative
- The Directory service serves both API and static assets.
- Static assets cannot be scaled independently initially.
- Build and runtime packaging become coupled.

## Security

Production builds must not contain secrets. CDN runtime dependencies should be removed; required frontend dependencies are bundled into the deployable artifact. Security headers such as CSP must account for the embedded asset model.
