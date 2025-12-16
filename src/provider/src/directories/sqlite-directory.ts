/**
 * SQLite-based Directory Service
 * Provides user authentication and profile management using SQLite database
 * Compatible with the remote directory's SQLite schema
 */
import { IDirectory } from "./directory";
import { Account } from "oidc-provider";
import { Profile } from "./profile";
import { User } from "./user";
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import * as bcrypt from 'bcrypt';

/**
 * Interface for SQLite user row from database
 */
interface SqliteUser {
  id: string;
  username: string;
  password: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  domain_id: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

/**
 * Interface for user email row
 */
interface UserEmail {
  id: string;
  user_id: string;
  email: string;
  is_primary: number;
  is_verified: number;
  verified_at?: string;
  created_at: string;
}

/**
 * Interface for user property row
 */
interface UserProperty {
  id: string;
  user_id: string;
  key: string;
  value?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Interface for user role row
 */
interface UserRole {
  user_id: string;
  role_id: string;
  role_name: string;
}

/**
 * Interface for user group row
 */
interface UserGroup {
  user_id: string;
  group_id: string;
  group_name: string;
}

/**
 * SqliteDirectory implements IDirectory using SQLite database
 * Compatible with the remote directory's SQLite schema
 */
export class SqliteDirectory implements IDirectory {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || process.env.DIRECTORY_DATABASE_FILE || path.join(process.cwd(), 'data/users.db');

    // Ensure database directory exists
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Initialize database connection
    this.db = new Database(this.dbPath);

    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');

    // Set reasonable timeout for busy database
    this.db.pragma('busy_timeout = 5000');

    console.log(`[SqliteDirectory] Initialized with database: ${this.dbPath}`);
  }

  /**
   * Maps SQLite user record to OIDC User interface
   */
  private mapUser(sqliteUser: SqliteUser, emails: UserEmail[], properties: UserProperty[], roles: UserRole[], groups: UserGroup[]): User {
    // Get primary email or first available email
    const primaryEmail = emails.find(e => e.is_primary === 1);
    const email = primaryEmail?.email || emails[0]?.email || '';
    const email_verified = primaryEmail?.is_verified === 1 || false;

    // Convert properties array to object for easier access
    const propsObj: Record<string, any> = {};
    properties.forEach(prop => {
      if (prop.value !== null && prop.value !== undefined) {
        try {
          // Try to parse JSON values
          propsObj[prop.key] = JSON.parse(prop.value);
        } catch {
          // If not JSON, use as string
          propsObj[prop.key] = prop.value;
        }
      }
    });

    // Build user object with OIDC standard claims
    return {
      id: sqliteUser.id,
      email: email,
      password: sqliteUser.password,
      email_verified: email_verified,
      name: sqliteUser.display_name || `${sqliteUser.first_name || ''} ${sqliteUser.last_name || ''}`.trim(),
      given_name: sqliteUser.first_name,
      family_name: sqliteUser.last_name,
      middle_name: propsObj.middle_name,
      nickname: propsObj.nickname,
      picture: propsObj.picture,
      profile: propsObj.profile,
      website: propsObj.website,
      gender: propsObj.gender,
      birthdate: propsObj.birthdate,
      zoneinfo: propsObj.zoneinfo,
      locale: propsObj.locale,
      phone_number: propsObj.phone_number,
      phone_number_verified: propsObj.phone_number_verified === true || propsObj.phone_number_verified === 'true',
      address: propsObj.address,
      updated_at: propsObj.updated_at,
      groups: groups.map(g => g.group_name),
      roles: roles.map(r => r.role_name),
    };
  }

  /**
   * Get user details including emails, properties, roles, and groups
   */
  private getUserDetails(userId: string): { emails: UserEmail[], properties: UserProperty[], roles: UserRole[], groups: UserGroup[] } {
    // Get user emails
    const emails = this.db.prepare(
      'SELECT * FROM user_emails WHERE user_id = ? ORDER BY is_primary DESC'
    ).all(userId) as UserEmail[];

    // Get user properties
    const properties = this.db.prepare(
      'SELECT * FROM user_properties WHERE user_id = ?'
    ).all(userId) as UserProperty[];

    // Get user roles
    const roles = this.db.prepare(
      `SELECT ur.user_id, ur.role_id, r.name as role_name
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = ?`
    ).all(userId) as UserRole[];

    // Get user groups
    const groups = this.db.prepare(
      `SELECT ug.user_id, ug.group_id, g.name as group_name
       FROM user_groups ug
       JOIN groups g ON ug.group_id = g.id
       WHERE ug.user_id = ?`
    ).all(userId) as UserGroup[];

    return { emails, properties, roles, groups };
  }

  /**
   * Returns the total number of active users.
   */
  async count(): Promise<number> {
    try {
      const result = this.db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').get() as { count: number };
      console.log(`[SqliteDirectory] User count: ${result.count}`);
      return result.count;
    } catch (error) {
      console.error('[SqliteDirectory] Error counting users:', error);
      return 0;
    }
  }

  /**
   * Finds a user by ID or email.
   */
  async find(id: string): Promise<Account | undefined> {
    console.log(`[SqliteDirectory] Finding user by id: ${id}`);

    try {
      let sqliteUser: SqliteUser | undefined;

      // Try to find by ID first
      sqliteUser = this.db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(id) as SqliteUser | undefined;

      // Fallback: if not found and id looks like an email, try email lookup
      if (!sqliteUser && id.includes('@')) {
        console.log(`[SqliteDirectory] User not found by id, trying by email: ${id}`);
        const row = this.db.prepare(
          `SELECT u.* FROM users u
           JOIN user_emails ue ON u.id = ue.user_id
           WHERE ue.email = ? AND u.is_active = 1
           LIMIT 1`
        ).get(id) as SqliteUser | undefined;

        sqliteUser = row;
      }

      if (!sqliteUser) {
        console.warn(`[SqliteDirectory] User not found: ${id}`);
        return undefined;
      }

      // Get related data
      const { emails, properties, roles, groups } = this.getUserDetails(sqliteUser.id);

      // Map to OIDC user
      const user = this.mapUser(sqliteUser, emails, properties, roles, groups);

      console.log(`[SqliteDirectory] User found: ${id}`);
      return new Profile(user.id, user);
    } catch (error) {
      console.error(`[SqliteDirectory] Error finding user:`, error);
      return undefined;
    }
  }

  /**
   * Validates user credentials using email and password.
   */
  async validate(email: string, password: string): Promise<Account | undefined> {
    console.log(`[SqliteDirectory] Validating user: ${email}`);

    try {
      // Find user by email
      const sqliteUser = this.db.prepare(
        `SELECT u.* FROM users u
         JOIN user_emails ue ON u.id = ue.user_id
         WHERE ue.email = ? AND u.is_active = 1
         LIMIT 1`
      ).get(email) as SqliteUser | undefined;

      if (!sqliteUser) {
        console.warn(`[SqliteDirectory] User not found: ${email}`);
        return undefined;
      }

      // Validate password
      const storedPassword = sqliteUser.password;
      let valid = false;

      // Check if password is bcrypt hashed (starts with $2a$, $2b$, or $2y$)
      if (storedPassword.startsWith('$2')) {
        try {
          valid = await bcrypt.compare(password, storedPassword);
        } catch (error) {
          console.error(`[SqliteDirectory] Bcrypt comparison error:`, error);
          valid = false;
        }
      } else {
        // Reject plain text passwords for security
        console.error(`[SqliteDirectory] Plain text password detected for user ${sqliteUser.id}. Authentication denied. User must use bcrypt-hashed password.`);
        valid = false;
      }

      if (!valid) {
        console.warn(`[SqliteDirectory] Invalid credentials for: ${email}`);
        return undefined;
      }

      // Get related data
      const { emails, properties, roles, groups } = this.getUserDetails(sqliteUser.id);

      // Map to OIDC user
      const user = this.mapUser(sqliteUser, emails, properties, roles, groups);

      console.log(`[SqliteDirectory] User validated: ${email}`);
      return new Profile(user.id || email, user);
    } catch (error) {
      console.error(`[SqliteDirectory] Error validating credentials:`, error);
      return undefined;
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      console.log('[SqliteDirectory] Database connection closed');
    }
  }

  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }
}
