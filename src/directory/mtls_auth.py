"""
Optional mTLS client identity mapping (issue #54).

Typically terminated at a reverse proxy. When MTLS_REQUIRED=true, Directory
requires a verified-client signal via configured request headers and maps
certificate identity into the auth context.

Does not replace Bearer/JWT authorization — it is an additional control.
"""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Mapping, Optional

logger = logging.getLogger("remote-directory")


@dataclass
class MtlsIdentity:
    verified: bool
    subject: Optional[str] = None
    source_header: Optional[str] = None


def mtls_required() -> bool:
    return os.environ.get("MTLS_REQUIRED", "false").lower() in ("1", "true", "yes")


def _truthy(value: Optional[str]) -> bool:
    if value is None:
        return False
    return value.strip().lower() in ("1", "true", "yes", "success", "ok", "verified")


def extract_mtls_identity(headers: Mapping[str, str]) -> MtlsIdentity:
    """
    Read proxy-injected mTLS headers.

    Env:
      MTLS_VERIFY_HEADER  default: X-SSL-Client-Verify  (SUCCESS / NONE / FAILED)
      MTLS_SUBJECT_HEADER default: X-SSL-Client-S-DN   (certificate subject DN)
    """
    verify_header = os.environ.get("MTLS_VERIFY_HEADER", "X-SSL-Client-Verify")
    subject_header = os.environ.get("MTLS_SUBJECT_HEADER", "X-SSL-Client-S-DN")

    def get_header(name: str) -> Optional[str]:
        if name in headers:
            return headers[name]
        lower = {k.lower(): v for k, v in headers.items()}
        return lower.get(name.lower())

    verify_val = get_header(verify_header)
    subject_val = get_header(subject_header)

    verified = _truthy(verify_val)
    return MtlsIdentity(
        verified=verified,
        subject=subject_val.strip() if subject_val else None,
        source_header=verify_header if verify_val is not None else None,
    )


def enforce_mtls(headers: Mapping[str, str]) -> Optional[MtlsIdentity]:
    """
    If MTLS_REQUIRED, return identity when verified else None (caller should 401).
    If not required, return identity when present, else a non-verified placeholder.
    """
    identity = extract_mtls_identity(headers)
    if mtls_required() and not identity.verified:
        logger.warning("[AUTH] mTLS required but client certificate not verified")
        return None
    return identity
