"""
Remote User Directory Service
Provides REST API endpoints for user management and authentication.
Supports SQLite-based persistence with relational entities.
"""
import os
import logging
from flask import Flask, request, abort, jsonify

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(name)s] %(levelname)s: %(message)s'
)
logger = logging.getLogger('remote-directory')

# Import database
from database import get_db, close_db
from db_init import init_database

# Import blueprints
from routes import (
    domains_bp, users_bp, roles_bp, groups_bp, audit_bp, legacy_bp, ui_bp,
    register_domain_routes, register_user_routes, register_role_routes,
    register_group_routes, register_audit_routes, register_legacy_routes,
    register_ui_routes
)

app = Flask(__name__, template_folder='views')

# Initialize database on startup
def init_app():
    """Initialize application."""
    logger.info('[INIT] Initializing application')
    
    # Initialize database schema and seed data
    init_database()
    
    logger.info('[INIT] Application initialized successfully')


# Optional bearer token for API security
BEARER_TOKEN = os.environ.get('BEARER_TOKEN')
if BEARER_TOKEN:
    logger.info('[INIT] Bearer token authentication enabled')

# CSRF protection
try:
    from flask_wtf.csrf import CSRFProtect
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'change-me')
    csrf = CSRFProtect(app)
    # Exempt API blueprints
    csrf.exempt(domains_bp)
    csrf.exempt(users_bp)
    csrf.exempt(roles_bp)
    csrf.exempt(groups_bp)
    csrf.exempt(audit_bp)
    csrf.exempt(legacy_bp)
except Exception as e:
    logger.warning(f'[INIT] CSRFProtect not configured: {e}')


def check_bearer_token():
    """Verify bearer token in Authorization header."""
    if not BEARER_TOKEN:
        return True
    
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        logger.warning('[AUTH] Missing or invalid Bearer token')
        return False
    
    token = auth_header[7:]  # Remove 'Bearer ' prefix
    if token != BEARER_TOKEN:
        logger.warning('[AUTH] Invalid Bearer token provided')
        return False
    
    return True


@app.before_request
def verify_auth():
    """Verify authorization for all requests."""
    # Allow unauthenticated health checks, UI, and legacy endpoints
    public_paths = ['/healthz', '/', '/ui', '/count', '/find', '/validate']
    if request.path == '/' or request.path == '/ui' or request.path == '/healthz':
        return
    
    if any(request.path.startswith(p) for p in ['/static/', '/ui/']):
        return
    
    if request.path in ['/count', '/validate'] or request.path.startswith('/find/'):
        return
    
    if not check_bearer_token():
        abort(401)


@app.teardown_appcontext
def close_connection(exception):
    """Close database connection on app context teardown."""
    pass  # Connection is managed by the models layer

# ============================================================================
# Register Blueprints with Routes
# ============================================================================

# Register domain routes
register_domain_routes(domains_bp)
app.register_blueprint(domains_bp)

# Register user routes
register_user_routes(users_bp)
app.register_blueprint(users_bp)

# Register role routes
register_role_routes(roles_bp)
app.register_blueprint(roles_bp)

# Register group routes
register_group_routes(groups_bp)
app.register_blueprint(groups_bp)

# Register audit routes
register_audit_routes(audit_bp)
app.register_blueprint(audit_bp)

# Register legacy routes for backward compatibility
register_legacy_routes(legacy_bp)
app.register_blueprint(legacy_bp)

# Register UI routes
register_ui_routes(ui_bp)
app.register_blueprint(ui_bp)


# ============================================================================
# Error Handlers
# ============================================================================

@app.errorhandler(400)
def bad_request(error):
    """Handle 400 Bad Request errors."""
    return jsonify({'error': 'Bad request'}), 400


@app.errorhandler(401)
def unauthorized(error):
    """Handle 401 Unauthorized errors."""
    return jsonify({'error': 'Unauthorized'}), 401


@app.errorhandler(404)
def not_found(error):
    """Handle 404 Not Found errors."""
    return jsonify({'error': 'Not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 Internal Server Error."""
    logger.error(f'[ERROR] Internal server error: {str(error)}')
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    # Initialize application
    init_app()
    
    port = int(os.environ.get('PORT', 8080))
    logger.info(f'[SERVER] Starting Remote Directory on port {port}')
    app.run(host='0.0.0.0', port=port, debug=os.environ.get('DEBUG', 'false').lower() == 'true')
