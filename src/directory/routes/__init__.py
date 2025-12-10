"""Routes initialization."""
from flask import Blueprint

# Create blueprints for each entity
domains_bp = Blueprint('domains', __name__, url_prefix='/api/domains')
users_bp = Blueprint('users', __name__, url_prefix='/api/users')
roles_bp = Blueprint('roles', __name__, url_prefix='/api/roles')
groups_bp = Blueprint('groups', __name__, url_prefix='/api/groups')
audit_bp = Blueprint('audit', __name__, url_prefix='/api/audit')
legacy_bp = Blueprint('legacy', __name__)
ui_bp = Blueprint('ui', __name__)

# Import route registration functions
from .domains import register_domain_routes
from .users import register_user_routes
from .roles import register_role_routes
from .groups import register_group_routes
from .audit import register_audit_routes
from .legacy import register_legacy_routes
from .ui import register_ui_routes

__all__ = [
    'domains_bp',
    'users_bp',
    'roles_bp',
    'groups_bp',
    'audit_bp',
    'legacy_bp',
    'ui_bp',
    'register_domain_routes',
    'register_user_routes',
    'register_role_routes',
    'register_group_routes',
    'register_audit_routes',
    'register_legacy_routes',
    'register_ui_routes',
]
