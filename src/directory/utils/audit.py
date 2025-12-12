from flask import request

def get_audit_metadata():
    """Collect audit metadata from the current request."""
    return {
        'ip_address': request.remote_addr,
        'user_agent': request.headers.get('User-Agent', '')
    }
