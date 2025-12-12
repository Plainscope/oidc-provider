"""Domain model for managing user organizations/domains."""
import logging
from typing import Optional, List, Dict

from database import get_db

logger = logging.getLogger('remote-directory')


def generate_id() -> str:
    """Generate a unique ID."""
    import uuid
    return str(uuid.uuid4())


class Domain:
    """Domain model for user organizations/domains."""
    
    @staticmethod
    def create(name: str, description: str = '', is_default: bool = False) -> str:
        """Create a new domain."""
        db = get_db()
        domain_id = generate_id()
        
        try:
            db.execute(
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
