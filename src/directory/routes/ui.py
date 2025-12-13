"""UI routes for the web dashboard using Jinja templates."""
import logging
from flask import render_template, request, session, redirect, url_for, jsonify, abort, current_app

logger = logging.getLogger('remote-directory')


def register_ui_routes(bp):
    """Register UI routes to blueprint."""

    @bp.route('/login', methods=['GET', 'POST'])
    def ui_login():
        """Login endpoint - GET serves login page, POST validates session."""
        if request.method == 'GET':
            logger.info('[AUTH] GET /login')
            return render_template('login.html', title='Login - Simple Directory')
        
        # POST request to validate token and create session
        if request.method == 'POST':
            logger.info('[AUTH] POST /login - Validating bearer token')
            data = request.get_json()
            
            if not data or 'token' not in data:
                return jsonify({'error': 'Missing token'}), 400
            
            token = data['token'].strip()
            if not token:
                return jsonify({'error': 'Token cannot be empty'}), 400
            
            # Validate token by checking it against BEARER_TOKEN if configured
            # Get BEARER_TOKEN from app config (stored during init)
            bearer_token = current_app.config.get('BEARER_TOKEN')
            
            if bearer_token and token != bearer_token:
                logger.warning('[AUTH] POST /login - Invalid token provided')
                return jsonify({'error': 'Invalid token'}), 401
            
            # Token is valid, create session
            session['authenticated'] = True
            session['token'] = token
            logger.info('[AUTH] POST /login - Session created successfully')
            
            # Return success - token is now in server session
            return jsonify({'success': True}), 200

    @bp.route('/logout', methods=['POST'])
    def ui_logout():
        """Logout endpoint - clears session."""
        logger.info('[AUTH] POST /logout')
        session.clear()
        return redirect(url_for('ui.ui_login')), 302

    @bp.route('/', methods=['GET'])
    def ui_home():
        """GET / - Render the user management dashboard with stats."""
        logger.info('[API] GET /')
        token = session.get('token')
        
        # Get statistics for dashboard
        from database import get_db
        db = get_db()
        
        try:
            # Count users
            cursor = db.execute('SELECT COUNT(*) as count FROM users')
            total_users = cursor.fetchone()['count']
            
            # Count domains
            cursor = db.execute('SELECT COUNT(*) as count FROM domains')
            total_domains = cursor.fetchone()['count']
            
            # Count groups
            cursor = db.execute('SELECT COUNT(*) as count FROM groups')
            total_groups = cursor.fetchone()['count']
            
            # Count roles
            cursor = db.execute('SELECT COUNT(*) as count FROM roles')
            total_roles = cursor.fetchone()['count']
            
            # Get recent activity
            cursor = db.execute('''
                SELECT entity_type, entity_id, action, created_at
                FROM audit_logs
                ORDER BY created_at DESC
                LIMIT 5
            ''')
            recent_activity = [dict(row) for row in cursor.fetchall()]
            
            stats = {
                'total_users': total_users,
                'total_domains': total_domains,
                'total_groups': total_groups,
                'total_roles': total_roles
            }
            
            return render_template(
                'dashboard.html',
                title='Dashboard - Simple Directory',
                current_tab='dashboard',
                auth_token=token,
                stats=stats,
                recent_activity=recent_activity,
                environment='Development' if current_app.config.get('ENV') == 'development' else 'Production'
            )
        except Exception as e:
            logger.error(f'Error getting dashboard stats: {e}')
            # Render dashboard with error message if stats fail
            return render_template(
                'dashboard.html',
                title='Dashboard - Simple Directory',
                current_tab='dashboard',
                auth_token=token,
                stats=None,
                recent_activity=None,
                environment='Development' if current_app.config.get('ENV') == 'development' else 'Production',
                error_message='An error occurred while loading dashboard statistics. Please try again later.'
            )

    @bp.route('/ui', methods=['GET'])
    def ui_dashboard():
        """GET /ui - Alias for dashboard."""
        return ui_home()

    @bp.route('/users', methods=['GET'])
    def users():
        """GET /users - Render the users page."""
        logger.info('[API] GET /users')
        token = session.get('token')
        return render_template('index.html', title='Users', current_tab='users', auth_token=token)

    @bp.route('/roles', methods=['GET'])
    def ui_roles():
        logger.info('[API] GET /roles')
        token = session.get('token')
        return render_template('roles.html', title='Roles', current_tab='roles', auth_token=token)

    @bp.route('/groups', methods=['GET'])
    def ui_groups():
        logger.info('[API] GET /groups')
        token = session.get('token')
        return render_template('groups.html', title='Groups', current_tab='groups', auth_token=token)

    @bp.route('/domains', methods=['GET'])
    def ui_domains():
        logger.info('[API] GET /domains')
        token = session.get('token')
        return render_template('domains.html', title='Domains', current_tab='domains', auth_token=token)

    @bp.route('/audit', methods=['GET'])
    def ui_audit():
        logger.info('[API] GET /audit')
        token = session.get('token')
        return render_template('audit.html', title='Audit', current_tab='audit', auth_token=token)

    @bp.route('/users/edit', methods=['GET'])
    def ui_user_edit():
        logger.info('[API] GET /users/edit')
        token = session.get('token')
        return render_template('user_edit.html', title='Edit User', current_tab='users', auth_token=token)
