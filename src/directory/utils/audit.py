"""Audit metadata helpers for Directory mutations."""
from flask import g, request


def get_audit_metadata():
    """Return metadata supported by the current AuditLog model.

    The model accepts performed_by, ip_address, and user_agent. Keep this
    adapter aligned with that contract so an audit write cannot turn an
    otherwise successful mutation into an HTTP 500.
    """
    auth = getattr(g, "auth_context", None) or {}
    return {
        "performed_by": auth.get("actor") or auth.get("username"),
        "ip_address": request.remote_addr,
        "user_agent": request.headers.get("User-Agent", ""),
    }
