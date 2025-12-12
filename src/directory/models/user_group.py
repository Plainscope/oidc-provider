"""User group membership model."""
import logging
from typing import List, Dict

from database import get_db

logger = logging.getLogger('remote-directory')


def generate_id() -> str:
    """Generate a unique ID."""
    import uuid
    return str(uuid.uuid4())


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
