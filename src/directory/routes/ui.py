"""UI routes for the web dashboard using Jinja templates."""
import logging
from flask import render_template

logger = logging.getLogger('remote-directory')


def register_ui_routes(bp):
    """Register UI routes to blueprint."""

    @bp.route('/', methods=['GET'])
    def ui_home():
        """GET / - Render the user management UI."""
        logger.info('[API] GET /')
        return render_template('index.html', title='Remote Directory', current_tab='users')

    @bp.route('/ui', methods=['GET'])
    def ui_dashboard():
        """GET /ui - Render the user management dashboard."""
        logger.info('[API] GET /ui')
        return render_template('index.html', title='Remote Directory', current_tab='users')

    @bp.route('/roles', methods=['GET'])
    def ui_roles():
        logger.info('[API] GET /roles')
        return render_template('roles.html', title='Roles', current_tab='roles')

    @bp.route('/groups', methods=['GET'])
    def ui_groups():
        logger.info('[API] GET /groups')
        return render_template('groups.html', title='Groups', current_tab='groups')

    @bp.route('/domains', methods=['GET'])
    def ui_domains():
        logger.info('[API] GET /domains')
        return render_template('domains.html', title='Domains', current_tab='domains')

    @bp.route('/audit', methods=['GET'])
    def ui_audit():
        logger.info('[API] GET /audit')
        return render_template('audit.html', title='Audit', current_tab='audit')

    @bp.route('/users/edit', methods=['GET'])
    def ui_user_edit():
        logger.info('[API] GET /users/edit')
        return render_template('user_edit.html', title='Edit User', current_tab='users')
