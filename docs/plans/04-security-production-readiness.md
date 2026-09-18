# Plan 04: Directory Security & Production Readiness

**Status**: Draft for implementation  
**Target component**: Directory API, admin UI, Docker/Compose and secrets  
**Priority**: Critical  
**Estimated effort**: 4–7 days  
**Dependencies**: FastAPI API (Plan 02), embedded React SPA (Plan 03)

## Goals

- Secure Provider-to-Directory service authentication and admin authentication.
- Support JWT validation and mTLS where appropriate without making Directory a token issuer.
- Centralize secret loading and rotation.
- Harden the FastAPI service and embedded SPA for production.
- Keep the Provider as the sole authority for issuing OIDC tokens.

## Non-Goals

- Implementing an OAuth2/OIDC authorization server in Directory.
- Issuing Provider-facing OIDC access/ID tokens from Directory.
- Introducing a second token lifecycle merely for the admin UI.
- Requiring mTLS for every deployment.

## Security Boundary

The Directory is a backing store/resource service. It provides authenticated and authorized access to directory data.

The **Provider service remains the token-issuing authority**. Directory authentication credentials are only for access to Directory resources or its administration surface; they must not be represented as Provider-issued OIDC tokens.

Design caller authentication around actual roles:

1. **Provider-to-Directory** service authentication.
2. **Admin-to-Directory** authentication for the embedded web UI.

JWT validation may be used for callers where appropriate. mTLS is an optional additional service-to-service control.

## Target Authentication Model

### Provider-to-Directory

- Authenticate the Provider as a service principal using a supported service credential.
- Validate JWTs from a configured issuer/JWKS where JWT-based service authentication is selected.
- Optionally require mTLS at the TLS terminator for high-assurance deployments.
- Authorize only Directory operations needed by the Provider.
- Record service identity in audit events.

### Admin UI

- Provide an authenticated Directory administration session/credential for the embedded SPA.
- Keep browser credentials scoped to Directory administration.
- Do not add a Directory login endpoint whose purpose is to issue OIDC tokens for end users.
- Coordinate the exact login/session contract with the FastAPI `/api/v1` API and SPA plans.

### mTLS

- Optional and explicitly configured.
- Support reverse-proxy termination and document certificate verification and identity mapping.
- Do not make mTLS a prerequisite for local/reference deployments.

## Secret Management

Principles:

- Never commit or bake secrets into images.
- Prefer runtime secret injection and file-based/container secret mechanisms.
- Centralize secret lookup through a small abstraction.
- Fail fast when required production secrets are missing.
- Support credential/key rotation without requiring source changes.

Possible production backends include Docker/Kubernetes secrets or an external secret manager. The implementation should keep the application independent of a single vendor.

## Implementation Steps

### Phase 1 – Authentication

1. Add FastAPI authentication dependencies for service and admin callers.
2. Add JWT validation using configured issuer/audience/JWKS or public keys where selected.
3. Add optional mTLS deployment configuration.
4. Define authorization scopes/roles for Provider and admin operations.
5. Add authentication/authorization tests.

### Phase 2 – Secret loading

1. Implement `get_secret(name)` with environment/file-backed loading.
2. Replace direct secret lookups.
3. Document required runtime secrets and rotation.
4. Ensure frontend builds contain no secrets.

### Phase 3 – FastAPI hardening

1. Configure security headers appropriate to the embedded SPA.
2. Rate-limit sensitive administrative/authentication operations.
3. Add structured logs, request IDs and service/admin identity context.
4. Add health/readiness and metrics endpoints without leaking sensitive data.
5. Run the service as non-root with least privilege and a constrained filesystem where practical.

### Phase 4 – Operational security

1. Document trusted-proxy configuration.
2. Document mTLS deployment examples.
3. Add security regression tests for secret leakage and authentication failures.
4. Review Docker/Compose examples for safe defaults.

## Legacy API Interaction

Legacy endpoints are not preserved indefinitely as a security compatibility mechanism.

The Directory may retain legacy authentication/endpoint behavior only while the Provider migration is in progress. Once the Provider is updated and verified against `/api/v1`, legacy endpoints may be removed according to ADR-005.

The Provider migration must be tested before removal; the Directory must not compensate by introducing a separate token issuer.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Token authority becomes ambiguous | Provider remains the only OIDC token issuer; Directory validates/authorizes access |
| Credential leakage | Centralized secret loading plus CI/regression scanning |
| mTLS deployment complexity | Keep optional and document proxy-based deployment |
| Auth migration breaks Provider | Provider integration tests are a release gate |

## Success Criteria

- [ ] Provider and admin callers have explicit authentication/authorization paths.
- [ ] Directory does not issue Provider/OIDC tokens.
- [ ] JWT validation and optional mTLS are covered by tests/documentation where enabled.
- [ ] Production secrets are runtime-provided and absent from source/images/frontend assets.
- [ ] FastAPI security headers, rate limits, logging and readiness controls are implemented.
- [ ] Legacy endpoint removal is gated on verified Provider migration.

## Settled Decisions

- FastAPI: **ADR-001**.
- Embedded React/TypeScript admin UI: **ADR-002/ADR-003**.
- Directory is a backing store; Provider issues tokens: **ADR-004**.
- Legacy API removal follows verified Provider migration: **ADR-005**.

No open question in this plan may reopen those decisions.
