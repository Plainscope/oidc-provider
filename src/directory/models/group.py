"""Group model for managing user groups."""
import logging
from typing import Optional, List, Dict

from database import get_db

logger = logging.getLogger('remote-directory')


def generate_id() -> str:
    """Generate a unique ID."""
    import uuid
    return str(uuid.uuid4())


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
    def get_by_name(name: str, domain_id: str = None) -> Optional[Dict]:
        """Get group by name, optionally within a domain."""
        db = get_db()
        if domain_id:
            cursor = db.execute(
                'SELECT * FROM groups WHERE name = ? AND domain_id = ?',
                (name, domain_id)
            )
        else:
            cursor = db.execute('SELECT * FROM groups WHERE name = ?', (name,))
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
