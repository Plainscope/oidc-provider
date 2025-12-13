#!/usr/bin/env python3
"""
Database migration script to add CHECK constraints for non-empty name fields.
This script recreates tables with CHECK constraints while preserving all data.

Usage:
    python migrate_constraints.py [--db-path /path/to/users.db]

Note: This creates a backup of the original database before migration.
"""
import sqlite3
import os
import shutil
import argparse
from datetime import datetime


def backup_database(db_path: str) -> str:
    """Create a backup of the database."""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = f"{db_path}.backup_{timestamp}"
    shutil.copy2(db_path, backup_path)
    print(f"✓ Created backup: {backup_path}")
    return backup_path


def migrate_database(db_path: str):
    """Apply CHECK constraints to existing database."""
    print(f"\nMigrating database: {db_path}")
    
    if not os.path.exists(db_path):
        print(f"✗ Database not found: {db_path}")
        return
    
    # Create backup
    backup_path = backup_database(db_path)
    
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Enable foreign keys
        cursor.execute('PRAGMA foreign_keys = OFF')
        
        print("\n1. Migrating domains table...")
        # Migrate domains table
        cursor.execute('SELECT * FROM domains')
        domains_data = cursor.fetchall()
        
        cursor.execute('DROP TABLE IF EXISTS domains_new')
        cursor.execute('''
            CREATE TABLE domains_new (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL CHECK(length(trim(name)) > 0),
                description TEXT,
                is_default BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        for row in domains_data:
            cursor.execute('''
                INSERT INTO domains_new (id, name, description, is_default, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (row['id'], row['name'], row['description'], row['is_default'], 
                  row['created_at'], row['updated_at']))
        
        cursor.execute('DROP TABLE domains')
        cursor.execute('ALTER TABLE domains_new RENAME TO domains')
        print(f"  ✓ Migrated {len(domains_data)} domains")
        
        print("\n2. Migrating roles table...")
        # Migrate roles table
        cursor.execute('SELECT * FROM roles')
        roles_data = cursor.fetchall()
        
        cursor.execute('DROP TABLE IF EXISTS roles_new')
        cursor.execute('''
            CREATE TABLE roles_new (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL CHECK(length(trim(name)) > 0),
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        for row in roles_data:
            cursor.execute('''
                INSERT INTO roles_new (id, name, description, created_at)
                VALUES (?, ?, ?, ?)
            ''', (row['id'], row['name'], row['description'], row['created_at']))
        
        cursor.execute('DROP TABLE roles')
        cursor.execute('ALTER TABLE roles_new RENAME TO roles')
        print(f"  ✓ Migrated {len(roles_data)} roles")
        
        print("\n3. Migrating groups table...")
        # Migrate groups table
        cursor.execute('SELECT * FROM groups')
        groups_data = cursor.fetchall()
        
        cursor.execute('DROP TABLE IF EXISTS groups_new')
        cursor.execute('''
            CREATE TABLE groups_new (
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
        
        for row in groups_data:
            cursor.execute('''
                INSERT INTO groups_new (id, name, description, domain_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (row['id'], row['name'], row['description'], row['domain_id'],
                  row['created_at'], row['updated_at']))
        
        cursor.execute('DROP TABLE groups')
        cursor.execute('ALTER TABLE groups_new RENAME TO groups')
        print(f"  ✓ Migrated {len(groups_data)} groups")
        
        print("\n4. Migrating users table...")
        # Migrate users table
        cursor.execute('SELECT * FROM users')
        users_data = cursor.fetchall()
        
        cursor.execute('DROP TABLE IF EXISTS users_new')
        cursor.execute('''
            CREATE TABLE users_new (
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
        
        for row in users_data:
            cursor.execute('''
                INSERT INTO users_new (id, username, password, first_name, last_name, 
                                      display_name, domain_id, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (row['id'], row['username'], row['password'], row['first_name'],
                  row['last_name'], row['display_name'], row['domain_id'],
                  row['is_active'], row['created_at'], row['updated_at']))
        
        cursor.execute('DROP TABLE users')
        cursor.execute('ALTER TABLE users_new RENAME TO users')
        print(f"  ✓ Migrated {len(users_data)} users")
        
        print("\n5. Migrating user_emails table...")
        # Migrate user_emails table
        cursor.execute('SELECT * FROM user_emails')
        emails_data = cursor.fetchall()
        
        cursor.execute('DROP TABLE IF EXISTS user_emails_new')
        cursor.execute('''
            CREATE TABLE user_emails_new (
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
        
        for row in emails_data:
            cursor.execute('''
                INSERT INTO user_emails_new (id, user_id, email, is_primary, is_verified,
                                            verified_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (row['id'], row['user_id'], row['email'], row['is_primary'],
                  row['is_verified'], row['verified_at'], row['created_at']))
        
        cursor.execute('DROP TABLE user_emails')
        cursor.execute('ALTER TABLE user_emails_new RENAME TO user_emails')
        print(f"  ✓ Migrated {len(emails_data)} user emails")
        
        # Re-enable foreign keys
        cursor.execute('PRAGMA foreign_keys = ON')
        
        conn.commit()
        conn.close()
        
        print("\n✓ Migration completed successfully!")
        print(f"  Backup available at: {backup_path}")
        
    except Exception as e:
        print(f"\n✗ Migration failed: {str(e)}")
        print(f"  Restoring from backup...")
        # Use shutil.copy2 with validated paths - backup_path is created by backup_database
        # which uses safe path operations
        try:
            shutil.copy2(backup_path, db_path)
            print(f"  ✓ Database restored from backup")
        except (OSError, shutil.Error) as restore_error:
            print(f"  ✗ Failed to restore backup: {str(restore_error)}")
            print(f"  Manual intervention required - backup is at: {backup_path}")
        raise


def main():
    parser = argparse.ArgumentParser(
        description='Migrate database to add CHECK constraints for non-empty name fields'
    )
    parser.add_argument(
        '--db-path',
        default=os.environ.get('DATABASE_FILE', '/app/data/users.db'),
        help='Path to the database file (default: /app/data/users.db or DB_PATH env var)'
    )
    
    args = parser.parse_args()
    
    print("=" * 70)
    print("Database Migration: Add CHECK Constraints")
    print("=" * 70)
    
    migrate_database(args.db_path)
    
    print("\n" + "=" * 70)
    print("Migration Complete")
    print("=" * 70)


if __name__ == '__main__':
    main()
