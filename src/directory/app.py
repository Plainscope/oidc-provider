"""
Remote User Directory Service
Provides REST API endpoints for user management and authentication.
"""
import os
import json
from pathlib import Path
from datetime import datetime
from flask import Flask, request, jsonify, abort, render_template
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(name)s] %(levelname)s: %(message)s'
)
logger = logging.getLogger('remote-directory')

app = Flask(__name__, template_folder='views')
app.config['TEMPLATES_AUTO_RELOAD'] = True

# Load users from environment or file
def load_users():
    """Load user data from environment or file."""
    if os.environ.get('USERS'):
        logger.info('[INIT] Loading users from environment variable')
        return json.loads(os.environ['USERS'])
    
    users_file = os.environ.get('USERS_FILE', '/app/config/users.json')
    logger.info(f'[INIT] Loading users from file: {users_file}')
    
    if not Path(users_file).exists():
        logger.error(f'[INIT] Users file not found: {users_file}')
        raise FileNotFoundError(f'Users file not found: {users_file}')
    
    with open(users_file, 'r') as f:
        users = json.load(f)
    
    logger.info(f'[INIT] Loaded {len(users)} users')
    return users

# Load users on startup
try:
    USERS = load_users()
except Exception as e:
    logger.error(f'[INIT] Failed to load users: {str(e)}')
    USERS = []

# Optional bearer token for API security
BEARER_TOKEN = os.environ.get('BEARER_TOKEN')
if BEARER_TOKEN:
    logger.info('[INIT] Bearer token authentication enabled')


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


def exclude_password(user):
    """Remove password field from user object for safe response."""
    return {k: v for k, v in user.items() if k != 'password'}


@app.before_request
def verify_auth():
    """Verify authorization for all requests."""
    # Allow unauthenticated health checks so container health probes work
    if request.path == '/healthz':
        return
    
    # Allow web UI access without authentication
    # Web UI routes: /, /users/<id>
    if request.path in ['/', '/healthz'] or request.path.startswith('/users/'):
        return

    if not check_bearer_token():
        abort(401)


@app.route('/count', methods=['GET'])
def count():
    """
    GET /count
    Returns the total number of users.
    """
    logger.info('[API] GET /count')
    return jsonify(len(USERS))


@app.route('/find/<user_id>', methods=['GET'])
def find(user_id):
    """
    GET /find/<user_id>
    Returns user data by ID.
    """
    logger.info(f'[API] GET /find/{user_id}')
    
    user = next((u for u in USERS if u.get('id') == user_id), None)
    if not user:
        logger.warning(f'[API] User not found: {user_id}')
        abort(404)
    
    logger.info(f'[API] User found: {user_id}')
    return jsonify(exclude_password(user))


@app.route('/validate', methods=['POST'])
def validate():
    """
    POST /validate
    Validates user credentials.
    Expected JSON: {"email": "string", "password": "string"}
    """
    logger.info('[API] POST /validate')
    
    data = request.get_json()
    if not data:
        logger.warning('[API] Missing request body')
        abort(400)
    
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        logger.warning('[API] Missing email or password in request')
        abort(400)
    
    logger.info(f'[API] Validating user: {email}')
    
    user = next(
        (u for u in USERS if u.get('email') == email and u.get('password') == password),
        None
    )
    
    if not user:
        logger.warning(f'[API] Invalid credentials for: {email}')
        abort(401)
    
    logger.info(f'[API] User validated: {email}')
    return jsonify(exclude_password(user))


@app.route('/healthz', methods=['GET'])
def health():
    """
    GET /healthz
    Health check endpoint. Returns JSON by default, HTML if Accept header includes text/html.
    """
    logger.info('[API] GET /healthz')
    health_data = {
        'status': 'ok',
        'users_count': len(USERS)
    }
    
    # Check if client prefers HTML
    if request.accept_mimetypes.best_match(['text/html', 'application/json']) == 'text/html':
        return render_template('health.html', 
                             health=health_data, 
                             bearer_token_enabled=bool(BEARER_TOKEN),
                             current_year=datetime.now().year)
    
    return jsonify(health_data)


# Web UI Routes
@app.route('/', methods=['GET'])
def index():
    """
    GET /
    Web UI: Display list of all users.
    """
    logger.info('[WEB] GET /')
    return render_template('index.html', 
                         users=USERS,
                         current_year=datetime.now().year)


@app.route('/users/<user_id>', methods=['GET'])
def user_detail(user_id):
    """
    GET /users/<user_id>
    Web UI: Display detailed information about a specific user.
    """
    logger.info(f'[WEB] GET /users/{user_id}')
    
    user = next((u for u in USERS if u.get('id') == user_id), None)
    if not user:
        logger.warning(f'[WEB] User not found: {user_id}')
        abort(404)
    
    logger.info(f'[WEB] User found: {user_id}')
    # Exclude password from user data for display
    safe_user = exclude_password(user)
    return render_template('user_detail.html', 
                         user=safe_user,
                         current_year=datetime.now().year)


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
    port = int(os.environ.get('PORT', 8080))
    logger.info(f'[SERVER] Starting Remote Directory on port {port}')
    app.run(host='0.0.0.0', port=port, debug=os.environ.get('DEBUG', 'false').lower() == 'true')
