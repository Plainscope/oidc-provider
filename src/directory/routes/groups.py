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
        if not data or not all(k in data for k in ['name', 'domain_id']):
            abort(400)
        
        try:
            # Uniqueness validation - groups are globally unique
            existing = Group.get_by_name(data['name']) if hasattr(Group, 'get_by_name') else None
            if existing:
                return jsonify({'error': 'Group name already exists'}), 409

            group_id = Group.create(data['name'], data['domain_id'], 
                                   data.get('description', ''))
            group = Group.get(group_id)
            AuditLog.log('group', group_id, 'created', 
                         changes={'name': data['name']}, **get_audit_metadata())
            return jsonify(group), 201
        except Exception as e:
            logger.error(f'[API] Error creating group: {str(e)}')
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
