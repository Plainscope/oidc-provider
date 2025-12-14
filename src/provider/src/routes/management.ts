/**
 * SQLite Directory Management Routes
 * Provides web UI for managing SQLite directory users, roles, and groups
 */
import { Express, Request, Response, NextFunction } from 'express';
import { SqliteDirectory } from '../directories/sqlite-directory';
import Database from 'better-sqlite3';
import validator from 'validator';

// Simple in-memory session store for management UI
const sessions = new Map<string, { username: string; loginTime: number }>();
const SESSION_DURATION = 3600000; // 1 hour

/**
 * Middleware to check if user is authenticated
 */
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.cookies?.['mgmt_session'];
  
  if (!sessionId || !sessions.has(sessionId)) {
    return res.redirect('/mgmt/login');
  }
  
  const session = sessions.get(sessionId)!;
  
  // Check session expiry
  if (Date.now() - session.loginTime > SESSION_DURATION) {
    sessions.delete(sessionId);
    return res.redirect('/mgmt/login');
  }
  
  // Refresh session
  session.loginTime = Date.now();
  next();
}

/**
 * Sanitize input
 */
function sanitize(input: string): string {
  if (typeof input !== 'string') return '';
  const MAX_LENGTH = 255;
  if (input.length > MAX_LENGTH) {
    throw new Error(`Input exceeds maximum length of ${MAX_LENGTH}`);
  }
  return validator.trim(input);
}

/**
 * Generate session ID
 */
function generateSessionId(): string {
  const bytes = new Uint8Array(32);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Register management routes
 */
export function registerManagementRoutes(app: Express, directory: SqliteDirectory, db: Database.Database) {
  // Login page
  app.get('/mgmt/login', (req, res) => {
    res.render('mgmt-login', {
      title: 'Management Login',
      error: req.query.error
    });
  });
  
  // Login handler
  app.post('/mgmt/login', async (req, res) => {
    try {
      const email = sanitize(req.body.email);
      const password = sanitize(req.body.password);
      
      // Validate against directory
      const account = await directory.validate(email, password);
      
      if (!account) {
        return res.redirect('/mgmt/login?error=Invalid+credentials');
      }
      
      // Check if user has admin role
      const userRoles = db.prepare(`
        SELECT r.name FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = ?
      `).all(account.accountId) as { name: string }[];
      
      const isAdmin = userRoles.some(r => r.name === 'admin');
      
      if (!isAdmin) {
        return res.redirect('/mgmt/login?error=Access+denied');
      }
      
      // Create session
      const sessionId = generateSessionId();
      sessions.set(sessionId, {
        username: email,
        loginTime: Date.now()
      });
      
      res.cookie('mgmt_session', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: SESSION_DURATION
      });
      
      res.redirect('/mgmt');
    } catch (error) {
      console.error('[Management] Login error:', error);
      res.redirect('/mgmt/login?error=Server+error');
    }
  });
  
  // Logout
  app.get('/mgmt/logout', (req, res) => {
    const sessionId = req.cookies?.['mgmt_session'];
    if (sessionId) {
      sessions.delete(sessionId);
    }
    res.clearCookie('mgmt_session');
    res.redirect('/mgmt/login');
  });
  
  // Dashboard
  app.get('/mgmt', requireAuth, (req, res) => {
    try {
      const stats = {
        users: (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count,
        roles: (db.prepare('SELECT COUNT(*) as count FROM roles').get() as { count: number }).count,
        groups: (db.prepare('SELECT COUNT(*) as count FROM groups').get() as { count: number }).count,
        domains: (db.prepare('SELECT COUNT(*) as count FROM domains').get() as { count: number }).count
      };
      
      res.render('mgmt-dashboard', {
        title: 'Directory Management',
        stats,
        session: sessions.get(req.cookies?.['mgmt_session'])
      });
    } catch (error) {
      console.error('[Management] Dashboard error:', error);
      res.status(500).render('error', {
        title: 'Error',
        error: 'Failed to load dashboard'
      });
    }
  });
  
  // Users list
  app.get('/mgmt/users', requireAuth, (req, res) => {
    try {
      const users = db.prepare(`
        SELECT u.id, u.username, u.first_name, u.last_name, u.display_name, 
               u.is_active, u.created_at,
               (SELECT email FROM user_emails WHERE user_id = u.id AND is_primary = 1) as email
        FROM users u
        ORDER BY u.created_at DESC
      `).all();
      
      res.render('mgmt-users', {
        title: 'Users',
        users,
        session: sessions.get(req.cookies?.['mgmt_session'])
      });
    } catch (error) {
      console.error('[Management] Users list error:', error);
      res.status(500).render('error', {
        title: 'Error',
        error: 'Failed to load users'
      });
    }
  });
  
  // User detail
  app.get('/mgmt/users/:id', requireAuth, (req, res) => {
    try {
      const user = db.prepare(`
        SELECT u.*, d.name as domain_name
        FROM users u
        JOIN domains d ON u.domain_id = d.id
        WHERE u.id = ?
      `).get(req.params.id);
      
      if (!user) {
        return res.status(404).render('error', {
          title: 'Not Found',
          error: 'User not found'
        });
      }
      
      const emails = db.prepare('SELECT * FROM user_emails WHERE user_id = ?').all(req.params.id);
      const roles = db.prepare(`
        SELECT r.* FROM roles r
        JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = ?
      `).all(req.params.id);
      const groups = db.prepare(`
        SELECT g.* FROM groups g
        JOIN user_groups ug ON g.id = ug.group_id
        WHERE ug.user_id = ?
      `).all(req.params.id);
      const properties = db.prepare('SELECT * FROM user_properties WHERE user_id = ?').all(req.params.id);
      
      res.render('mgmt-user-detail', {
        title: `User: ${(user as any).username}`,
        user,
        emails,
        roles,
        groups,
        properties,
        session: sessions.get(req.cookies?.['mgmt_session'])
      });
    } catch (error) {
      console.error('[Management] User detail error:', error);
      res.status(500).render('error', {
        title: 'Error',
        error: 'Failed to load user details'
      });
    }
  });
  
  // Roles list
  app.get('/mgmt/roles', requireAuth, (req, res) => {
    try {
      const roles = db.prepare(`
        SELECT r.*, COUNT(ur.user_id) as user_count
        FROM roles r
        LEFT JOIN user_roles ur ON r.id = ur.id
        GROUP BY r.id
        ORDER BY r.created_at DESC
      `).all();
      
      res.render('mgmt-roles', {
        title: 'Roles',
        roles,
        session: sessions.get(req.cookies?.['mgmt_session'])
      });
    } catch (error) {
      console.error('[Management] Roles list error:', error);
      res.status(500).render('error', {
        title: 'Error',
        error: 'Failed to load roles'
      });
    }
  });
  
  // Groups list
  app.get('/mgmt/groups', requireAuth, (req, res) => {
    try {
      const groups = db.prepare(`
        SELECT g.*, d.name as domain_name, COUNT(ug.user_id) as user_count
        FROM groups g
        JOIN domains d ON g.domain_id = d.id
        LEFT JOIN user_groups ug ON g.id = ug.group_id
        GROUP BY g.id
        ORDER BY g.created_at DESC
      `).all();
      
      res.render('mgmt-groups', {
        title: 'Groups',
        groups,
        session: sessions.get(req.cookies?.['mgmt_session'])
      });
    } catch (error) {
      console.error('[Management] Groups list error:', error);
      res.status(500).render('error', {
        title: 'Error',
        error: 'Failed to load groups'
      });
    }
  });
}
