"""User property model for flexible key-value storage."""
import logging
import json
from typing import Any, Dict

from database import get_db

logger = logging.getLogger('remote-directory')


def generate_id() -> str:
    """Generate a unique ID."""
    import uuid
    return str(uuid.uuid4())


class UserProperty:
    """User property model - flexible key-value store."""
    
    @staticmethod
    def set(user_id: str, key: str, value: Any) -> str:
        """Set a user property."""
        db = get_db()
        prop_id = generate_id()
        value_str = json.dumps(value) if not isinstance(value, str) else value
        
        try:
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
