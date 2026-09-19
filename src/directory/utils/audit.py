"""Audit metadata helpers for Directory mutations."""
from flask import g, request


def get_audit_metadata():
    """Collect audit metadata from the current request and auth context.

    Includes actor/role/request_id when available so audit views can show
    who performed an action without leaking secret material.
    """
    auth = getattr(g, "auth_context", None) or {}
    return {
        "ip_address": request.remote_addr,
        "user_agent": request.headers.get("User-Agent", ""),
        "actor": auth.get("actor"),
        "role": auth.get("role"),
        "request_id": auth.get("request_id") or getattr(g, "request_id", None),
    }
