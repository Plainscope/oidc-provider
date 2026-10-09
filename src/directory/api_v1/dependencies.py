"""Authentication dependencies for Provider and administrative API callers."""
from __future__ import annotations

import hmac
import os
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from secrets_loader import get_secret, is_production

_bearer = HTTPBearer(auto_error=False, scheme_name="DirectoryBearerAuth")


def _configured_secret(name: str) -> str | None:
    value = get_secret(name)
    if value:
        return value
    if is_production():
        return None
    # Preserve the documented local compose default without ever using it in production.
    return {"BEARER_TOKEN": "local-dev-bearer-token"}.get(name)


async def require_provider_auth(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> None:
    """Require the configured Provider-to-Directory bearer token."""
    expected = _configured_secret("BEARER_TOKEN")
    if not expected or credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized", headers={"WWW-Authenticate": "Bearer"})
    if not hmac.compare_digest(credentials.credentials, expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized", headers={"WWW-Authenticate": "Bearer"})


async def require_admin_auth(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> None:
    """Require an explicit admin API token; do not trust client-supplied role headers."""
    expected = _configured_secret("ADMIN_API_TOKEN")
    if expected and credentials and hmac.compare_digest(credentials.credentials, expected):
        return
    # Admin UI sessions can be integrated here without weakening machine auth.
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized", headers={"WWW-Authenticate": "Bearer"})
