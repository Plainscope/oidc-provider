"""User role assignment model."""
import logging
from typing import List, Dict

from database import get_db

logger = logging.getLogger('remote-directory')


def generate_id() -> str:
    """Generate a unique ID."""
    import uuid
    return str(uuid.uuid4())


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
