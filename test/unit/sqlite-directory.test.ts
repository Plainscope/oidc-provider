/**
 * Unit tests for SqliteDirectory
 */
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { SqliteDirectory } from '../../src/provider/src/directories/sqlite-directory';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';

import * as os from 'os';

const TEST_DB_PATH = path.join(os.tmpdir(), 'test-sqlite-directory.db');

describe('SqliteDirectory', () => {
  
  test('should create database and tables on initialization', async () => {
    // Clean up any existing test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    
    // Create a minimal database schema for testing
    const db = new Database(TEST_DB_PATH);
    db.pragma('foreign_keys = ON');
    
    // Create tables
    db.exec(`
      CREATE TABLE domains (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        is_default BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE users (
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
      );
      
      CREATE TABLE user_emails (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        is_primary BOOLEAN DEFAULT 0,
        is_verified BOOLEAN DEFAULT 0,
        verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      
      CREATE TABLE user_properties (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, key),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      
      CREATE TABLE roles (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE user_roles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        role_id TEXT NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, role_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
      );
      
      CREATE TABLE groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        domain_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, domain_id),
        FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
      );
      
      CREATE TABLE user_groups (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        group_id TEXT NOT NULL,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, group_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
      );
    `);
    
    // Insert test data
    const domainId = '00000000-0000-0000-0000-000000000001';
    const userId = '8276bb5b-d0b7-41e9-a805-77b62a2865f4';
    const emailId = '00000000-0000-0000-0000-000000000002';
    const roleId = '00000000-0000-0000-0000-000000000003';
    const groupId = '00000000-0000-0000-0000-000000000004';
    
    // Hash the test password
    const hashedPassword = await bcrypt.hash('Rays-93-Accident', 10);
    
    db.prepare('INSERT INTO domains (id, name, description, is_default) VALUES (?, ?, ?, ?)').run(
      domainId, 'localhost', 'Default domain', 1
    );
    
    db.prepare('INSERT INTO users (id, username, password, first_name, last_name, display_name, domain_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      userId, 'admin', hashedPassword, 'Admin', 'User', 'Admin User', domainId, 1
    );
    
    db.prepare('INSERT INTO user_emails (id, user_id, email, is_primary, is_verified) VALUES (?, ?, ?, ?, ?)').run(
      emailId, userId, 'admin@localhost', 1, 1
    );
    
    db.prepare('INSERT INTO roles (id, name, description) VALUES (?, ?, ?)').run(
      roleId, 'admin', 'Administrator role'
    );
    
    db.prepare('INSERT INTO user_roles (id, user_id, role_id) VALUES (?, ?, ?)').run(
      '00000000-0000-0000-0000-000000000005', userId, roleId
    );
    
    db.prepare('INSERT INTO groups (id, name, description, domain_id) VALUES (?, ?, ?, ?)').run(
      groupId, 'admins', 'Administrators group', domainId
    );
    
    db.prepare('INSERT INTO user_groups (id, user_id, group_id) VALUES (?, ?, ?)').run(
      '00000000-0000-0000-0000-000000000006', userId, groupId
    );
    
    db.close();
    
    // Now test the SqliteDirectory
    const directory = new SqliteDirectory(TEST_DB_PATH);
    
    // Test count
    const count = await directory.count();
    assert.strictEqual(count, 1, 'Should have 1 user');
    
    // Test find by ID
    const user = await directory.find(userId);
    assert.ok(user, 'Should find user by ID');
    
    // Test find by email
    const userByEmail = await directory.find('admin@localhost');
    assert.ok(userByEmail, 'Should find user by email');
    
    // Test validate with correct password
    const validUser = await directory.validate('admin@localhost', 'Rays-93-Accident');
    assert.ok(validUser, 'Should validate correct credentials');
    
    // Test validate with incorrect password
    const invalidUser = await directory.validate('admin@localhost', 'wrong-password');
    assert.strictEqual(invalidUser, undefined, 'Should reject incorrect credentials');
    
    // Test user not found
    const notFound = await directory.find('non-existent-id');
    assert.strictEqual(notFound, undefined, 'Should return undefined for non-existent user');
    
    // Clean up
    directory.close();
  });
});
