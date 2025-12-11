"""
Remote User Directory Service
Provides REST API endpoints for user management and authentication.
"""
import os
import json
import uuid
from pathlib import Path
from datetime import datetime
from flask import Flask, request, jsonify, abort, render_template, redirect, url_for
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

# Initialize other data structures
DOMAINS = []
GROUPS = []
ROLES = []

# Load additional data from file if it exists
def load_data():
    """
    Load all data from JSON file.

    Loads users, domains, groups, and roles from the file specified by the DATA_FILE
    environment variable (default: /app/config/data.json). If the file exists, the global
    USERS variable (potentially loaded from USERS_FILE) will be overwritten with the users
    from DATA_FILE. DOMAINS, GROUPS, and ROLES are also overwritten with data from the file,
    or set to empty lists if not present.

    If DATA_FILE does not exist, the existing USERS are preserved and the other collections
    (DOMAINS, GROUPS, ROLES) are initialized as empty lists.

    Errors during loading are logged but do not raise exceptions.
    """
    global USERS, DOMAINS, GROUPS, ROLES
    
    data_file = os.environ.get('DATA_FILE', '/app/config/data.json')
    
    if Path(data_file).exists():
        logger.info(f'[INIT] Loading data from file: {data_file}')
        try:
            with open(data_file, 'r') as f:
                data = json.load(f)
                USERS = data.get('users', USERS)
                DOMAINS = data.get('domains', [])
                GROUPS = data.get('groups', [])
                ROLES = data.get('roles', [])
                logger.info(f'[INIT] Loaded {len(USERS)} users, {len(DOMAINS)} domains, {len(GROUPS)} groups, {len(ROLES)} roles')
        except Exception as e:
            logger.error(f'[INIT] Failed to load data: {str(e)}')
    else:
        logger.info('[INIT] No data file found, using defaults')

def save_data():
    """Save all data to JSON file."""
    data_file = os.environ.get('DATA_FILE', '/app/config/data.json')
    
    try:
        # Create directory if it doesn't exist
        Path(data_file).parent.mkdir(parents=True, exist_ok=True)
        
        data = {
            'users': USERS,
            'domains': DOMAINS,
            'groups': GROUPS,
            'roles': ROLES
        }
        
        with open(data_file, 'w') as f:
            json.dump(data, f, indent=2)
        
        logger.info(f'[DATA] Saved data to {data_file}')
        return True
    except Exception as e:
        logger.error(f'[DATA] Failed to save data: {str(e)}')
        return False

# Try to load extended data
load_data()

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
    # Allow unauthenticated access to health checks (for container probes)
    web_ui_paths = ['/', '/healthz', '/domains', '/groups', '/roles']
    
    # Allow unauthenticated access to web UI paths ONLY for safe methods (GET, HEAD, OPTIONS)
    if (
        request.method in ('GET', 'HEAD', 'OPTIONS') and (
            request.path in web_ui_paths or
            request.path.startswith('/users/') or
            request.path.startswith('/domains/') or
            request.path.startswith('/groups/') or
            request.path.startswith('/roles/')
        )
    ):
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
def get_user(user_id):
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


# User CRUD Routes
@app.route('/users/new', methods=['GET'])
def new_user():
    """GET /users/new - Display form to create a new user."""
    return render_template('user_form.html', user=None, current_year=datetime.now().year)


@app.route('/users', methods=['POST'])
def create_user():
    """POST /users - Create a new user."""
    logger.info('[WEB] POST /users')
    
    try:
        # Generate new user ID
        user_id = str(uuid.uuid4())
        
        # Build address object if any address field is provided
        address = None
        if any(request.form.get(f) for f in ['street_address', 'locality', 'region', 'postal_code', 'country']):
            address = {}
            if request.form.get('street_address'):
                address['street_address'] = request.form.get('street_address')
            if request.form.get('locality'):
                address['locality'] = request.form.get('locality')
            if request.form.get('region'):
                address['region'] = request.form.get('region')
            if request.form.get('postal_code'):
                address['postal_code'] = request.form.get('postal_code')
            if request.form.get('country'):
                address['country'] = request.form.get('country')
            
            # Build formatted address
            parts = []
            for key in ['street_address', 'locality', 'region', 'postal_code', 'country']:
                if address.get(key):
                    parts.append(address[key])
            address['formatted'] = ', '.join(parts)
        
        # Create new user object
        new_user = {
            'id': user_id,
            'email': request.form.get('email'),
            'password': request.form.get('password'),
            'email_verified': request.form.get('email_verified') == 'true',
            'phone_number_verified': request.form.get('phone_number_verified') == 'true',
            'updated_at': datetime.now().isoformat()
        }
        
        # Add optional fields
        optional_fields = ['given_name', 'family_name', 'middle_name', 'nickname', 'name', 
                          'preferred_username', 'phone_number', 'birthdate', 'gender', 
                          'locale', 'zoneinfo', 'profile', 'picture', 'website']
        
        for field in optional_fields:
            value = request.form.get(field)
            if value:
                new_user[field] = value
        
        if address:
            new_user['address'] = address
        
        USERS.append(new_user)
        if not save_data():
            logger.error('[WEB] Failed to persist data changes')
            return render_template('user_form.html', 
                                   user=None, 
                                   error='User created but failed to save to disk. Changes may be lost on restart.', 
                                   current_year=datetime.now().year)
        
        logger.info(f'[WEB] Created user: {new_user["email"]}')
        return redirect(url_for('index'))
        
    except ValueError as e:
        error_msg = 'Invalid input: Please check your form data'
        return render_template('user_form.html', user=None, error=error_msg, current_year=datetime.now().year)
    except Exception as e:
        logger.error(f'[WEB] Error creating user: {str(e)}')
        error_msg = 'An error occurred while creating the user. Please try again.'
        return render_template('user_form.html', user=None, error=error_msg, current_year=datetime.now().year)


@app.route('/users/<user_id>/edit', methods=['GET'])
def edit_user(user_id):
    """GET /users/<user_id>/edit - Display form to edit a user."""
    user = next((u for u in USERS if u.get('id') == user_id), None)
    if not user:
        abort(404)
    return render_template('user_form.html', user=user, current_year=datetime.now().year)


@app.route('/users/<user_id>', methods=['POST', 'PUT', 'PATCH'])
def update_user(user_id):
    """
    POST/PUT/PATCH /users/<user_id> - Update a user.
    Supports method override via a hidden '_method' form field for HTML form compatibility.
    """
    # Support method override for HTML forms
    method = request.method
    if method == 'POST':
        override = request.form.get('_method', '').upper()
        if override in ('PUT', 'PATCH'):
            method = override
    logger.info(f'[WEB] {method} /users/{user_id}')
    
    user = next((u for u in USERS if u.get('id') == user_id), None)
    if not user:
        abort(404)
    
    try:
        # Update user fields
        user['email'] = request.form.get('email')
        
        # Only update password if provided
        password = request.form.get('password')
        if password is not None:
            if password == '':
                error_msg = 'Password cannot be empty.'
                logger.error(f'[WEB] Error updating user: {error_msg}')
                return render_template('user_form.html', user=user, error=error_msg, current_year=datetime.now().year)
            user['password'] = password
        
        user['email_verified'] = request.form.get('email_verified') == 'true'
        user['phone_number_verified'] = request.form.get('phone_number_verified') == 'true'
        user['updated_at'] = int(datetime.now().timestamp())
        
        # Update optional fields
        optional_fields = ['given_name', 'family_name', 'middle_name', 'nickname', 'name', 
                          'preferred_username', 'phone_number', 'birthdate', 'gender', 
                          'locale', 'zoneinfo', 'profile', 'picture', 'website']
        
        for field in optional_fields:
            value = request.form.get(field)
            if value:
                user[field] = value
            elif field in user:
                del user[field]
        
        # Update address
        if any(request.form.get(f) for f in ['street_address', 'locality', 'region', 'postal_code', 'country']):
            address = {}
            if request.form.get('street_address'):
                address['street_address'] = request.form.get('street_address')
            if request.form.get('locality'):
                address['locality'] = request.form.get('locality')
            if request.form.get('region'):
                address['region'] = request.form.get('region')
            if request.form.get('postal_code'):
                address['postal_code'] = request.form.get('postal_code')
            if request.form.get('country'):
                address['country'] = request.form.get('country')
            
            # Build formatted address
            parts = []
            for key in ['street_address', 'locality', 'region', 'postal_code', 'country']:
                if address.get(key):
                    parts.append(address[key])
            address['formatted'] = ', '.join(parts)
            
            user['address'] = address
        elif 'address' in user:
            del user['address']
        
        save_data()
        
        logger.info(f'[WEB] Updated user: {user["email"]}')
        return redirect(url_for('index'))
        
    except Exception as e:
        logger.error(f'[WEB] Error updating user: {str(e)}')
        return render_template('user_form.html', user=user, error=str(e), current_year=datetime.now().year)


@app.route('/users/<user_id>', methods=['DELETE'])
def delete_user(user_id):
    """DELETE /users/<user_id> - Delete a user."""
    logger.info(f'[WEB] DELETE /users/{user_id}')
    
    global USERS
    user = next((u for u in USERS if u.get('id') == user_id), None)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    USERS = [u for u in USERS if u.get('id') != user_id]
    save_data()
    
    logger.info(f'[WEB] Deleted user: {user["email"]}')
    return jsonify({'success': True})


# Domain CRUD Routes
@app.route('/domains', methods=['GET'])
def list_domains():
    """GET /domains - List all domains."""
    return render_template('domains.html', domains=DOMAINS, current_year=datetime.now().year)


@app.route('/domains/new', methods=['GET'])
def new_domain():
    """GET /domains/new - Display form to create a new domain."""
    return render_template('domain_form.html', domain=None, current_year=datetime.now().year)


@app.route('/domains', methods=['POST'])
def create_domain():
    """POST /domains - Create a new domain."""
    logger.info('[WEB] POST /domains')
    
    try:
        new_domain = {
            'id': str(uuid.uuid4()),
            'name': request.form.get('name'),
            'description': request.form.get('description', ''),
            'active': request.form.get('active') == 'true',
            'created_at': int(datetime.now().timestamp())
        }
        
        DOMAINS.append(new_domain)
        save_data()
        
        logger.info(f'[WEB] Created domain: {new_domain["name"]}')
        return redirect(url_for('list_domains'))
        
    except Exception as e:
        logger.error(f'[WEB] Error creating domain: {str(e)}')
        return render_template('domain_form.html', domain=None, error=str(e), current_year=datetime.now().year)


@app.route('/domains/<domain_id>/edit', methods=['GET'])
def edit_domain(domain_id):
    """GET /domains/<domain_id>/edit - Display form to edit a domain."""
    domain = next((d for d in DOMAINS if d.get('id') == domain_id), None)
    if not domain:
        abort(404)
    return render_template('domain_form.html', domain=domain, current_year=datetime.now().year)


@app.route('/domains/<domain_id>', methods=['POST'])
def update_domain(domain_id):
    """POST /domains/<domain_id> - Update a domain."""
    logger.info(f'[WEB] POST /domains/{domain_id}')
    
    domain = next((d for d in DOMAINS if d.get('id') == domain_id), None)
    if not domain:
        abort(404)
    
    try:
        domain['name'] = request.form.get('name')
        domain['description'] = request.form.get('description', '')
        domain['active'] = request.form.get('active') == 'true'
        domain['updated_at'] = int(datetime.now().timestamp())
        
        save_data()
        
        logger.info(f'[WEB] Updated domain: {domain["name"]}')
        return redirect(url_for('list_domains'))
        
    except Exception as e:
        logger.error(f'[WEB] Error updating domain: {str(e)}')
        return render_template('domain_form.html', domain=domain, error=str(e), current_year=datetime.now().year)


@app.route('/domains/<domain_id>', methods=['DELETE'])
def delete_domain(domain_id):
    """DELETE /domains/<domain_id> - Delete a domain."""
    logger.info(f'[WEB] DELETE /domains/{domain_id}')
    
    global DOMAINS
    domain = next((d for d in DOMAINS if d.get('id') == domain_id), None)
    if not domain:
        return jsonify({'error': 'Domain not found'}), 404
    
    DOMAINS = [d for d in DOMAINS if d.get('id') != domain_id]
    save_data()
    
    logger.info(f'[WEB] Deleted domain: {domain["name"]}')
    return jsonify({'success': True})


# Group CRUD Routes
@app.route('/groups', methods=['GET'])
def list_groups():
    """GET /groups - List all groups."""
    return render_template('groups.html', groups=GROUPS, current_year=datetime.now().year)


@app.route('/groups/new', methods=['GET'])
def new_group():
    """GET /groups/new - Display form to create a new group."""
    return render_template('group_form.html', group=None, current_year=datetime.now().year)


@app.route('/groups', methods=['POST'])
def create_group():
    """POST /groups - Create a new group."""
    logger.info('[WEB] POST /groups')
    
    try:
        members = []
        members_str = request.form.get('members', '')
        if members_str:
            members = [m.strip() for m in members_str.split(',') if m.strip()]
        
        new_group = {
            'id': str(uuid.uuid4()),
            'name': request.form.get('name'),
            'description': request.form.get('description', ''),
            'members': members,
            'created_at': int(datetime.now().timestamp())
        }
        
        GROUPS.append(new_group)
        save_data()
        
        logger.info(f'[WEB] Created group: {new_group["name"]}')
        return redirect(url_for('list_groups'))
        
    except Exception as e:
        logger.error(f'[WEB] Error creating group: {str(e)}')
        return render_template('group_form.html', group=None, error=str(e), current_year=datetime.now().year)


@app.route('/groups/<group_id>/edit', methods=['GET'])
def edit_group(group_id):
    """GET /groups/<group_id>/edit - Display form to edit a group."""
    group = next((g for g in GROUPS if g.get('id') == group_id), None)
    if not group:
        abort(404)
    return render_template('group_form.html', group=group, current_year=datetime.now().year)


@app.route('/groups/<group_id>', methods=['POST'])
def update_group(group_id):
    """POST /groups/<group_id> - Update a group."""
    logger.info(f'[WEB] POST /groups/{group_id}')
    
    group = next((g for g in GROUPS if g.get('id') == group_id), None)
    if not group:
        abort(404)
    
    try:
        members = []
        members_str = request.form.get('members', '')
        if members_str:
            members = [m.strip() for m in members_str.split(',') if m.strip()]
        
        group['name'] = request.form.get('name')
        group['description'] = request.form.get('description', '')
        group['members'] = members
        group['updated_at'] = int(datetime.now().timestamp())
        
        save_data()
        
        logger.info(f'[WEB] Updated group: {group["name"]}')
        return redirect(url_for('list_groups'))
        
    except Exception as e:
        logger.error(f'[WEB] Error updating group: {str(e)}')
        return render_template('group_form.html', group=group, error=str(e), current_year=datetime.now().year)


@app.route('/groups/<group_id>', methods=['DELETE'])
def delete_group(group_id):
    """DELETE /groups/<group_id> - Delete a group."""
    logger.info(f'[WEB] DELETE /groups/{group_id}')
    
    global GROUPS
    group = next((g for g in GROUPS if g.get('id') == group_id), None)
    if not group:
        return jsonify({'error': 'Group not found'}), 404
    
    GROUPS = [g for g in GROUPS if g.get('id') != group_id]
    save_data()
    
    logger.info(f'[WEB] Deleted group: {group["name"]}')
    return jsonify({'success': True})


# Role CRUD Routes
@app.route('/roles', methods=['GET'])
def list_roles():
    """GET /roles - List all roles."""
    return render_template('roles.html', roles=ROLES, current_year=datetime.now().year)


@app.route('/roles/new', methods=['GET'])
def new_role():
    """GET /roles/new - Display form to create a new role."""
    return render_template('role_form.html', role=None, current_year=datetime.now().year)


@app.route('/roles', methods=['POST'])
def create_role():
    """POST /roles - Create a new role."""
    logger.info('[WEB] POST /roles')
    
    try:
        permissions = []
        permissions_str = request.form.get('permissions', '')
        if permissions_str:
            permissions = [p.strip() for p in permissions_str.split(',') if p.strip()]
        
        new_role = {
            'id': str(uuid.uuid4()),
            'name': request.form.get('name'),
            'description': request.form.get('description', ''),
            'permissions': permissions,
            'created_at': int(datetime.now().timestamp())
        }
        
        ROLES.append(new_role)
        save_data()
        
        logger.info(f'[WEB] Created role: {new_role["name"]}')
        return redirect(url_for('list_roles'))
        
    except Exception as e:
        logger.error(f'[WEB] Error creating role: {str(e)}')
        return render_template('role_form.html', role=None, error=str(e), current_year=datetime.now().year)


@app.route('/roles/<role_id>/edit', methods=['GET'])
# --- Generic CRUD Route Factory ---
def create_crud_routes(resource_name, collection_ref, fields, template_prefix, parse_fn=None):
    """
    Registers CRUD routes for a resource.
    - resource_name: e.g. 'role'
    - collection_ref: a function returning the collection list (to allow global updates)
    - fields: list of field names
    - template_prefix: e.g. 'role' for 'role_form.html'
    - parse_fn: function(form) -> dict of parsed fields (optional)
    """
    plural = resource_name + 's'
    singular = resource_name
    list_route = f'/{plural}'
    new_route = f'/{plural}/new'
    edit_route = f'/{plural}/<item_id>/edit'
    post_route = f'/{plural}/<item_id>'
    delete_route = f'/{plural}/<item_id>'

    # List
    @app.route(list_route, methods=['GET'])
    def list_items():
        items = collection_ref()
        return render_template(f'{template_prefix}_list.html', **{plural: items}, current_year=datetime.now().year)

    # New
    @app.route(new_route, methods=['GET'])
    def new_item():
        return render_template(f'{template_prefix}_form.html', **{singular: {}}, current_year=datetime.now().year)

    # Create
    @app.route(list_route, methods=['POST'])
    def create_item():
        logger.info(f'[WEB] POST {list_route}')
        try:
            form = request.form
            if parse_fn:
                item = parse_fn(form)
            else:
                item = {field: form.get(field) for field in fields}
            item['id'] = str(uuid.uuid4())
            item['created_at'] = int(datetime.now().timestamp())
            item['updated_at'] = int(datetime.now().timestamp())
            collection = collection_ref()
            collection.append(item)
            save_data()
            logger.info(f'[WEB] Created {singular}: {item.get("name", item["id"])}')
            return redirect(url_for(f'list_items'))
        except Exception as e:
            logger.error(f'[WEB] Error creating {singular}: {str(e)}')
            return render_template(f'{template_prefix}_form.html', **{singular: {}}, error=str(e), current_year=datetime.now().year)

    # Edit
    @app.route(edit_route, methods=['GET'])
    def edit_item(item_id):
        items = collection_ref()
        item = next((i for i in items if i.get('id') == item_id), None)
        if not item:
            abort(404)
        return render_template(f'{template_prefix}_form.html', **{singular: item}, current_year=datetime.now().year)

    # Update
    @app.route(post_route, methods=['POST'])
    def update_item(item_id):
        logger.info(f'[WEB] POST {post_route}')
        items = collection_ref()
        item = next((i for i in items if i.get('id') == item_id), None)
        if not item:
            abort(404)
        try:
            form = request.form
            if parse_fn:
                updated = parse_fn(form)
            else:
                updated = {field: form.get(field) for field in fields}
            for k, v in updated.items():
                item[k] = v
            item['updated_at'] = int(datetime.now().timestamp())
            save_data()
            logger.info(f'[WEB] Updated {singular}: {item.get("name", item["id"])}')
            return redirect(url_for(f'list_items'))
        except Exception as e:
            logger.error(f'[WEB] Error updating {singular}: {str(e)}')
            return render_template(f'{template_prefix}_form.html', **{singular: item}, error=str(e), current_year=datetime.now().year)

    # Delete
    @app.route(delete_route, methods=['DELETE'])
    def delete_item(item_id):
        logger.info(f'[WEB] DELETE {delete_route}')
        items = collection_ref()
        item = next((i for i in items if i.get('id') == item_id), None)
        if not item:
            return jsonify({'error': f'{singular.capitalize()} not found'}), 404
        items[:] = [i for i in items if i.get('id') != item_id]
        save_data()
        logger.info(f'[WEB] Deleted {singular}: {item.get("name", item["id"])}')
        return jsonify({'success': True})

# --- Resource-specific parse functions ---
def parse_role_form(form):
    permissions = []
    permissions_str = form.get('permissions', '')
    if permissions_str:
        permissions = [p.strip() for p in permissions_str.split(',') if p.strip()]
    return {
        'name': form.get('name'),
        'description': form.get('description', ''),
        'permissions': permissions
    }

# --- Register CRUD routes for roles ---
create_crud_routes(
    resource_name='role',
    collection_ref=lambda: ROLES,
    fields=['name', 'description', 'permissions'],
    template_prefix='role',
    parse_fn=parse_role_form
)
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
