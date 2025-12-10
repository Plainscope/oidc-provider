"""
SQLite database layer for user management.
Provides database initialization, schema creation, and connection management.
"""
import sqlite3
import os
import json
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime
import logging

logger = logging.getLogger('remote-directory')


class Database:
    """SQLite database wrapper for user management."""
    
    def __init__(self, db_path: str = None):
        """Initialize database connection."""
        if db_path is None:
            db_path = os.environ.get('DB_PATH', '/app/data/users.db')
        
        self.db_path = db_path
        self._ensure_db_dir()
        self.connection = None
        self._connect()
        self._initialize_schema()
    
    def _ensure_db_dir(self):
        """Ensure database directory exists."""
        db_dir = os.path.dirname(self.db_path)
        if db_dir and not Path(db_dir).exists():
            Path(db_dir).mkdir(parents=True, exist_ok=True)
            logger.info(f'[DB] Created database directory: {db_dir}')
    
    def _connect(self):
        """Create database connection."""
        try:
            self.connection = sqlite3.connect(self.db_path, check_same_thread=False)
            self.connection.row_factory = sqlite3.Row
            # Enable foreign keys
            self.connection.execute('PRAGMA foreign_keys = ON')
            logger.info(f'[DB] Connected to database: {self.db_path}')
        except Exception as e:
            logger.error(f'[DB] Failed to connect to database: {str(e)}')
            raise
    
    def _initialize_schema(self):
        """Initialize database schema if not exists."""
        try:
            cursor = self.connection.cursor()
            
            # Domains table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS domains (
                    id TEXT PRIMARY KEY,
                    name TEXT UNIQUE NOT NULL,
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
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
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
                    email TEXT UNIQUE NOT NULL,
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
                    name TEXT UNIQUE NOT NULL,
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
                    name TEXT UNIQUE NOT NULL,
                    description TEXT,
                    domain_id TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
            
            self.connection.commit()
            logger.info('[DB] Database schema initialized successfully')
        except Exception as e:
            logger.error(f'[DB] Failed to initialize schema: {str(e)}')
            raise
    
    def close(self):
        """Close database connection."""
        if self.connection:
            self.connection.close()
            logger.info('[DB] Database connection closed')
    
    def execute(self, query: str, params: tuple = ()) -> sqlite3.Cursor:
        """Execute a database query."""
        try:
            cursor = self.connection.cursor()
            cursor.execute(query, params)
            return cursor
        except Exception as e:
            logger.error(f'[DB] Query execution failed: {str(e)}')
            raise
    
    def commit(self):
        """Commit transaction."""
        self.connection.commit()
    
    def rollback(self):
        """Rollback transaction."""
        self.connection.rollback()


# Global database instance
_db_instance: Optional[Database] = None


def get_db() -> Database:
    """Get or create global database instance."""
    global _db_instance
    if _db_instance is None:
        _db_instance = Database()
    return _db_instance


def close_db():
    """Close global database instance."""
    global _db_instance
    if _db_instance:
        _db_instance.close()
        _db_instance = None
