"""
Provider-to-Directory service authentication (issue #52).

Supports:
  1. Static Bearer (BEARER_TOKEN / BEARER_TOKEN_FILE) — migration path
  2. JWT validation when SERVICE_JWT_* is configured

Directory does not issue tokens (ADR-004); it only validates credentials
presented by the Provider (or other service callers).
"""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Any, Optional

import hmac

logger = logging.getLogger("remote-directory")


@dataclass
class ServiceIdentity:
    """Authenticated service principal for Directory resource access."""

    actor: str
    role: str = "service"
    method: str = "bearer"  # bearer | jwt
    claims: Optional[dict[str, Any]] = None


def _looks_like_jwt(token: str) -> bool:
    parts = token.split(".")
    return len(parts) == 3 and all(parts)


def validate_static_bearer(token: str, expected: Optional[str]) -> Optional[ServiceIdentity]:
    if not expected:
        return None
    if not hmac.compare_digest(token, expected):
        return None
    return ServiceIdentity(actor="provider-service", method="bearer")


def _load_jwt_config() -> dict[str, Optional[str]]:
    return {
        "issuer": os.environ.get("SERVICE_JWT_ISSUER"),
        "audience": os.environ.get("SERVICE_JWT_AUDIENCE"),
        "jwks_url": os.environ.get("SERVICE_JWT_JWKS_URL"),
        "public_key": os.environ.get("SERVICE_JWT_PUBLIC_KEY"),
        "public_key_file": os.environ.get("SERVICE_JWT_PUBLIC_KEY_FILE"),
        "algorithms": os.environ.get("SERVICE_JWT_ALGORITHMS", "RS256"),
    }


def jwt_auth_configured() -> bool:
    cfg = _load_jwt_config()
    return bool(cfg["issuer"] and cfg["audience"] and (cfg["jwks_url"] or cfg["public_key"] or cfg["public_key_file"]))


def _read_public_key(cfg: dict[str, Optional[str]]) -> Optional[str]:
    if cfg.get("public_key"):
        return cfg["public_key"].replace("\\n", "\n")
    path = cfg.get("public_key_file")
    if path:
        from pathlib import Path
        return Path(path).read_text(encoding="utf-8")
    return None


def validate_service_jwt(token: str) -> Optional[ServiceIdentity]:
    """
    Validate a service JWT. Returns ServiceIdentity or None on failure.

    Required env when enabled:
      SERVICE_JWT_ISSUER, SERVICE_JWT_AUDIENCE,
      and one of SERVICE_JWT_JWKS_URL | SERVICE_JWT_PUBLIC_KEY | SERVICE_JWT_PUBLIC_KEY_FILE
    """
    if not jwt_auth_configured():
        return None

    try:
        import jwt
        from jwt import PyJWKClient
    except ImportError:
        logger.error("[AUTH] PyJWT not installed; cannot validate service JWT")
        return None

    cfg = _load_jwt_config()
    algorithms = [a.strip() for a in (cfg["algorithms"] or "RS256").split(",") if a.strip()]

    try:
        if cfg["jwks_url"]:
            jwks_client = PyJWKClient(cfg["jwks_url"], cache_keys=True)
            signing_key = jwks_client.get_signing_key_from_jwt(token).key
        else:
            signing_key = _read_public_key(cfg)
            if not signing_key:
                logger.warning("[AUTH] SERVICE_JWT public key not available")
                return None

        claims = jwt.decode(
            token,
            signing_key,
            algorithms=algorithms,
            issuer=cfg["issuer"],
            audience=cfg["audience"],
            options={
                "require": ["exp", "iat", "iss", "aud"],
            },
        )
    except Exception as e:
        # Do not log token material; exception type/message only.
        logger.warning("[AUTH] Service JWT rejected: %s", type(e).__name__)
        return None

    actor = (
        claims.get("sub")
        or claims.get("client_id")
        or claims.get("azp")
        or "provider-service"
    )
    return ServiceIdentity(actor=str(actor), method="jwt", claims=dict(claims))


def authenticate_service_token(
    token: str,
    static_bearer: Optional[str],
) -> Optional[ServiceIdentity]:
    """
    Authenticate a Bearer token as either JWT (if configured and token looks
    like a JWT) or static service Bearer.
    """
    if not token:
        return None

    if jwt_auth_configured() and _looks_like_jwt(token):
        identity = validate_service_jwt(token)
        if identity:
            return identity
        # Fall through: allow static bearer for migration if JWT fails? Prefer fail closed for JWT-shaped tokens.
        return None

    return validate_static_bearer(token, static_bearer)
