/**
 * SQLite Directory Seeding
 * Initializes SQLite database with default domains, roles, and seed users
 */
import Database from 'better-sqlite3';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

interface SeedUser {
  id?: string;
  email: string;
  password: string;
  given_name?: string;
  family_name?: string;
  name?: string;
  email_verified?: boolean;
  roles?: string[];
  groups?: string[];
  properties?: Record<string, any>;
}

export class SqliteSeeder {
  private db: Database.Database;

  constructor(dbPath: string) {
    // Ensure database directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('foreign_keys = ON');
    console.log(`[Seeder] Initialized with database: ${dbPath}`);
  }

  /**
   * Initialize database schema
   */
  initSchema(): void {
    console.log('[Seeder] Creating database schema...');
    
    this.db.exec(`
      -- Domains table
      CREATE TABLE IF NOT EXISTS domains (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL CHECK(length(trim(name)) > 0),
        description TEXT,
        is_default BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Users table
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
      );
      
      -- User emails table
      CREATE TABLE IF NOT EXISTS user_emails (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL CHECK(length(trim(email)) > 0),
        is_primary BOOLEAN DEFAULT 0,
        is_verified BOOLEAN DEFAULT 0,
        verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      
      -- User properties table
      CREATE TABLE IF NOT EXISTS user_properties (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, key),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      
      -- Roles table
      CREATE TABLE IF NOT EXISTS roles (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL CHECK(length(trim(name)) > 0),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- User roles table
      CREATE TABLE IF NOT EXISTS user_roles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        role_id TEXT NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, role_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
      );
      
      -- Groups table
      CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL CHECK(length(trim(name)) > 0),
        description TEXT,
        domain_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, domain_id),
        FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
      );
      
      -- User groups table
      CREATE TABLE IF NOT EXISTS user_groups (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        group_id TEXT NOT NULL,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, group_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
      );
      
      -- Audit log table
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
      );
    `);
    
    console.log('[Seeder] Database schema created successfully');
  }

  /**
   * Generate UUID
   */
  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Initialize default domain
   */
  initDefaultDomain(): string {
    console.log('[Seeder] Initializing default domain...');
    
    const existingDomain = this.db.prepare('SELECT id FROM domains WHERE name = ?').get('localhost') as { id: string } | undefined;
    
    if (existingDomain) {
      console.log('[Seeder] Default domain already exists');
      return existingDomain.id;
    }
    
    const domainId = this.generateId();
    this.db.prepare('INSERT INTO domains (id, name, description, is_default) VALUES (?, ?, ?, ?)').run(
      domainId,
      'localhost',
      'Default localhost domain',
      1
    );
    
    console.log('[Seeder] Default domain created');
    return domainId;
  }

  /**
   * Initialize default roles
   */
  initDefaultRoles(): Record<string, string> {
    console.log('[Seeder] Initializing default roles...');
    
    const roles = {
      admin: 'Administrator with full access',
      user: 'Standard user',
      guest: 'Guest user with limited access'
    };
    
    const roleIds: Record<string, string> = {};
    
    for (const [name, description] of Object.entries(roles)) {
      const existing = this.db.prepare('SELECT id FROM roles WHERE name = ?').get(name) as { id: string } | undefined;
      
      if (existing) {
        roleIds[name] = existing.id;
        console.log(`[Seeder] Role already exists: ${name}`);
      } else {
        const roleId = this.generateId();
        this.db.prepare('INSERT INTO roles (id, name, description) VALUES (?, ?, ?)').run(
          roleId,
          name,
          description
        );
        roleIds[name] = roleId;
        console.log(`[Seeder] Role created: ${name}`);
      }
    }
    
    return roleIds;
  }

  /**
   * Seed users from JSON file or array
   */
  async seedUsers(usersData: SeedUser[]): Promise<number> {
    console.log('[Seeder] Seeding users...');
    
    const domainId = this.initDefaultDomain();
    const roleIds = this.initDefaultRoles();
    
    let seededCount = 0;
    
    for (const userData of usersData) {
      try {
        const username = userData.email;
        const email = userData.email;
        
        // Check if user already exists
        const existingUser = this.db.prepare('SELECT id FROM users WHERE username = ?').get(username) as { id: string } | undefined;
        
        if (existingUser) {
          console.log(`[Seeder] User already exists: ${username}`);
          continue;
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        // Create user
        const userId = userData.id || this.generateId();
        const firstName = userData.given_name || '';
        const lastName = userData.family_name || '';
        const displayName = userData.name || `${firstName} ${lastName}`.trim();
        
        this.db.prepare(`
          INSERT INTO users (id, username, password, first_name, last_name, display_name, domain_id, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(userId, username, hashedPassword, firstName, lastName, displayName, domainId, 1);
        
        // Add email
        const emailId = this.generateId();
        this.db.prepare(`
          INSERT INTO user_emails (id, user_id, email, is_primary, is_verified)
          VALUES (?, ?, ?, ?, ?)
        `).run(emailId, userId, email, 1, userData.email_verified ? 1 : 0);
        
        // Add properties
        if (userData.properties) {
          for (const [key, value] of Object.entries(userData.properties)) {
            const propId = this.generateId();
            const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
            this.db.prepare(`
              INSERT INTO user_properties (id, user_id, key, value)
              VALUES (?, ?, ?, ?)
            `).run(propId, userId, key, valueStr);
          }
        }
        
        // Assign roles
        if (username === 'admin@localhost') {
          const userRoleId = this.generateId();
          this.db.prepare('INSERT INTO user_roles (id, user_id, role_id) VALUES (?, ?, ?)').run(
            userRoleId,
            userId,
            roleIds.admin
          );
          console.log(`[Seeder] Assigned admin role to ${username}`);
        } else {
          const userRoleId = this.generateId();
          this.db.prepare('INSERT INTO user_roles (id, user_id, role_id) VALUES (?, ?, ?)').run(
            userRoleId,
            userId,
            roleIds.user
          );
        }
        
        seededCount++;
        console.log(`[Seeder] Seeded user: ${username}`);
      } catch (error) {
        console.error(`[Seeder] Error seeding user ${userData.email}:`, error);
      }
    }
    
    console.log(`[Seeder] Seeded ${seededCount} users successfully`);
    return seededCount;
  }

  /**
   * Load and seed users from JSON file
   */
  async seedFromFile(filePath: string): Promise<boolean> {
    try {
      if (!fs.existsSync(filePath)) {
        console.warn(`[Seeder] Users file not found: ${filePath}`);
        return false;
      }
      
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const usersData = JSON.parse(fileContent) as SeedUser[];
      
      await this.seedUsers(usersData);
      return true;
    } catch (error) {
      console.error(`[Seeder] Error loading users from file:`, error);
      return false;
    }
  }

  /**
   * Full database initialization
   */
  async initialize(usersFilePath?: string): Promise<void> {
    console.log('[Seeder] Starting full database initialization...');
    
    this.initSchema();
    this.initDefaultDomain();
    this.initDefaultRoles();
    
    if (usersFilePath) {
      await this.seedFromFile(usersFilePath);
    }
    
    console.log('[Seeder] Database initialization complete');
  }

  close(): void {
    this.db.close();
  }
}

/**
 * Initialize SQLite directory database
 */
export async function initializeSqliteDirectory(dbPath: string, usersFilePath?: string): Promise<void> {
  const seeder = new SqliteSeeder(dbPath);
  await seeder.initialize(usersFilePath);
  seeder.close();
}
