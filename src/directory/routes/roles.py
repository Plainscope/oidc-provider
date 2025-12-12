"""Role management routes."""
import logging
from flask import request, jsonify, abort
from models import Role, AuditLog
from utils.audit import get_audit_metadata

logger = logging.getLogger('remote-directory')
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
        
        # Validate name is not empty
        name = data['name'].strip() if data['name'] else ''
        if not name:
            return jsonify({'error': 'Role name is required'}), 400
        
        try:
            # Uniqueness validation
            existing = Role.get_by_name(name)
            if existing:
                return jsonify({'error': 'Role name already exists'}), 409

            role_id = Role.create(name, data.get('description', ''))
            role = Role.get(role_id)
            AuditLog.log('role', role_id, 'created', 
                         changes={'name': name}, **get_audit_metadata())
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
