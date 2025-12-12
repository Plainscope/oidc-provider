"""
SQLite database layer for user management.
Provides database initialization, schema creation, and connection management.
Uses Flask's g object for thread-safe per-request database connections.
"""
import sqlite3
import os
from pathlib import Path
from typing import Optional
import logging

logger = logging.getLogger('remote-directory')


class Database:
    """SQLite database wrapper for user management.
    
    Implements per-request connections using Flask's g object for thread safety.
    Each request gets its own database connection, preventing race conditions
    and database corruption in multi-threaded environments.
    """
    
    def __init__(self, db_path: str = None):
        """Initialize database configuration (not connection)."""
        if db_path is None:
            db_path = os.environ.get('DATABASE_FILE', '/app/data/users.db')
        
        self.db_path = db_path
        self._ensure_db_dir()
        self._initialize_schema()
    
    def _ensure_db_dir(self):
        """Ensure database directory exists."""
        db_dir = os.path.dirname(self.db_path)
        if db_dir and not Path(db_dir).exists():
            Path(db_dir).mkdir(parents=True, exist_ok=True)
            logger.info(f'[DB] Created database directory: {db_dir}')
    
    def _connect(self):
        """Create a new database connection for the current request."""
        try:
            connection = sqlite3.connect(self.db_path, check_same_thread=True)
            connection.row_factory = sqlite3.Row
            # Enable foreign keys
            connection.execute('PRAGMA foreign_keys = ON')
            logger.debug(f'[DB] Created connection for request: {self.db_path}')
            return connection
        except Exception as e:
            logger.error(f'[DB] Failed to create connection: {str(e)}')
            raise
    
    def get_connection(self):
        """Get per-request database connection using Flask's g object."""
        from flask import g
        
        if 'db' not in g:
            g.db = self._connect()
        return g.db
    
    def _initialize_schema(self):
        """Initialize database schema if not exists."""
        try:
            # Use a dedicated connection just for schema initialization
            conn = sqlite3.connect(self.db_path, check_same_thread=True)
            conn.row_factory = sqlite3.Row
            conn.execute('PRAGMA foreign_keys = ON')
            cursor = conn.cursor()
            
            # Domains table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS domains (
                    id TEXT PRIMARY KEY,
                    name TEXT UNIQUE NOT NULL CHECK(length(trim(name)) > 0),
                    description TEXT,
                    is_default BOOLEAN DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Users table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL CHECK(length(trim(username)) > 0),
                    password TEXT NOT NULL CHECK(length(trim(password)) > 0),
                    first_name TEXT,
                    last_name TEXT,
                    display_name TEXT,
                    domain_id TEXT NOT NULL,
                    is_active BOOLEAN DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE RESTRICT
                )
            ''')
            
            # User emails table (support multiple emails per user)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS user_emails (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL CHECK(length(trim(email)) > 0),
                    is_primary BOOLEAN DEFAULT 0,
                    is_verified BOOLEAN DEFAULT 0,
                    verified_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            ''')
            
            # User properties table (flexible key-value store)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS user_properties (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    key TEXT NOT NULL,
                    value TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, key),
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            ''')
            
            # Roles table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS roles (
                    id TEXT PRIMARY KEY,
                    name TEXT UNIQUE NOT NULL CHECK(length(trim(name)) > 0),
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # User roles table (junction table for many-to-many)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS user_roles (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    role_id TEXT NOT NULL,
                    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, role_id),
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
                )
            ''')
            
            # Groups table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS groups (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL CHECK(length(trim(name)) > 0),
                    description TEXT,
                    domain_id TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(name, domain_id),
                    FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
                )
            ''')
            
            # User groups table (junction table for many-to-many)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS user_groups (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    group_id TEXT NOT NULL,
                    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, group_id),
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
                )
            ''')
            
            # Audit log table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id TEXT PRIMARY KEY,
                    entity_type TEXT NOT NULL,
                    entity_id TEXT NOT NULL,
                    action TEXT NOT NULL,
                    changes TEXT,
                    performed_by TEXT,
                    ip_address TEXT,
                    user_agent TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            conn.commit()
            conn.close()
            logger.info('[DB] Database schema initialized successfully')
        except Exception as e:
            logger.error(f'[DB] Failed to initialize schema: {str(e)}')
            raise
    
    def execute(self, query: str, params: tuple = ()) -> sqlite3.Cursor:
        """Execute a database query on the per-request connection."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute(query, params)
            return cursor
        except Exception as e:
            logger.error(f'[DB] Query execution failed: {str(e)}')
            raise
    
    def commit(self):
        """Commit transaction on the per-request connection."""
        from flask import g
        if 'db' in g:
            g.db.commit()
    
    def rollback(self):
        """Rollback transaction on the per-request connection."""
        from flask import g
        if 'db' in g:
            g.db.rollback()


# Global database configuration instance
_db_instance: Optional[Database] = None


def get_db() -> Database:
    """Get or create global database configuration instance.
    
    Note: This returns the Database configuration, not a connection.
    Actual connections are created per-request and stored in Flask's g object.
    """
    global _db_instance
    if _db_instance is None:
        _db_instance = Database()
    return _db_instance


def close_db(e=None):
    """Close per-request database connection."""
    from flask import g
    db = g.pop('db', None)
    if db is not None:
        db.close()
        logger.debug('[DB] Per-request connection closed')


def init_schema():
    """Initialize database schema (wrapper for compatibility).
    
    The schema is automatically initialized when the Database instance is created.
    This function ensures the database is ready and can be called explicitly.
    """
    db = get_db()
    # Schema is already initialized in Database.__init__
    return db

