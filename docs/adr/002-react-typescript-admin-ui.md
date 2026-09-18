# ADR-002: Use React and TypeScript for the Admin UI

- **Status:** Accepted
- **Date:** 2026-09-17
- **Decision:** Replace the existing Jinja/Alpine admin UI with a React + TypeScript SPA.

## Context

The current Directory admin UI is server-rendered Jinja with Alpine.js and Tailwind CDN assets. The redesign calls for richer tables, forms, authentication state, operational visibility, accessibility, and reusable UI primitives.

## Decision

Use **React with TypeScript** for the new admin UI. The SPA consumes the versioned Directory API and follows the security and UX requirements in Plans 03–05.

## Consequences

### Positive
- Strong typing across the UI.
- Component-based architecture for the planned admin workflows.
- Mature ecosystem for routing, data fetching, forms, validation, tables, and accessibility.

### Negative
- Adds a frontend build toolchain.
- Requires migration of existing templates and client-side behavior.
- Requires a sufficiently stable API contract.

## Compatibility

The Provider service does not depend on the admin UI. API compatibility remains the primary integration concern; the SPA consumes the same versioned API contract used by supported Provider clients.
