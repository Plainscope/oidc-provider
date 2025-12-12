"""User management routes."""
import logging
from flask import request, jsonify, abort
import bcrypt
from models import User, UserEmail, UserProperty, UserRole, UserGroup, AuditLog

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


def register_user_routes(bp):
    """Register user routes to blueprint."""
    
    @bp.route('', methods=['GET'])
    def list_users():
        """GET /api/users - List all users or filter by domain."""
        logger.info('[API] GET /api/users')
        
        domain_id = request.args.get('domain_id')
        
        try:
            if domain_id:
                users = User.list_by_domain(domain_id)
            else:
                users = User.list_all()
            
            return jsonify([exclude_password(u) for u in users])
        except Exception as e:
            logger.error(f'[API] Error listing users: {str(e)}')
            abort(500)
    
    @bp.route('', methods=['POST'])
    def create_user():
        """POST /api/users - Create a new user."""
        logger.info('[API] POST /api/users')
        
        data = request.get_json()
        if not data or not all(k in data for k in ['username', 'password', 'domain_id']):
            abort(400)
        
        try:
            # Check all emails for uniqueness and duplicates before creating user
            emails_to_add = []
            primary_email = data.get('email')
            secondary_emails = data.get('emails', [])

            # Check for duplicate emails in the list (including primary)
            all_emails = [primary_email] if primary_email else []
            all_emails += secondary_emails
            # Remove None values in case primary_email is None
            all_emails = [e for e in all_emails if e]
            if len(all_emails) != len(set(all_emails)):
                return jsonify({'error': 'Duplicate emails provided'}), 400

            if primary_email:
                if User.get_by_email(primary_email):
                    return jsonify({'error': 'Email already in use'}), 409
                emails_to_add.append((primary_email, True))  # is_primary=True

            for email in secondary_emails:
                if email != primary_email:
                    if User.get_by_email(email):
                        return jsonify({'error': f'Email already in use: {email}'}), 409
                    emails_to_add.append((email, False))  # is_primary=False
            # Hash password
            hashed = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

            user_id = User.create(
                username=data['username'],
                password=hashed,
                domain_id=data['domain_id'],
                first_name=data.get('first_name', ''),
                last_name=data.get('last_name', ''),
                display_name=data.get('display_name', '')
            )
            
            # Add all emails
            for email, is_primary in emails_to_add:
                UserEmail.add(user_id, email, is_primary=is_primary)
            
            for key, value in data.get('properties', {}).items():
                UserProperty.set(user_id, key, value)
            
            for role_id in data.get('role_ids', []):
                UserRole.assign(user_id, role_id)
            
            for group_id in data.get('group_ids', []):
                UserGroup.add(user_id, group_id)
            
            user = User.get(user_id)
            AuditLog.log('user', user_id, 'created', 
                         changes={'username': data['username']}, **get_audit_metadata())
            return jsonify(exclude_password(user)), 201
        except Exception as e:
            logger.error(f'[API] Error creating user: {str(e)}')
            abort(500)
    
    @bp.route('/<user_id>', methods=['GET'])
    def get_user(user_id):
        """GET /api/users/<user_id> - Get a user by ID."""
        logger.info(f'[API] GET /api/users/{user_id}')
        
        user = User.get(user_id)
        if not user:
            abort(404)
        
        return jsonify(exclude_password(user))
    
    @bp.route('/<user_id>', methods=['PATCH'])
    def update_user(user_id):
        """PATCH /api/users/<user_id> - Update a user."""
        logger.info(f'[API] PATCH /api/users/{user_id}')
        
        user = User.get(user_id, include_details=False)
        if not user:
            abort(404)
        
        data = request.get_json()
        if not data:
            abort(400)
        
        try:
            changes = {}
            
            update_fields = {}
            for field in ['password', 'first_name', 'last_name', 'display_name', 'is_active']:
                if field in data:
                    if field == 'password':
                        update_fields[field] = bcrypt.hashpw(data[field].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                        # Do not log the actual password; redact it in the audit log
                        changes[field] = '[REDACTED]'
                        # Do not log the actual password; redact it in the audit log
                        changes[field] = '[REDACTED]'
                    else:
                        update_fields[field] = data[field]
                        changes[field] = data[field]
            if update_fields:
                User.update(user_id, **update_fields)
            
            if 'email' in data:
                existing = User.get_by_email(data['email'])
                if existing and str(existing['id']) != str(user_id):
                    return jsonify({'error': 'Email already in use'}), 409
                UserEmail.add(user_id, data['email'], is_primary=True)
                changes['email'] = data['email']
            
            for key, value in data.get('properties', {}).items():
                UserProperty.set(user_id, key, value)
                changes[f'property_{key}'] = value
            
            if 'role_ids' in data:
                current_roles = [r['id'] for r in UserRole.get_by_user(user_id)]
                new_roles = data['role_ids']
                
                for role_id in current_roles:
                    if role_id not in new_roles:
                        UserRole.remove(user_id, role_id)
                
                for role_id in new_roles:
                    if role_id not in current_roles:
                        UserRole.assign(user_id, role_id)
                
                changes['roles'] = new_roles
            
            if 'group_ids' in data:
                current_groups = [g['id'] for g in UserGroup.get_by_user(user_id)]
                new_groups = data['group_ids']
                
                for group_id in current_groups:
                    if group_id not in new_groups:
                        UserGroup.remove(user_id, group_id)
                
                for group_id in new_groups:
                    if group_id not in current_groups:
                        UserGroup.add(user_id, group_id)
                
                changes['groups'] = new_groups
            
            user = User.get(user_id)
            AuditLog.log('user', user_id, 'updated', changes=changes, **get_audit_metadata())
            return jsonify(exclude_password(user))
        except Exception as e:
            logger.error(f'[API] Error updating user: {str(e)}')
            abort(500)
    
    @bp.route('/<user_id>', methods=['DELETE'])
    def delete_user(user_id):
        """DELETE /api/users/<user_id> - Delete a user."""
        logger.info(f'[API] DELETE /api/users/{user_id}')
        
        user = User.get(user_id, include_details=False)
        if not user:
            abort(404)
        
        try:
            User.delete(user_id)
            AuditLog.log('user', user_id, 'deleted', **get_audit_metadata())
            return jsonify({'message': 'User deleted'}), 204
        except Exception as e:
            logger.error(f'[API] Error deleting user: {str(e)}')
            abort(500)
