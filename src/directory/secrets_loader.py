"""
Centralized secret loading for the Directory service (Plan 04 / issue #43).

Lookup order for get_secret(name):
  1. Environment variable ``name``
  2. File pointed to by ``name_FILE`` (Docker/K8s-style secret mounts)
  3. Optional default (development only)

Production (FLASK_ENV/ENV == production) fails fast when required secrets
are missing or match known development defaults. Secrets are never logged.
"""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Optional

logger = logging.getLogger("remote-directory")

# Values that must never be used as production credentials.
# Keep in sync with docs and CI regression checks.
KNOWN_DEVELOPMENT_SECRETS = frozenset(
    {
        "change-me",
        "local-dev-bearer-token",
        "local-dev-secret",
        "local-dev-client-secret",
        "test-client-secret",
        "test-only-ci-key",
        "secret",
        "password",
        "changeme",
    }
)


def is_production() -> bool:
    env = (os.environ.get("FLASK_ENV") or os.environ.get("ENV") or "").lower()
    return env == "production"


def _read_secret_file(path: str) -> Optional[str]:
    try:
        text = Path(path).read_text(encoding="utf-8").strip()
        return text if text else None
    except FileNotFoundError:
        logger.error("[SECRETS] Secret file not found: %s", path)
        return None
    except OSError as e:
        logger.error("[SECRETS] Failed to read secret file %s: %s", path, type(e).__name__)
        return None


def get_secret(
    name: str,
    *,
    default: Optional[str] = None,
    required: bool = False,
) -> Optional[str]:
    """
    Resolve a secret by name.

    Parameters
    ----------
    name:
        Logical secret name (e.g. ``SECRET_KEY``, ``BEARER_TOKEN``).
    default:
        Fallback for non-production only. Ignored when ``is_production()``.
    required:
        If True and the secret cannot be resolved, raise RuntimeError in
        production; in development return default or None.
    """
    value = os.environ.get(name)
    if value is not None and value != "":
        resolved = value
        source = "env"
    else:
        file_var = f"{name}_FILE"
        file_path = os.environ.get(file_var)
        if file_path:
            resolved = _read_secret_file(file_path)
            source = "file"
        else:
            resolved = None
            source = "none"

    if resolved is None:
        if is_production() and (required or default is None):
            raise RuntimeError(
                f"{name} must be provided in production via the environment "
                f"or {name}_FILE (file-based/container secret)."
            )
        if default is not None and not is_production():
            logger.debug("[SECRETS] Using development default for %s", name)
            return default
        if required and not is_production():
            logger.warning("[SECRETS] Required secret %s is unset (development)", name)
        return None

    if is_production() and resolved in KNOWN_DEVELOPMENT_SECRETS:
        raise RuntimeError(
            f"{name} is set to a known development default and is not allowed "
            f"in production. Provide a unique high-entropy value."
        )

    # Never log the secret value — only name and source class.
    logger.debug("[SECRETS] Resolved %s from %s", name, source)
    return resolved


def require_secret(name: str) -> str:
    """Resolve a secret that must always be present (production and CI)."""
    value = get_secret(name, required=True)
    if not value:
        raise RuntimeError(f"{name} is required but was not resolved")
    return value
