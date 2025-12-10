"""
Data models and repository layer for user management.
Provides high-level database operations and data access.
"""
import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime
import json
import logging

from database import get_db

logger = logging.getLogger('remote-directory')


def generate_id() -> str:
    """Generate a unique ID."""
    return str(uuid.uuid4())


class Domain:
    """Domain model for user organizations/domains."""
    
    @staticmethod
    def create(name: str, description: str = '', is_default: bool = False) -> str:
        """Create a new domain."""
        db = get_db()
        domain_id = generate_id()
        
        try:
            cursor = db.execute(
                '''INSERT INTO domains (id, name, description, is_default)
                   VALUES (?, ?, ?, ?)''',
                (domain_id, name, description, is_default)
            )
            db.commit()
            logger.info(f'[DOMAIN] Created domain: {name} ({domain_id})')
            return domain_id
        except Exception as e:
            logger.error(f'[DOMAIN] Failed to create domain: {str(e)}')
            db.rollback()
            raise
    
    @staticmethod
    def get(domain_id: str) -> Optional[Dict]:
        """Get domain by ID."""
        db = get_db()
        cursor = db.execute('SELECT * FROM domains WHERE id = ?', (domain_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
    
    @staticmethod
    def get_by_name(name: str) -> Optional[Dict]:
        """Get domain by name."""
        db = get_db()
        cursor = db.execute('SELECT * FROM domains WHERE name = ?', (name,))
        row = cursor.fetchone()
        return dict(row) if row else None
    
    @staticmethod
    def list_all() -> List[Dict]:
        """List all domains."""
        db = get_db()
        cursor = db.execute('SELECT * FROM domains ORDER BY name')
        return [dict(row) for row in cursor.fetchall()]
    
    @staticmethod
    def delete(domain_id: str):
        """Delete a domain."""
        db = get_db()
        try:
            db.execute('DELETE FROM domains WHERE id = ?', (domain_id,))
            db.commit()
            logger.info(f'[DOMAIN] Deleted domain: {domain_id}')
        except Exception as e:
            logger.error(f'[DOMAIN] Failed to delete domain: {str(e)}')
            db.rollback()
            raise


class User:
    """User model for user management."""
    
    @staticmethod
    def create(username: str, password: str, domain_id: str, 
               first_name: str = '', last_name: str = '', 
               display_name: str = '') -> str:
        """Create a new user."""
        db = get_db()
        user_id = generate_id()
        
        try:
            cursor = db.execute(
                '''INSERT INTO users 
                   (id, username, password, domain_id, first_name, last_name, display_name)
                   VALUES (?, ?, ?, ?, ?, ?, ?)''',
                (user_id, username, password, domain_id, first_name, last_name, display_name)
            )
            db.commit()
            logger.info(f'[USER] Created user: {username} ({user_id})')
            return user_id
        except Exception as e:
            logger.error(f'[USER] Failed to create user: {str(e)}')
            db.rollback()
            raise
    
    @staticmethod
    def get(user_id: str, include_details: bool = True) -> Optional[Dict]:
        """Get user by ID."""
        db = get_db()
        cursor = db.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        row = cursor.fetchone()
        
        if not row:
            return None
        
        user = dict(row)
        
        if include_details:
            # Include emails
            user['emails'] = UserEmail.get_by_user(user_id)
            
            # Include properties
            user['properties'] = UserProperty.get_by_user(user_id)
            
            # Include roles
            user['roles'] = UserRole.get_by_user(user_id)
            
            # Include groups
            user['groups'] = UserGroup.get_by_user(user_id)
        
        return user
    
    @staticmethod
    def get_by_username(username: str, include_details: bool = True) -> Optional[Dict]:
        """Get user by username."""
        db = get_db()
        cursor = db.execute('SELECT * FROM users WHERE username = ?', (username,))
        row = cursor.fetchone()
        
        if not row:
            return None
        
        user = dict(row)
        
        if include_details:
            user['emails'] = UserEmail.get_by_user(user['id'])
            user['properties'] = UserProperty.get_by_user(user['id'])
            user['roles'] = UserRole.get_by_user(user['id'])
            user['groups'] = UserGroup.get_by_user(user['id'])
        
        return user
    
    @staticmethod
    def get_by_email(email: str, include_details: bool = True) -> Optional[Dict]:
        """Get user by primary email."""
        db = get_db()
        cursor = db.execute(
            '''SELECT u.* FROM users u
               JOIN user_emails ue ON u.id = ue.user_id
               WHERE ue.email = ? AND ue.is_primary = 1''',
            (email,)
        )
        row = cursor.fetchone()
        
        if not row:
            return None
        
        user = dict(row)
        
        if include_details:
            user['emails'] = UserEmail.get_by_user(user['id'])
            user['properties'] = UserProperty.get_by_user(user['id'])
            user['roles'] = UserRole.get_by_user(user['id'])
            user['groups'] = UserGroup.get_by_user(user['id'])
        
        return user
    
    @staticmethod
    def list_by_domain(domain_id: str) -> List[Dict]:
        """List users in a domain."""
        db = get_db()
        cursor = db.execute(
            'SELECT * FROM users WHERE domain_id = ? ORDER BY username',
            (domain_id,)
        )
        return [dict(row) for row in cursor.fetchall()]
    
    @staticmethod
    def list_all() -> List[Dict]:
        """List all users."""
        db = get_db()
        cursor = db.execute('SELECT * FROM users ORDER BY username')
        return [dict(row) for row in cursor.fetchall()]
    
    @staticmethod
    def update(user_id: str, **kwargs) -> bool:
        """Update user fields."""
        db = get_db()
        allowed_fields = ['password', 'first_name', 'last_name', 'display_name', 'is_active']
        
        updates = {k: v for k, v in kwargs.items() if k in allowed_fields}
        if not updates:
            return False
        
        try:
            set_clause = ', '.join([f'{k} = ?' for k in updates.keys()])
            values = list(updates.values()) + [user_id]
            
            db.execute(
                f'UPDATE users SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                tuple(values)
            )
            db.commit()
            logger.info(f'[USER] Updated user: {user_id}')
            return True
        except Exception as e:
            logger.error(f'[USER] Failed to update user: {str(e)}')
            db.rollback()
            raise
    
    @staticmethod
    def delete(user_id: str):
        """Delete a user."""
        db = get_db()
        try:
            db.execute('DELETE FROM users WHERE id = ?', (user_id,))
            db.commit()
            logger.info(f'[USER] Deleted user: {user_id}')
        except Exception as e:
            logger.error(f'[USER] Failed to delete user: {str(e)}')
            db.rollback()
            raise
    
    @staticmethod
    def validate_credentials(username: str, password: str) -> Optional[Dict]:
        """Validate user credentials."""
        user = User.get_by_username(username, include_details=False)
        
        if not user or user.get('password') != password or not user.get('is_active'):
            logger.warning(f'[AUTH] Invalid credentials for user: {username}')
            return None
        
        logger.info(f'[AUTH] User validated: {username}')
        return user


class UserEmail:
    """User email model - support multiple emails per user."""
    
    @staticmethod
    def add(user_id: str, email: str, is_primary: bool = False) -> str:
        """Add email to user."""
        db = get_db()
        email_id = generate_id()
        
        try:
            # If this is primary, unset other primary emails
            if is_primary:
                db.execute(
                    'UPDATE user_emails SET is_primary = 0 WHERE user_id = ?',
                    (user_id,)
                )
            
            cursor = db.execute(
                '''INSERT INTO user_emails (id, user_id, email, is_primary)
                   VALUES (?, ?, ?, ?)''',
                (email_id, user_id, email, 1 if is_primary else 0)
            )
            db.commit()
            logger.info(f'[EMAIL] Added email to user {user_id}: {email}')
            return email_id
        except Exception as e:
            logger.error(f'[EMAIL] Failed to add email: {str(e)}')
            db.rollback()
            raise
    
    @staticmethod
    def get_by_user(user_id: str) -> List[Dict]:
        """Get all emails for a user."""
        db = get_db()
        cursor = db.execute(
            'SELECT * FROM user_emails WHERE user_id = ? ORDER BY is_primary DESC, created_at',
            (user_id,)
        )
        return [dict(row) for row in cursor.fetchall()]
    
    @staticmethod
    def verify(email_id: str):
        """Mark email as verified."""
        db = get_db()
        try:
            db.execute(
                '''UPDATE user_emails 
                   SET is_verified = 1, verified_at = CURRENT_TIMESTAMP
                   WHERE id = ?''',
                (email_id,)
            )
            db.commit()
            logger.info(f'[EMAIL] Verified email: {email_id}')
        except Exception as e:
            logger.error(f'[EMAIL] Failed to verify email: {str(e)}')
            db.rollback()
            raise
    
    @staticmethod
    def delete(email_id: str):
        """Delete an email."""
        db = get_db()
        try:
            db.execute('DELETE FROM user_emails WHERE id = ?', (email_id,))
            db.commit()
            logger.info(f'[EMAIL] Deleted email: {email_id}')
        except Exception as e:
            logger.error(f'[EMAIL] Failed to delete email: {str(e)}')
            db.rollback()
            raise


class UserProperty:
    """User property model - flexible key-value store."""
    
    @staticmethod
    def set(user_id: str, key: str, value: Any) -> str:
        """Set a user property."""
        db = get_db()
        prop_id = generate_id()
        value_str = json.dumps(value) if not isinstance(value, str) else value
        
        try:
            # Try update first
            cursor = db.execute(
                'SELECT id FROM user_properties WHERE user_id = ? AND key = ?',
                (user_id, key)
            )
            existing = cursor.fetchone()
            
            if existing:
                db.execute(
                    '''UPDATE user_properties 
                       SET value = ?, updated_at = CURRENT_TIMESTAMP
                       WHERE user_id = ? AND key = ?''',
                    (value_str, user_id, key)
                )
                prop_id = existing[0]
            else:
                db.execute(
                    '''INSERT INTO user_properties (id, user_id, key, value)
                       VALUES (?, ?, ?, ?)''',
                    (prop_id, user_id, key, value_str)
                )
            
            db.commit()
            logger.info(f'[PROPERTY] Set property for user {user_id}: {key}')
            return prop_id
        except Exception as e:
            logger.error(f'[PROPERTY] Failed to set property: {str(e)}')
            db.rollback()
            raise
    
    @staticmethod
    def get(user_id: str, key: str) -> Any:
        """Get a user property."""
        db = get_db()
        cursor = db.execute(
            'SELECT value FROM user_properties WHERE user_id = ? AND key = ?',
            (user_id, key)
        )
        row = cursor.fetchone()
        
        if not row:
            return None
        
        try:
            return json.loads(row[0])
        except:
            return row[0]
    
    @staticmethod
    def get_by_user(user_id: str) -> Dict[str, Any]:
        """Get all properties for a user."""
        db = get_db()
        cursor = db.execute(
            'SELECT key, value FROM user_properties WHERE user_id = ?',
            (user_id,)
        )
        
        properties = {}
        for row in cursor.fetchall():
            key, value = row
            try:
                properties[key] = json.loads(value)
            except:
                properties[key] = value
        
        return properties
    
    @staticmethod
    def delete(user_id: str, key: str):
        """Delete a user property."""
        db = get_db()
        try:
            db.execute(
                'DELETE FROM user_properties WHERE user_id = ? AND key = ?',
                (user_id, key)
            )
            db.commit()
            logger.info(f'[PROPERTY] Deleted property for user {user_id}: {key}')
        except Exception as e:
            logger.error(f'[PROPERTY] Failed to delete property: {str(e)}')
            db.rollback()
            raise


class Role:
    """Role model for user roles."""
    
    @staticmethod
    def create(name: str, description: str = '') -> str:
        """Create a new role."""
        db = get_db()
        role_id = generate_id()
        
        try:
            db.execute(
                '''INSERT INTO roles (id, name, description)
                   VALUES (?, ?, ?)''',
                (role_id, name, description)
            )
            db.commit()
            logger.info(f'[ROLE] Created role: {name}')
            return role_id
        except Exception as e:
            logger.error(f'[ROLE] Failed to create role: {str(e)}')
            db.rollback()
            raise
    
    @staticmethod
    def get(role_id: str) -> Optional[Dict]:
        """Get role by ID."""
        db = get_db()
        cursor = db.execute('SELECT * FROM roles WHERE id = ?', (role_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
    
    @staticmethod
    def list_all() -> List[Dict]:
        """List all roles."""
        db = get_db()
        cursor = db.execute('SELECT * FROM roles ORDER BY name')
        return [dict(row) for row in cursor.fetchall()]
    
    @staticmethod
    def delete(role_id: str):
        """Delete a role."""
        db = get_db()
        try:
            db.execute('DELETE FROM roles WHERE id = ?', (role_id,))
            db.commit()
            logger.info(f'[ROLE] Deleted role: {role_id}')
        except Exception as e:
            logger.error(f'[ROLE] Failed to delete role: {str(e)}')
            db.rollback()
            raise


class UserRole:
    """User role assignment model."""
    
    @staticmethod
    def assign(user_id: str, role_id: str):
        """Assign a role to a user."""
        db = get_db()
        assignment_id = generate_id()
        
        try:
            db.execute(
                '''INSERT INTO user_roles (id, user_id, role_id)
                   VALUES (?, ?, ?)''',
                (assignment_id, user_id, role_id)
            )
            db.commit()
            logger.info(f'[USER_ROLE] Assigned role {role_id} to user {user_id}')
        except Exception as e:
            logger.error(f'[USER_ROLE] Failed to assign role: {str(e)}')
            db.rollback()
            raise
    
    @staticmethod
    def get_by_user(user_id: str) -> List[Dict]:
        """Get all roles for a user."""
        db = get_db()
        cursor = db.execute(
            '''SELECT r.* FROM roles r
               JOIN user_roles ur ON r.id = ur.role_id
               WHERE ur.user_id = ?
               ORDER BY r.name''',
            (user_id,)
        )
        return [dict(row) for row in cursor.fetchall()]
    
    @staticmethod
    def remove(user_id: str, role_id: str):
        """Remove a role from a user."""
        db = get_db()
        try:
            db.execute(
                'DELETE FROM user_roles WHERE user_id = ? AND role_id = ?',
                (user_id, role_id)
            )
            db.commit()
            logger.info(f'[USER_ROLE] Removed role {role_id} from user {user_id}')
        except Exception as e:
            logger.error(f'[USER_ROLE] Failed to remove role: {str(e)}')
            db.rollback()
            raise


class Group:
    """Group model for user groups."""
    
    @staticmethod
    def create(name: str, domain_id: str, description: str = '') -> str:
        """Create a new group."""
        db = get_db()
        group_id = generate_id()
        
        try:
            db.execute(
                '''INSERT INTO groups (id, name, domain_id, description)
                   VALUES (?, ?, ?, ?)''',
                (group_id, name, domain_id, description)
            )
            db.commit()
            logger.info(f'[GROUP] Created group: {name}')
            return group_id
        except Exception as e:
            logger.error(f'[GROUP] Failed to create group: {str(e)}')
            db.rollback()
            raise
    
    @staticmethod
    def get(group_id: str) -> Optional[Dict]:
        """Get group by ID."""
        db = get_db()
        cursor = db.execute('SELECT * FROM groups WHERE id = ?', (group_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
    
    @staticmethod
    def list_by_domain(domain_id: str) -> List[Dict]:
        """List groups in a domain."""
        db = get_db()
        cursor = db.execute(
            'SELECT * FROM groups WHERE domain_id = ? ORDER BY name',
            (domain_id,)
        )
        return [dict(row) for row in cursor.fetchall()]
    
    @staticmethod
    def list_all() -> List[Dict]:
        """List all groups."""
        db = get_db()
        cursor = db.execute('SELECT * FROM groups ORDER BY name')
        return [dict(row) for row in cursor.fetchall()]
    
    @staticmethod
    def delete(group_id: str):
        """Delete a group."""
        db = get_db()
        try:
            db.execute('DELETE FROM groups WHERE id = ?', (group_id,))
            db.commit()
            logger.info(f'[GROUP] Deleted group: {group_id}')
        except Exception as e:
            logger.error(f'[GROUP] Failed to delete group: {str(e)}')
            db.rollback()
            raise


class UserGroup:
    """User group membership model."""
    
    @staticmethod
    def add(user_id: str, group_id: str):
        """Add a user to a group."""
        db = get_db()
        membership_id = generate_id()
        
        try:
            db.execute(
                '''INSERT INTO user_groups (id, user_id, group_id)
                   VALUES (?, ?, ?)''',
                (membership_id, user_id, group_id)
            )
            db.commit()
            logger.info(f'[USER_GROUP] Added user {user_id} to group {group_id}')
        except Exception as e:
            logger.error(f'[USER_GROUP] Failed to add user to group: {str(e)}')
            db.rollback()
            raise
    
    @staticmethod
    def get_by_user(user_id: str) -> List[Dict]:
        """Get all groups for a user."""
        db = get_db()
        cursor = db.execute(
            '''SELECT g.* FROM groups g
               JOIN user_groups ug ON g.id = ug.group_id
               WHERE ug.user_id = ?
               ORDER BY g.name''',
            (user_id,)
        )
        return [dict(row) for row in cursor.fetchall()]
    
    @staticmethod
    def get_by_group(group_id: str) -> List[Dict]:
        """Get all users in a group."""
        db = get_db()
        cursor = db.execute(
            '''SELECT u.* FROM users u
               JOIN user_groups ug ON u.id = ug.user_id
               WHERE ug.group_id = ?
               ORDER BY u.username''',
            (group_id,)
        )
        return [dict(row) for row in cursor.fetchall()]
    
    @staticmethod
    def remove(user_id: str, group_id: str):
        """Remove a user from a group."""
        db = get_db()
        try:
            db.execute(
                'DELETE FROM user_groups WHERE user_id = ? AND group_id = ?',
                (user_id, group_id)
            )
            db.commit()
            logger.info(f'[USER_GROUP] Removed user {user_id} from group {group_id}')
        except Exception as e:
            logger.error(f'[USER_GROUP] Failed to remove user from group: {str(e)}')
            db.rollback()
            raise


class AuditLog:
    """Audit log model for tracking changes."""
    
    @staticmethod
    def log(entity_type: str, entity_id: str, action: str, 
            changes: Dict = None, performed_by: str = None,
            ip_address: str = None, user_agent: str = None):
        """Log an audit entry."""
        db = get_db()
        log_id = generate_id()
        changes_json = json.dumps(changes) if changes else None
        
        try:
            db.execute(
                '''INSERT INTO audit_logs 
                   (id, entity_type, entity_id, action, changes, performed_by, ip_address, user_agent)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                (log_id, entity_type, entity_id, action, changes_json, performed_by, ip_address, user_agent)
            )
            db.commit()
            logger.info(f'[AUDIT] {entity_type} {entity_id}: {action}')
        except Exception as e:
            logger.error(f'[AUDIT] Failed to log audit entry: {str(e)}')
            db.rollback()
    
    @staticmethod
    def get_for_entity(entity_type: str, entity_id: str, limit: int = 100) -> List[Dict]:
        """Get audit log entries for an entity."""
        db = get_db()
        cursor = db.execute(
            '''SELECT * FROM audit_logs 
               WHERE entity_type = ? AND entity_id = ?
               ORDER BY created_at DESC
               LIMIT ?''',
            (entity_type, entity_id, limit)
        )
        return [dict(row) for row in cursor.fetchall()]
    
    @staticmethod
    def get_all(limit: int = 1000, offset: int = 0) -> List[Dict]:
        """Get all audit log entries."""
        db = get_db()
        cursor = db.execute(
            '''SELECT * FROM audit_logs
               ORDER BY created_at DESC
               LIMIT ? OFFSET ?''',
            (limit, offset)
        )
        return [dict(row) for row in cursor.fetchall()]
