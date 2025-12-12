"""Property key reference model for consistent user properties."""
import logging
from typing import List, Dict

from database import get_db

logger = logging.getLogger('remote-directory')


def generate_id() -> str:
    """Generate a unique ID."""
    import uuid
    return str(uuid.uuid4())


class PropertyKey:
    """Property key reference model."""
    
    # Predefined standard property keys
    STANDARD_KEYS = [
        {'key': 'department', 'description': 'Department or team', 'category': 'organization'},
        {'key': 'location', 'description': 'Office location or timezone', 'category': 'organization'},
        {'key': 'title', 'description': 'Job title', 'category': 'organization'},
        {'key': 'manager', 'description': 'Manager or supervisor', 'category': 'organization'},
        {'key': 'phone', 'description': 'Phone number', 'category': 'contact'},
        {'key': 'mobile', 'description': 'Mobile phone number', 'category': 'contact'},
        {'key': 'employee_id', 'description': 'Employee ID', 'category': 'identity'},
        {'key': 'cost_center', 'description': 'Cost center code', 'category': 'organization'},
        {'key': 'start_date', 'description': 'Start date', 'category': 'employment'},
        {'key': 'end_date', 'description': 'End date', 'category': 'employment'},
    ]
    
    @staticmethod
    def list_all() -> List[Dict]:
        """Get all property keys (both standard and custom)."""
        db = get_db()
        
        # Get custom keys from database
        cursor = db.execute(
            '''SELECT DISTINCT key 
               FROM user_properties 
               ORDER BY key'''
        )
        custom_keys = [{'key': row[0], 'description': 'Custom property', 'category': 'custom'} 
                      for row in cursor.fetchall()]
        
        # Combine standard and custom keys, removing duplicates
        all_keys = PropertyKey.STANDARD_KEYS.copy()
        standard_key_names = {k['key'] for k in PropertyKey.STANDARD_KEYS}
        
        for custom in custom_keys:
            if custom['key'] not in standard_key_names:
                all_keys.append(custom)
        
        return sorted(all_keys, key=lambda x: x['key'])
    
    @staticmethod
    def list_standard() -> List[Dict]:
        """Get only standard/predefined property keys."""
        return PropertyKey.STANDARD_KEYS
    
    @staticmethod
    def get_categories() -> List[str]:
        """Get list of property categories."""
        categories = set(k['category'] for k in PropertyKey.STANDARD_KEYS)
        return sorted(list(categories))
