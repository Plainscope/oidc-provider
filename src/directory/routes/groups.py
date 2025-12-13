"""Group management routes."""
import logging
from flask import request, jsonify, abort
from models import Group, UserGroup, AuditLog

logger = logging.getLogger('remote-directory')


def get_audit_metadata():
    """Get audit metadata from request."""
    return {
        'ip_address': request.remote_addr,
        'user_agent': request.headers.get('User-Agent', '')
    }


def exclude_password(user):
    """Remove password field from user object for safe response."""
    return {k: v for k, v in user.items() if k != 'password'}


def register_group_routes(bp):
    """Register group routes to blueprint."""
    
    @bp.route('', methods=['GET'])
    def list_groups():
        """GET /api/groups - List all groups or filter by domain."""
        logger.info('[API] GET /api/groups')
        
        domain_id = request.args.get('domain_id')
        
        try:
            if domain_id:
                groups = Group.list_by_domain(domain_id)
            else:
                groups = Group.list_all()
            
            return jsonify(groups)
        except Exception as e:
            logger.error(f'[API] Error listing groups: {str(e)}')
            abort(500)
    
    @bp.route('', methods=['POST'])
    def create_group():
        """POST /api/groups - Create a new group."""
        logger.info('[API] POST /api/groups')
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        # Validate required fields
        name = data.get('name', '').strip() if data.get('name') else ''
        domain_id = data.get('domain_id', '').strip() if data.get('domain_id') else ''
        
        if not name:
            return jsonify({'error': 'Group name is required'}), 400
        if not domain_id:
            return jsonify({'error': 'Domain ID is required'}), 400
        
        try:
            # Check for duplicate group name within the same domain
            existing = Group.get_by_name(name, domain_id)
            if existing:
                return jsonify({'error': 'Group name already exists in this domain'}), 409

            group_id = Group.create(name, domain_id, 
                                   data.get('description', ''))
            group = Group.get(group_id)
            AuditLog.log('group', group_id, 'created', 
                         changes={'name': name, 'domain_id': domain_id}, **get_audit_metadata())
            return jsonify(group), 201
        except Exception as e:
            logger.error(f'[API] Error creating group: {str(e)}')
            # Check if it's a database constraint error
            error_msg = str(e).lower()
            if 'unique' in error_msg or 'constraint' in error_msg:
                return jsonify({'error': 'Group name already exists in this domain'}), 409
            abort(500)
    
    @bp.route('/<group_id>', methods=['GET'])
    def get_group(group_id):
        """GET /api/groups/<group_id> - Get a group by ID."""
        logger.info(f'[API] GET /api/groups/{group_id}')
        
        group = Group.get(group_id)
        if not group:
            abort(404)
        
        return jsonify(group)
    
    @bp.route('/<group_id>/users', methods=['GET'])
    def get_group_users(group_id):
        """GET /api/groups/<group_id>/users - Get all users in a group."""
        logger.info(f'[API] GET /api/groups/{group_id}/users')
        
        group = Group.get(group_id)
        if not group:
            abort(404)
        
        try:
            users = UserGroup.get_by_group(group_id)
            return jsonify([exclude_password(u) for u in users])
        except Exception as e:
            logger.error(f'[API] Error getting group users: {str(e)}')
            abort(500)
    
    @bp.route('/<group_id>/users', methods=['PUT'])
    def set_group_users(group_id):
        """PUT /api/groups/<group_id>/users - Set all users in a group."""
        logger.info(f'[API] PUT /api/groups/{group_id}/users')
        
        group = Group.get(group_id)
        if not group:
            abort(404)
        
        data = request.get_json()
        if not data or 'user_ids' not in data:
            return jsonify({'error': 'user_ids is required'}), 400
        
        user_ids = data['user_ids']
        if not isinstance(user_ids, list):
            return jsonify({'error': 'user_ids must be an array'}), 400
        
        try:
            # Get current users in group
            current_users = UserGroup.get_by_group(group_id)
            current_user_ids = [u['id'] for u in current_users]
            
            # Remove users not in new list
            for user_id in current_user_ids:
                if user_id not in user_ids:
                    UserGroup.remove(user_id, group_id)
                    logger.info(f'[GROUP] Removed user {user_id} from group {group_id}')
            
            # Add users not in current list
            for user_id in user_ids:
                if user_id not in current_user_ids:
                    UserGroup.add(user_id, group_id)
                    logger.info(f'[GROUP] Added user {user_id} to group {group_id}')
            
            AuditLog.log('group', group_id, 'users_updated', 
                        changes={'user_ids': user_ids}, **get_audit_metadata())
            
            return jsonify({'message': 'Group users updated'}), 200
        except Exception as e:
            logger.error(f'[API] Error setting group users: {str(e)}')
            abort(500)
    
    @bp.route('/<group_id>', methods=['DELETE'])
    def delete_group(group_id):
        """DELETE /api/groups/<group_id> - Delete a group."""
        logger.info(f'[API] DELETE /api/groups/{group_id}')
        
        try:
            Group.delete(group_id)
            AuditLog.log('group', group_id, 'deleted', **get_audit_metadata())
            return jsonify({'message': 'Group deleted'}), 204
        except Exception as e:
            logger.error(f'[API] Error deleting group: {str(e)}')
            abort(500)
