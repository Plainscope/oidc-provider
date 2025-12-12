"""Role model for managing user roles."""
import logging
from typing import Optional, List, Dict

from database import get_db

logger = logging.getLogger('remote-directory')


def generate_id() -> str:
    """Generate a unique ID."""
    import uuid
    return str(uuid.uuid4())


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
    def get_by_name(name: str) -> Optional[Dict]:
        """Get role by name."""
        db = get_db()
        cursor = db.execute('SELECT * FROM roles WHERE name = ?', (name,))
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
