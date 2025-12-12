"""Audit log model for tracking entity changes."""
import logging
import json
from typing import Dict, List

from database import get_db

logger = logging.getLogger('remote-directory')


def generate_id() -> str:
    """Generate a unique ID."""
    import uuid
    return str(uuid.uuid4())


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
