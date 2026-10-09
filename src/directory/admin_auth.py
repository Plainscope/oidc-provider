"""
Admin authentication helpers for the Directory UI (issue #53).

Admin credentials are scoped to Directory administration only and must not be
confused with Provider-issued OIDC tokens (ADR-004).

Credential resolution:
  1. DIRECTORY_ADMIN_TOKEN / DIRECTORY_ADMIN_TOKEN_FILE (preferred)
  2. Fallback to BEARER_TOKEN during migration (documented)

Session stores authentication flags and actor name only — not the raw token.
"""
from __future__ import annotations

import hmac
import logging
from typing import Optional

from secrets_loader import get_secret

logger = logging.getLogger("remote-directory")


def get_admin_token() -> Optional[str]:
    """Preferred admin credential, with Bearer fallback for migration."""
    admin = get_secret("DIRECTORY_ADMIN_TOKEN")
    if admin:
        return admin
    # Migration: same static token used for service and admin UI login
    return get_secret("BEARER_TOKEN")


def validate_admin_token(presented: str) -> bool:
    expected = get_admin_token()
    if not expected:
        logger.warning("[AUTH] No DIRECTORY_ADMIN_TOKEN or BEARER_TOKEN configured")
        return False
    if not presented:
        return False
    return hmac.compare_digest(presented.strip(), expected)


def admin_session_payload(actor: str = "admin") -> dict:
    """Server-side session fields after successful admin login (no raw token)."""
    return {
        "authenticated": True,
        "role": "admin",
        "username": actor,
        "actor": actor,
    }
