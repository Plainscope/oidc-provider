"""
Remote User Directory Service
Provides REST API endpoints for user management and authentication.
Supports SQLite-based persistence with relational entities.
"""
import os
import hmac
import logging
import secrets
from datetime import timedelta
from urllib.parse import quote
from flask import Flask, request, abort, jsonify, render_template, redirect, url_for, session
from flask_session import Session

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(name)s] %(levelname)s: %(message)s'
)
logger = logging.getLogger('remote-directory')

# Import database
from db_init import init_database

# Import blueprints
from routes import (
    domains_bp, users_bp, roles_bp, groups_bp, property_keys_bp, audit_bp, legacy_bp, ui_bp,
    register_domain_routes, register_user_routes, register_role_routes,
    register_group_routes, register_property_key_routes, register_audit_routes, register_legacy_routes,
    register_ui_routes
)

app = Flask(__name__, template_folder='views')

# Secret key via centralized loader (env or SECRET_KEY_FILE)
from secrets_loader import get_secret, is_production, KNOWN_DEVELOPMENT_SECRETS

_secret_key = get_secret('SECRET_KEY')
if not _secret_key:
    if is_production():
        raise RuntimeError('SECRET_KEY must be set to a strong random value in production (or SECRET_KEY_FILE)')
    _secret_key = secrets.token_hex(32)
    logger.warning('[INIT] SECRET_KEY not configured; generated ephemeral key for development only')
app.config['SECRET_KEY'] = _secret_key

# Limit request payloads to prevent memory-exhaustion DoS
app.config['MAX_CONTENT_LENGTH'] = int(os.environ.get('MAX_CONTENT_LENGTH', str(1 * 1024 * 1024)))

# Configure Flask-Session for server-side session management
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_COOKIE_SECURE'] = os.environ.get('SESSION_COOKIE_SECURE', 'true').lower() == 'true'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=24)
Session(app)

# Rate limiting for auth-sensitive endpoints (brute-force mitigation)
try:
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address
    limiter = Limiter(
        get_remote_address,
        app=app,
        default_limits=['200 per minute'],
    )
except Exception as e:
    limiter = None
    logger.warning(f'[INIT] Flask-Limiter not configured: {e}')

# Initialize database on startup
def init_app():
    """Initialize application."""
    logger.info('[INIT] Initializing application')
    
    # Initialize database schema and seed data
    try:
        # Ensure we have an application context when touching the DB
        with app.app_context():
            init_database()
    except Exception as e:
        logger.error(f'[INIT] Database initialization failed: {e}')
        raise
    
    logger.info('[INIT] Application initialized successfully')


# Provider-to-Directory service credential (static Bearer during migration).
# Loaded via secrets_loader so production can use BEARER_TOKEN_FILE mounts.
# This is a Directory resource credential — Directory does NOT issue OIDC tokens (ADR-004).
BEARER_TOKEN = get_secret('BEARER_TOKEN')
app.config['BEARER_TOKEN'] = BEARER_TOKEN
if BEARER_TOKEN:
    logger.info('[INIT] Provider-to-Directory Bearer authentication enabled')
elif is_production():
    logger.warning('[INIT] BEARER_TOKEN unset in production; API endpoints will reject unauthenticated callers only if a token is later required')

# CSRF protection
try:
    from flask_wtf.csrf import CSRFProtect
    app.config['WTF_CSRF_SSL_STRICT'] = os.environ.get('SESSION_COOKIE_SECURE', 'true').lower() == 'true'
    csrf = CSRFProtect(app)
    # Exempt API blueprints (authenticated via bearer tokens, not cookies)
    csrf.exempt(domains_bp)
    csrf.exempt(users_bp)
    csrf.exempt(roles_bp)
    csrf.exempt(groups_bp)
    csrf.exempt(property_keys_bp)
    csrf.exempt(audit_bp)
    csrf.exempt(legacy_bp)
    # NOTE: ui_bp is intentionally NOT exempt: browser session endpoints require CSRF tokens
except Exception as e:
    logger.warning(f'[INIT] CSRFProtect not configured: {e}')


def check_bearer_token():
    """Verify Provider-to-Directory Bearer credential (constant-time compare)."""
    if not BEARER_TOKEN:
        # No service credential configured: allow (dev) but mark as anonymous service.
        return True

    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        logger.warning('[AUTH] Missing or invalid Bearer token')
        return False

    token = auth_header[7:]  # Remove 'Bearer ' prefix
    if not hmac.compare_digest(token, BEARER_TOKEN):
        logger.warning('[AUTH] Invalid Bearer token provided')
        return False

    return True


@app.before_request
def assign_request_id():
    """Attach a correlation / request ID for structured logs and audit."""
    from flask import g
    incoming = request.headers.get('X-Request-ID') or request.headers.get('X-Correlation-ID')
    g.request_id = incoming if incoming else secrets.token_hex(8)


@app.before_request
def verify_auth():
    """Verify authorization and record caller role on flask.g.

    Boundaries (ADR-004 / Plan 04):
      - Provider-to-Directory: static Bearer (service principal) on /api/* and legacy API paths.
      - Admin-to-Directory: browser session on UI routes (not an OIDC token issuer).
    Directory never issues Provider/OIDC tokens.
    """
    from flask import g

    g.auth_context = {
        'role': 'anonymous',
        'actor': None,
        'request_id': getattr(g, 'request_id', None),
    }

    # Allow unauthenticated health checks, logout, and static assets
    if request.path in ['/', '/login', '/logout', '/healthz', '/favicon.ico']:
        return

    if any(request.path.startswith(p) for p in ['/static/', '/favicon']):
        return

    # API requests require bearer token (includes /api/* and legacy
    # /count, /validate, /find/* which expose user data and auth oracles)
    if request.path.startswith('/api/') or request.path in ['/count', '/validate'] or request.path.startswith('/find/'):
        if not check_bearer_token():
            abort(401)
        g.auth_context = {
            'role': 'service',
            'actor': 'provider-service',
            'request_id': getattr(g, 'request_id', None),
        }
        return

    # UI routes require valid session (admin authentication surface)
    if not session.get('authenticated'):
        return redirect(url_for('ui.ui_login') + '?redirectTo=' + quote(request.full_path))

    g.auth_context = {
        'role': 'admin',
        'actor': session.get('username') or session.get('user') or 'admin',
        'request_id': getattr(g, 'request_id', None),
    }



# ============================================================================
# Database Connection Management
# ============================================================================
# Each request gets its own database connection from Flask's g object.
# This ensures thread safety and prevents race conditions.

from database import close_db

@app.teardown_appcontext
def teardown_db(exception):
    """Close per-request database connection."""
    close_db(exception)


@app.after_request
def set_security_headers(response):
    """Add baseline security headers and correlation ID to all responses."""
    from flask import g
    request_id = getattr(g, 'request_id', None)
    if request_id:
        response.headers['X-Request-ID'] = request_id

    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=(), payment=()'
    # HSTS only when the deployment is production and cookies are marked secure
    # (implies TLS termination). Trusted proxies must set X-Forwarded-Proto.
    if is_production() and app.config.get('SESSION_COOKIE_SECURE'):
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'

    # CSP mirrors the provider service, plus the two CDN hosts the UI
    # requires: Tailwind (styling) and Alpine.js (all page interactivity
    # and API calls). Server-rendered templates rely on inline scripts,
    # and Alpine.js compiles x-data/x-show expressions via new Function(),
    # so 'unsafe-inline' AND 'unsafe-eval' are both required for the UI to
    # function. object-src/base-uri stay locked down; sensitive actions
    # additionally require bearer auth and CSRF tokens.
    # TODO: vendor Alpine.js/Tailwind locally to drop the CDN allowlist
    # (Alpine's CSP build could then drop 'unsafe-eval' too).
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' "
        "https://cdn.tailwindcss.com https://cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; "
        "font-src 'self' data:; object-src 'none'; base-uri 'self'"
    )
    return response


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

# Register property key routes
register_property_key_routes(property_keys_bp)
app.register_blueprint(property_keys_bp)

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

def is_html_request():
    """Check if the request expects HTML response."""
    return 'text/html' in request.headers.get('Accept', '')

@app.errorhandler(400)
def bad_request(error):
    """Handle 400 Bad Request errors."""
    if is_html_request():
        return render_template('error.html', 
            error_code=400, 
            error_title='Bad Request',
            error_message='The request could not be understood by the server.',
            error_details=str(error)), 400
    return jsonify({'error': 'Bad request'}), 400


@app.errorhandler(401)
def unauthorized(error):
    """Handle 401 Unauthorized errors."""
    if is_html_request():
        return render_template('error.html',
            error_code=401,
            error_title='Unauthorized',
            error_message='You are not authorized to access this resource. Please log in.',
            error_details='Invalid or missing authentication token'), 401
    return jsonify({'error': 'Unauthorized'}), 401


@app.errorhandler(403)
def forbidden(error):
    """Handle 403 Forbidden errors."""
    if is_html_request():
        return render_template('error.html',
            error_code=403,
            error_title='Forbidden',
            error_message='You do not have permission to access this resource.',
            error_details='Your account does not have the required permissions'), 403
    return jsonify({'error': 'Forbidden'}), 403


@app.errorhandler(404)
def not_found(error):
    """Handle 404 Not Found errors."""
    if is_html_request():
        return render_template('error.html',
            error_code=404,
            error_title='Page Not Found',
            error_message='The page you are looking for does not exist.',
            error_details=f'Path: {request.path}'), 404
    return jsonify({'error': 'Not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 Internal Server Error."""
    logger.error(f'[ERROR] Internal server error: {str(error)}')
    if is_html_request():
        return render_template('error.html',
            error_code=500,
            error_title='Internal Server Error',
            error_message='An unexpected error occurred. Please try again later.',
            error_details='An internal server error has been logged and will be investigated'), 500
    return jsonify({'error': 'Internal server error'}), 500


# Initialize application
init_app()


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    debug_enabled = os.environ.get('DEBUG', 'false').lower() == 'true'
    if debug_enabled and (os.environ.get('FLASK_ENV') == 'production' or os.environ.get('ENV') == 'production'):
        raise RuntimeError('DEBUG must never be enabled in production')
    logger.info(f'[SERVER] Starting Simple Directory on port {port}')
    # NOTE: Flask dev server is for local development only; production uses gunicorn (see Dockerfile CMD)
    app.run(host='0.0.0.0', port=port, debug=debug_enabled)
