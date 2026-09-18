# Directory Service Redesign Plans

This directory contains detailed implementation plans for the redesign of the `src/directory` remote user directory service.

These plans are submitted for review before any implementation work begins.

## Plans

| # | Plan | Status | Est. Effort | Priority |
|---|------|--------|-------------|----------|
| 01 | [PostgreSQL Support](./01-postgres-support.md) | Draft | 3–5 days | High |
| 02 | [API Redesign (OpenAPI, versioning, pagination, errors)](./02-api-redesign.md) | Draft | 4–6 days | High |
| 03 | [Modern SPA UI](./03-ui-spa-redesign.md) | Draft | 6–10 days | Medium-High |
| 04 | [Security & Production Readiness](./04-security-production-readiness.md) | Draft | 4–7 days | Critical |

## Suggested Order of Execution

1. **Plan 04 (Security)** and **Plan 01 (Postgres)** can start in parallel – they have limited overlap.
2. **Plan 02 (API)** should follow or run alongside Plan 01 so the new API can target the improved data layer.
3. **Plan 03 (UI)** depends on a stable `/api/v1` contract and preferably JWT auth from Plan 04.

## Review Checklist

Please review each plan for:

- [ ] Technical approach and technology choices
- [ ] Scope (goals vs non-goals)
- [ ] Backward-compatibility strategy
- [ ] Open questions that need decisions
- [ ] Effort estimates and risks

Feedback can be left as PR comments or by updating the plans on this branch.

## Next Steps After Approval

1. Resolve open questions in each plan.
2. Create implementation branches / issues per plan.
3. Execute in the order above, with CI and documentation updates in every PR.
