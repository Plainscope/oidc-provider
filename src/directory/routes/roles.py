"""Role management routes."""
import logging
from flask import request, jsonify, abort
from models import Role, UserRole, AuditLog
from utils.audit import get_audit_metadata

logger = logging.getLogger('remote-directory')


def exclude_password(user):
    """Remove password field from user object for safe response."""
    return {k: v for k, v in user.items() if k != 'password'}


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
    
    @bp.route('/<role_id>/users', methods=['GET'])
    def get_role_users(role_id):
        """GET /api/roles/<role_id>/users - Get all users with a role."""
        logger.info(f'[API] GET /api/roles/{role_id}/users')
        
        role = Role.get(role_id)
        if not role:
            abort(404)
        
        try:
            users = UserRole.get_by_role(role_id)
            return jsonify([exclude_password(u) for u in users])
        except Exception as e:
            logger.error(f'[API] Error getting role users: {str(e)}')
            abort(500)
    
    @bp.route('/<role_id>/users', methods=['PUT'])
    def set_role_users(role_id):
        """PUT /api/roles/<role_id>/users - Set all users with a role."""
        logger.info(f'[API] PUT /api/roles/{role_id}/users')
        
        role = Role.get(role_id)
        if not role:
            abort(404)
        
        data = request.get_json()
        if not data or 'user_ids' not in data:
            return jsonify({'error': 'user_ids is required'}), 400
        
        user_ids = data['user_ids']
        if not isinstance(user_ids, list):
            return jsonify({'error': 'user_ids must be an array'}), 400
        
        try:
            # Get current users with role
            current_users = UserRole.get_by_role(role_id)
            current_user_ids = [u['id'] for u in current_users]
            
            # Remove users not in new list
            for user_id in current_user_ids:
                if user_id not in user_ids:
                    UserRole.remove(user_id, role_id)
                    logger.info(f'[ROLE] Removed role {role_id} from user {user_id}')
            
            # Add users not in current list
            for user_id in user_ids:
                if user_id not in current_user_ids:
                    UserRole.add(user_id, role_id)
                    logger.info(f'[ROLE] Added role {role_id} to user {user_id}')
            
            AuditLog.log('role', role_id, 'users_updated', 
                        changes={'user_ids': user_ids}, **get_audit_metadata())
            
            return jsonify({'message': 'Role users updated'}), 200
        except Exception as e:
            logger.error(f'[API] Error setting role users: {str(e)}')
            abort(500)
    
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
