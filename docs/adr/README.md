# Architecture Decision Records

Architecture decisions for the Directory redesign are recorded separately from implementation plans.

| ADR | Decision | Status |
|---|---|---|
| [001](./001-fastapi-for-directory-api.md) | Use FastAPI for the Directory API | Accepted |
| [002](./002-react-typescript-admin-ui.md) | Use React + TypeScript for the Admin UI | Accepted |
| [003](./003-embedded-spa-deployment.md) | Embed the Admin SPA in the Directory service | Accepted |
| [004](./004-directory-is-backing-store.md) | Directory is a backing store; Provider issues tokens | Accepted |
| [005](./005-immediate-legacy-api-deprecation.md) | Deprecate legacy API after Provider migration | Accepted |

These ADRs are the source of truth for the decisions they cover. Implementation plans should be updated to reflect them and should not reopen these choices unless a new ADR supersedes the existing decision.
