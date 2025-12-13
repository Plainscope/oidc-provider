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
        # Identity
        {'key': 'first_name', 'description': 'First name', 'category': 'identity'},
        {'key': 'last_name', 'description': 'Last name', 'category': 'identity'},
        {'key': 'user_type', 'description': 'User type', 'category': 'identity'},
        {'key': 'authorization_info', 'description': 'Authorization info', 'category': 'identity'},
        # Job Information
        {'key': 'job_title', 'description': 'Job title', 'category': 'job'},
        {'key': 'company_name', 'description': 'Company name', 'category': 'job'},
        {'key': 'department', 'description': 'Department', 'category': 'job'},
        {'key': 'employee_id', 'description': 'Employee ID', 'category': 'job'},
        {'key': 'employee_type', 'description': 'Employee type', 'category': 'job'},
        {'key': 'employee_hire_date', 'description': 'Employee hire date', 'category': 'job'},
        {'key': 'office_location', 'description': 'Office location', 'category': 'job'},
        {'key': 'manager', 'description': 'Manager', 'category': 'job'},
        # Contact Information
        {'key': 'street_address', 'description': 'Street address', 'category': 'contact'},
        {'key': 'city', 'description': 'City', 'category': 'contact'},
        {'key': 'state_or_province', 'description': 'State or province', 'category': 'contact'},
        {'key': 'zip_or_postal_code', 'description': 'ZIP or postal code', 'category': 'contact'},
        {'key': 'country_or_region', 'description': 'Country or region', 'category': 'contact'},
        {'key': 'business_phone', 'description': 'Business phone', 'category': 'contact'},
        {'key': 'mobile_phone', 'description': 'Mobile phone', 'category': 'contact'},
        {'key': 'email', 'description': 'Email', 'category': 'contact'},
        {'key': 'fax_number', 'description': 'Fax number', 'category': 'contact'},
        # Parental controls
        {'key': 'age_group', 'description': 'Age group', 'category': 'parental'},
        {'key': 'consent_provided_for_minor', 'description': 'Consent provided for minor', 'category': 'parental'},
        # Settings
        {'key': 'usage_location', 'description': 'Usage location', 'category': 'settings'},
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
