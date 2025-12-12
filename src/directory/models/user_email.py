"""User email model for managing multiple emails per user."""
import logging
from typing import List, Dict

from database import get_db

logger = logging.getLogger('remote-directory')


def generate_id() -> str:
    """Generate a unique ID."""
    import uuid
    return str(uuid.uuid4())


class UserEmail:
    """User email model - support multiple emails per user."""
    
    @staticmethod
    def add(user_id: str, email: str, is_primary: bool = False) -> str:
        """Add email to user."""
        db = get_db()
        email_id = generate_id()
        
        try:
            if is_primary:
                db.execute(
                    'UPDATE user_emails SET is_primary = 0 WHERE user_id = ?',
                    (user_id,)
                )
            
            db.execute(
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
