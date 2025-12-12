"""
Database initialization and seeding for development and testing.
Provides functions to populate the database with sample data.
"""
import os
import json
from pathlib import Path
from database import init_schema
from models import (
    Domain, User, UserEmail, UserProperty, Role, UserRole
)
import logging
import bcrypt

logger = logging.getLogger('remote-directory')


def init_default_domain():
    """Create default domain if it doesn't exist."""
    default_domain = Domain.get_by_name('localhost')
    if not default_domain:
        domain_id = Domain.create(
            name='localhost',
            description='Default localhost domain',
            is_default=True
        )
        logger.info('[INIT] Created default domain: localhost')
        return domain_id
    return default_domain['id']


def init_default_roles():
    """Create default roles if they don't exist."""
    roles = {
        'admin': 'Administrator with full access',
        'user': 'Standard user',
        'guest': 'Guest user with limited access'
    }
    
    role_ids = {}
    for name, description in roles.items():
        existing = Role.get_by_name(name)
        if not existing:
            role_id = Role.create(name, description)
            role_ids[name] = role_id
            logger.info(f'[INIT] Created role: {name}')
        else:
            role_ids[name] = existing['id']
    
    return role_ids


def init_seed_data(users_file: str = None):
    """Initialize database with seed data from users.json file."""
    # Load or locate users file
    if users_file is None:
        # Try multiple locations
        possible_paths = [
            '/app/config/users.json',
            '/app/docker/provider/users.json',
            os.path.join(os.path.dirname(__file__), '../../../docker/provider/users.json'),
        ]
        
        for path in possible_paths:
            if Path(path).exists():
                users_file = path
                break
    
    if not users_file or not Path(users_file).exists():
        logger.warning('[INIT] Users file not found, skipping seed data')
        return False
    
    try:
        with open(users_file, 'r') as f:
            users_data = json.load(f)
        
        # Initialize default domain and roles
        domain_id = init_default_domain()
        role_ids = init_default_roles()
        
        # Seed users
        for user_data in users_data:
            # Prepare username and email
            username = user_data.get('email', user_data.get('preferred_username', ''))
            email = user_data.get('email', '')

            # Check if user already exists by username or email
            existing_by_username = User.get_by_username(username, include_details=False) if username else None
            existing_by_email = User.get_by_email(email, include_details=False) if email else None
            if existing_by_username or existing_by_email:
                logger.info(f'[INIT] User already exists: {email or username}')
                continue
            
            # Create user
            password = user_data.get('password', 'ChangeMe123!')
            # Hash password using bcrypt, consistent with API user creation
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            first_name = user_data.get('given_name', '')
            last_name = user_data.get('family_name', '')
            display_name = user_data.get('name', f'{first_name} {last_name}'.strip())
            
            user_id = User.create(
                username=username,
                password=hashed_password,
                domain_id=domain_id,
                first_name=first_name,
                last_name=last_name,
                display_name=display_name
            )
            
            # Add emails
            if 'email' in user_data:
                UserEmail.add(user_id, user_data['email'], is_primary=True)
            
            # Add properties from OIDC profile
            oidc_properties = [
                'address', 'birthdate', 'email_verified', 'gender', 'locale',
                'middle_name', 'nickname', 'phone_number', 'phone_number_verified',
                'picture', 'profile', 'updated_at', 'website', 'zoneinfo'
            ]
            
            for prop_key in oidc_properties:
                if prop_key in user_data:
                    UserProperty.set(user_id, prop_key, user_data[prop_key])
            
            # Assign admin role to admin user
            if username == 'admin@localhost':
                UserRole.assign(user_id, role_ids['admin'])
                logger.info(f'[INIT] Assigned admin role to {username}')
            else:
                UserRole.assign(user_id, role_ids['user'])
            
            logger.info(f'[INIT] Seeded user: {username}')
        
        return True
    except Exception as e:
        logger.error(f'[INIT] Failed to seed data: {str(e)}')
        return False


def init_database():
    """Perform full database initialization."""
    logger.info('[INIT] Starting database initialization')
    
    try:
        # Initialize schema
        init_schema()
        
        # Initialize default domain
        init_default_domain()
        
        # Initialize default roles
        init_default_roles()
        
        # Try to seed data from users.json
        init_seed_data()
        
        logger.info('[INIT] Database initialization completed successfully')
        return True
    except Exception as e:
        logger.error(f'[INIT] Database initialization failed: {str(e)}')
        return False

