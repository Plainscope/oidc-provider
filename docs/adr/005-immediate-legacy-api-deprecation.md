# ADR-005: Deprecate Legacy API Endpoints with Provider Migration

- **Status:** Accepted
- **Date:** 2026-09-17
- **Decision:** Legacy Directory API endpoints may be removed immediately once the Provider has been updated and verified against the new API.

## Context

The API redesign proposes versioned `/api/v1` resources while the existing Directory API contains legacy endpoints such as `/count`, `/find/:id`, and `/validate`. A long compatibility window is not required if the supported consumer is migrated together with the Directory.

## Decision

There is **no mandatory long-term compatibility period** for the legacy API.

Migration must:
1. Define and implement the new `/api/v1` contract.
2. Update the Provider service to consume the new API.
3. Add integration/contract tests covering Provider-to-Directory interactions.
4. Verify the Provider against the new Directory implementation.
5. Remove legacy endpoints only after the Provider migration is complete.

The Provider update is part of the compatibility plan, not an optional follow-up.

The new API must preserve the logical semantics needed by the Provider even when endpoint paths, payload shapes, pagination, or error formats change.

## Consequences

### Positive
- No need to maintain duplicate legacy API implementations.
- Faster removal of obsolete API surface.
- Clear versioned contract going forward.

### Negative
- Directory and Provider releases are coupled during migration.
- A broken Provider migration can block legacy endpoint removal.
- Integration tests become a release gate.

## Acceptance Criteria

Legacy endpoints must not be removed until:
- the Provider has no remaining production dependency on them;
- Provider integration tests pass against the new API;
- required Directory operations have equivalent documented `/api/v1` behavior;
- deployment/rollback documentation identifies a safe recovery path.

If independent rollback of Directory and Provider is required later, a temporary compatibility adapter may be introduced deliberately rather than retaining legacy endpoints by default.
