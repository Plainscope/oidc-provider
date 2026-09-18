# ADR-004: Directory Is a Backing Store, Not a Token Issuer

- **Status:** Accepted
- **Date:** 2026-09-17
- **Decision:** The Directory service stores and serves identity/directory data for the Provider service; the Provider service remains responsible for issuing tokens.

## Context

The Directory service supports the OIDC Provider but is not itself the token issuer. The earlier security plan considered Directory-issued login/session tokens.

## Decision

The **Provider service is the token-issuing authority**.

The Directory service should:
- provide authenticated and authorized access to directory data;
- expose APIs intended for Provider-to-Directory integration;
- avoid becoming an independent OIDC/token issuer;
- not introduce a competing token lifecycle merely to support the admin UI.

Authentication for Directory API callers should be designed around actual caller roles: Provider-to-Directory service authentication and admin authentication for the web UI. External JWT validation may be used where appropriate.

Admin session mechanisms are scoped to the Directory administration surface and must not imply that the Directory issues OIDC tokens for end users.

## Consequences

### Positive
- Clear security boundary and ownership of token issuance.
- Avoids duplicate token authority and token lifecycle complexity.
- Keeps the Directory focused on identity data and administration.

### Negative
- The Directory API still needs robust service authentication and authorization.
- Admin UI authentication must be designed separately from Provider token issuance.
- Plan 04 must be revised to remove assumptions that the Directory should issue provider-facing access tokens.

## Compatibility

The Provider remains the consumer of Directory APIs and the issuer of tokens. API redesign work must preserve required directory operations and include Provider integration/contract tests before migration.
