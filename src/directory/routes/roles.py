"""Role management routes."""
import logging
from flask import request, jsonify, abort
from models import Role, AuditLog

logger = logging.getLogger('remote-directory')


def get_audit_metadata():
    """Get audit metadata from request."""
    return {
        'ip_address': request.remote_addr,
        'user_agent': request.headers.get('User-Agent', '')
    }


def register_role_routes(bp):
    """Register role routes to blueprint."""
    
    @bp.route('', methods=['GET'])
    def list_roles():
        """GET /api/roles - List all roles."""
        logger.info('[API] GET /api/roles')
        try:
            roles = Role.list_all()
            return jsonify(roles)
        except Exception as e:
            logger.error(f'[API] Error listing roles: {str(e)}')
            abort(500)
    
    @bp.route('', methods=['POST'])
    def create_role():
        """POST /api/roles - Create a new role."""
        logger.info('[API] POST /api/roles')
        
        data = request.get_json()
        if not data or 'name' not in data:
            abort(400)
        
        try:
            # Uniqueness validation
            existing = Role.get_by_name(data['name']) if hasattr(Role, 'get_by_name') else None
            if existing:
                return jsonify({'error': 'Role name already exists'}), 409

            role_id = Role.create(data['name'], data.get('description', ''))
            role = Role.get(role_id)
            AuditLog.log('role', role_id, 'created', 
                         changes={'name': data['name']}, **get_audit_metadata())
            return jsonify(role), 201
        except Exception as e:
            logger.error(f'[API] Error creating role: {str(e)}')
            abort(500)
    
    @bp.route('/<role_id>', methods=['GET'])
    def get_role(role_id):
        """GET /api/roles/<role_id> - Get a role by ID."""
        logger.info(f'[API] GET /api/roles/{role_id}')
        
        role = Role.get(role_id)
        if not role:
            abort(404)
        
        return jsonify(role)
    
    @bp.route('/<role_id>', methods=['DELETE'])
    def delete_role(role_id):
        """DELETE /api/roles/<role_id> - Delete a role."""
        logger.info(f'[API] DELETE /api/roles/{role_id}')
        
        try:
            Role.delete(role_id)
            AuditLog.log('role', role_id, 'deleted', **get_audit_metadata())
            return jsonify({'message': 'Role deleted'}), 204
        except Exception as e:
            logger.error(f'[API] Error deleting role: {str(e)}')
            abort(500)
