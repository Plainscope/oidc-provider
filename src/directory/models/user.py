"""User model for managing user accounts."""
import logging
from typing import Optional, List, Dict

from database import get_db
from models.user_email import UserEmail
from models.user_property import UserProperty
from models.user_role import UserRole
from models.user_group import UserGroup

logger = logging.getLogger('remote-directory')


def generate_id() -> str:
    """Generate a unique ID."""
    import uuid
    return str(uuid.uuid4())


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
            db.execute(
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
            user['emails'] = UserEmail.get_by_user(user_id)
            user['properties'] = UserProperty.get_by_user(user_id)
            user['roles'] = UserRole.get_by_user(user_id)
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
