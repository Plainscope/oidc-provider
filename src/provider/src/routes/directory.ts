/**
 * SQLite Directory Management Routes
 * Provides web UI for managing SQLite directory users, roles, and groups
 */
import { Express, Request, Response, NextFunction } from 'express';
import { SqliteDirectory } from '../directories/sqlite-directory';
import Database from 'better-sqlite3';
import validator from 'validator';
import crypto from 'crypto';

// Simple in-memory session store for management UI
const sessions = new Map<string, { username: string; loginTime: number }>();
const SESSION_DURATION = 3600000; // 1 hour

/**
 * Middleware to check if user is authenticated
 */
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.cookies?.['mgmt_session'];

  if (!sessionId || !sessions.has(sessionId)) {
    return res.redirect('/directory/login');
  }

  const session = sessions.get(sessionId)!;

  // Check session expiry
  if (Date.now() - session.loginTime > SESSION_DURATION) {
    sessions.delete(sessionId);
    return res.redirect('/directory/login');
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
  // Redirect /directory to /directory for convenience
  /*  app.get('/directory', (_req, res) => {
      res.redirect('/directory');
    });*/

  // Login page
  app.get('/directory/login', (req, res) => {
    res.render('directory/login', {
      title: 'Management Login',
      error: req.query.error
    });
  });

  // Login handler
  app.post('/directory/login', async (req, res) => {
    try {
      const email = sanitize(req.body.email);
      const password = sanitize(req.body.password);

      // Validate against directory
      const account = await directory.validate(email, password);

      if (!account) {
        return res.redirect('/directory/login?error=Invalid+credentials');
      }

      // Check if user has admin role
      const userRoles = db.prepare(`
        SELECT r.name FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = ?
      `).all(account.accountId) as { name: string }[];

      const isAdmin = userRoles.some(r => r.name === 'admin');

      if (!isAdmin) {
        return res.redirect('/directory/login?error=Access+denied');
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

      res.redirect('/directory');
    } catch (error) {
      console.error('[Management] Login error:', error);
      res.redirect('/directory/login?error=Server+error');
    }
  });

  // Logout
  app.get('/directory/logout', (req, res) => {
    const sessionId = req.cookies?.['mgmt_session'];
    if (sessionId) {
      sessions.delete(sessionId);
    }
    res.clearCookie('mgmt_session');
    res.redirect('/directory/login');
  });

  // Dashboard
  app.get('/directory', requireAuth, (req, res) => {
    try {
      const stats = {
        users: (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count,
        roles: (db.prepare('SELECT COUNT(*) as count FROM roles').get() as { count: number }).count,
        groups: (db.prepare('SELECT COUNT(*) as count FROM groups').get() as { count: number }).count,
        domains: (db.prepare('SELECT COUNT(*) as count FROM domains').get() as { count: number }).count
      };

      res.render('directory/dashboard', {
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
  app.get('/directory/users', requireAuth, (req, res) => {
    try {
      const users = db.prepare(`
        SELECT u.id, u.username, u.first_name, u.last_name, u.display_name, 
               u.is_active, u.created_at,
               (SELECT email FROM user_emails WHERE user_id = u.id AND is_primary = 1) as email
        FROM users u
        ORDER BY u.created_at DESC
      `).all();

      res.render('directory/users', {
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
  app.get('/directory/users/:id', requireAuth, (req, res) => {
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

      // Get all available roles and groups for assignment
      const availableRoles = db.prepare(`
        SELECT r.* FROM roles r
        WHERE r.id NOT IN (
          SELECT role_id FROM user_roles WHERE user_id = ?
        )
      `).all(req.params.id);

      const availableGroups = db.prepare(`
        SELECT g.* FROM groups g
        WHERE g.id NOT IN (
          SELECT group_id FROM user_groups WHERE user_id = ?
        )
      `).all(req.params.id);

      res.render('directory/user-detail', {
        title: `User: ${(user as any).username}`,
        user,
        emails,
        roles,
        groups,
        properties,
        availableRoles,
        availableGroups,
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

  // Add role to user
  app.post('/directory/users/:userId/roles/:roleId', requireAuth, (req, res): void => {
    try {
      const userId = sanitize(req.params.userId);
      const roleId = sanitize(req.params.roleId);

      // Check if user exists
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Check if role exists
      const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(roleId);
      if (!role) {
        res.status(404).json({ error: 'Role not found' });
        return;
      }

      // Check if assignment already exists
      const existing = db.prepare('SELECT * FROM user_roles WHERE user_id = ? AND role_id = ?').get(userId, roleId);
      if (existing) {
        res.status(400).json({ error: 'User already has this role' });
        return;
      }

      // Add role to user
      db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)').run(userId, roleId);

      res.json({ success: true, message: 'Role added successfully' });
    } catch (error) {
      console.error('[Management] Add role error:', error);
      res.status(500).json({ error: 'Failed to add role' });
    }
  });

  // Remove role from user
  app.post('/directory/users/:userId/roles/:roleId/remove', requireAuth, (req, res): void => {
    try {
      const userId = sanitize(req.params.userId);
      const roleId = sanitize(req.params.roleId);

      db.prepare('DELETE FROM user_roles WHERE user_id = ? AND role_id = ?').run(userId, roleId);

      res.json({ success: true, message: 'Role removed successfully' });
    } catch (error) {
      console.error('[Management] Remove role error:', error);
      res.status(500).json({ error: 'Failed to remove role' });
    }
  });

  // Add group to user
  app.post('/directory/users/:userId/groups/:groupId', requireAuth, (req, res): void => {
    try {
      const userId = sanitize(req.params.userId);
      const groupId = sanitize(req.params.groupId);

      // Check if user exists
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Check if group exists
      const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
      if (!group) {
        res.status(404).json({ error: 'Group not found' });
        return;
      }

      // Check if assignment already exists
      const existing = db.prepare('SELECT * FROM user_groups WHERE user_id = ? AND group_id = ?').get(userId, groupId);
      if (existing) {
        res.status(400).json({ error: 'User already in this group' });
        return;
      }

      // Add user to group
      db.prepare('INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)').run(userId, groupId);

      res.json({ success: true, message: 'Group added successfully' });
    } catch (error) {
      console.error('[Management] Add group error:', error);
      res.status(500).json({ error: 'Failed to add group' });
    }
  });

  // Remove group from user
  app.post('/directory/users/:userId/groups/:groupId/remove', requireAuth, (req, res): void => {
    try {
      const userId = sanitize(req.params.userId);
      const groupId = sanitize(req.params.groupId);

      db.prepare('DELETE FROM user_groups WHERE user_id = ? AND group_id = ?').run(userId, groupId);

      res.json({ success: true, message: 'Group removed successfully' });
    } catch (error) {
      console.error('[Management] Remove group error:', error);
      res.status(500).json({ error: 'Failed to remove group' });
    }
  });

  // Roles list
  app.get('/directory/roles', requireAuth, (req, res) => {
    try {
      const roles = db.prepare(`
        SELECT r.*, COUNT(ur.user_id) as user_count
        FROM roles r
        LEFT JOIN user_roles ur ON r.id = ur.id
        GROUP BY r.id
        ORDER BY r.created_at DESC
      `).all();

      res.render('directory/roles', {
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

  // New role form
  app.get('/directory/roles/new', requireAuth, (req, res) => {
    res.render('directory/role-form', {
      title: 'Create Role',
      role: null,
      session: sessions.get(req.cookies?.['mgmt_session'])
    });
  });

  // Create role
  app.post('/directory/roles', requireAuth, (req, res): void => {
    try {
      const name = sanitize(req.body.name);
      const description = sanitize(req.body.description || '');

      if (!name) {
        res.status(400).render('directory/role-form', {
          title: 'Create Role',
          role: null,
          error: 'Role name is required',
          session: sessions.get(req.cookies?.['mgmt_session'])
        });
        return;
      }

      // Check if role name already exists
      const existing = db.prepare('SELECT * FROM roles WHERE name = ?').get(name);
      if (existing) {
        res.status(400).render('directory/role-form', {
          title: 'Create Role',
          role: null,
          error: 'Role name already exists',
          session: sessions.get(req.cookies?.['mgmt_session'])
        });
        return;
      }

      // Generate UUID for role
      const roleId = crypto.randomUUID();

      // Create role
      db.prepare('INSERT INTO roles (id, name, description, created_at) VALUES (?, ?, ?, ?)').run(
        roleId,
        name,
        description,
        new Date().toISOString()
      );

      res.redirect('/directory/roles');
    } catch (error) {
      console.error('[Management] Create role error:', error);
      res.status(500).render('directory/role-form', {
        title: 'Create Role',
        role: null,
        error: 'Failed to create role',
        session: sessions.get(req.cookies?.['mgmt_session'])
      });
    }
  });

  // Edit role form
  app.get('/directory/roles/:id/edit', requireAuth, (req, res) => {
    try {
      const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(req.params.id);

      if (!role) {
        return res.status(404).render('error', {
          title: 'Not Found',
          error: 'Role not found'
        });
      }

      res.render('directory/role-form', {
        title: `Edit Role: ${(role as any).name}`,
        role,
        session: sessions.get(req.cookies?.['mgmt_session'])
      });
    } catch (error) {
      console.error('[Management] Edit role form error:', error);
      res.status(500).render('error', {
        title: 'Error',
        error: 'Failed to load role'
      });
    }
  });

  // Update role
  app.post('/directory/roles/:id/update', requireAuth, (req, res): void => {
    try {
      const roleId = sanitize(req.params.id);
      const name = sanitize(req.body.name);
      const description = sanitize(req.body.description || '');

      const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(roleId);
      if (!role) {
        res.status(404).render('error', {
          title: 'Not Found',
          error: 'Role not found'
        });
        return;
      }

      if (!name) {
        res.status(400).render('directory/role-form', {
          title: `Edit Role: ${(role as any).name}`,
          role,
          error: 'Role name is required',
          session: sessions.get(req.cookies?.['mgmt_session'])
        });
        return;
      }

      // Check if role name already exists (excluding current role)
      const existing = db.prepare('SELECT * FROM roles WHERE name = ? AND id != ?').get(name, roleId);
      if (existing) {
        res.status(400).render('directory/role-form', {
          title: `Edit Role: ${(role as any).name}`,
          role,
          error: 'Role name already exists',
          session: sessions.get(req.cookies?.['mgmt_session'])
        });
        return;
      }

      // Update role
      db.prepare('UPDATE roles SET name = ?, description = ? WHERE id = ?').run(name, description, roleId);

      res.redirect(`/directory/roles/${roleId}`);
    } catch (error) {
      console.error('[Management] Update role error:', error);
      res.status(500).json({ error: 'Failed to update role' });
    }
  });

  // Delete role
  app.post('/directory/roles/:id/delete', requireAuth, (req, res): void => {
    try {
      const roleId = sanitize(req.params.id);

      // Check if role exists
      const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(roleId);
      if (!role) {
        res.status(404).json({ error: 'Role not found' });
        return;
      }

      // Delete role assignments first
      db.prepare('DELETE FROM user_roles WHERE role_id = ?').run(roleId);

      // Delete role
      db.prepare('DELETE FROM roles WHERE id = ?').run(roleId);

      res.json({ success: true, message: 'Role deleted successfully' });
    } catch (error) {
      console.error('[Management] Delete role error:', error);
      res.status(500).json({ error: 'Failed to delete role' });
    }
  });

  // Role detail
  app.get('/directory/roles/:id', requireAuth, (req, res) => {
    try {
      const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(req.params.id);

      if (!role) {
        return res.status(404).render('error', {
          title: 'Not Found',
          error: 'Role not found'
        });
      }

      const users = db.prepare(`
        SELECT u.id, u.username, u.first_name, u.last_name, u.display_name, u.created_at
        FROM users u
        JOIN user_roles ur ON u.id = ur.user_id
        WHERE ur.role_id = ?
        ORDER BY u.created_at DESC
      `).all(req.params.id);

      const availableUsers = db.prepare(`
        SELECT u.id, u.username, u.first_name, u.last_name, u.display_name
        FROM users u
        WHERE u.id NOT IN (
          SELECT user_id FROM user_roles WHERE role_id = ?
        )
        ORDER BY u.username
      `).all(req.params.id);

      res.render('directory/role-detail', {
        title: `Role: ${(role as any).name}`,
        role,
        users,
        availableUsers,
        session: sessions.get(req.cookies?.['mgmt_session'])
      });
    } catch (error) {
      console.error('[Management] Role detail error:', error);
      res.status(500).render('error', {
        title: 'Error',
        error: 'Failed to load role details'
      });
    }
  });

  // Add user to role
  app.post('/directory/roles/:roleId/users/:userId', requireAuth, (req, res): void => {
    try {
      const roleId = sanitize(req.params.roleId);
      const userId = sanitize(req.params.userId);

      // Check if role exists
      const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(roleId);
      if (!role) {
        res.status(404).json({ error: 'Role not found' });
        return;
      }

      // Check if user exists
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Check if assignment already exists
      const existing = db.prepare('SELECT * FROM user_roles WHERE user_id = ? AND role_id = ?').get(userId, roleId);
      if (existing) {
        res.status(400).json({ error: 'User already has this role' });
        return;
      }

      // Add user to role
      db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)').run(userId, roleId);

      res.json({ success: true, message: 'User added to role successfully' });
    } catch (error) {
      console.error('[Management] Add user to role error:', error);
      res.status(500).json({ error: 'Failed to add user to role' });
    }
  });

  // Remove user from role
  app.post('/directory/roles/:roleId/users/:userId/remove', requireAuth, (req, res): void => {
    try {
      const roleId = sanitize(req.params.roleId);
      const userId = sanitize(req.params.userId);

      db.prepare('DELETE FROM user_roles WHERE user_id = ? AND role_id = ?').run(userId, roleId);

      res.json({ success: true, message: 'User removed from role successfully' });
    } catch (error) {
      console.error('[Management] Remove user from role error:', error);
      res.status(500).json({ error: 'Failed to remove user from role' });
    }
  });

  // Groups list
  app.get('/directory/groups', requireAuth, (req, res) => {
    try {
      const groups = db.prepare(`
        SELECT g.*, d.name as domain_name, COUNT(ug.user_id) as user_count
        FROM groups g
        JOIN domains d ON g.domain_id = d.id
        LEFT JOIN user_groups ug ON g.id = ug.group_id
        GROUP BY g.id
        ORDER BY g.created_at DESC
      `).all();

      res.render('directory/groups', {
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

  // New group form
  app.get('/directory/groups/new', requireAuth, (req, res) => {
    try {
      const domains = db.prepare('SELECT * FROM domains ORDER BY name').all();

      res.render('directory/group-form', {
        title: 'Create Group',
        group: null,
        domains,
        session: sessions.get(req.cookies?.['mgmt_session'])
      });
    } catch (error) {
      console.error('[Management] New group form error:', error);
      res.status(500).render('error', {
        title: 'Error',
        error: 'Failed to load form'
      });
    }
  });

  // Create group
  app.post('/directory/groups', requireAuth, (req, res): void => {
    try {
      const name = sanitize(req.body.name);
      const description = sanitize(req.body.description || '');
      const domainId = sanitize(req.body.domain_id);

      const domains = db.prepare('SELECT * FROM domains ORDER BY name').all();

      if (!name) {
        res.status(400).render('directory/group-form', {
          title: 'Create Group',
          group: null,
          domains,
          error: 'Group name is required',
          session: sessions.get(req.cookies?.['mgmt_session'])
        });
        return;
      }

      if (!domainId) {
        res.status(400).render('directory/group-form', {
          title: 'Create Group',
          group: null,
          domains,
          error: 'Domain is required',
          session: sessions.get(req.cookies?.['mgmt_session'])
        });
        return;
      }

      // Check if domain exists
      const domain = db.prepare('SELECT * FROM domains WHERE id = ?').get(domainId);
      if (!domain) {
        res.status(400).render('directory/group-form', {
          title: 'Create Group',
          group: null,
          domains,
          error: 'Invalid domain',
          session: sessions.get(req.cookies?.['mgmt_session'])
        });
        return;
      }

      // Check if group name already exists in domain
      const existing = db.prepare('SELECT * FROM groups WHERE name = ? AND domain_id = ?').get(name, domainId);
      if (existing) {
        res.status(400).render('directory/group-form', {
          title: 'Create Group',
          group: null,
          domains,
          error: 'Group name already exists in this domain',
          session: sessions.get(req.cookies?.['mgmt_session'])
        });
        return;
      }

      // Generate UUID for group
      const groupId = crypto.randomUUID();

      // Create group
      db.prepare('INSERT INTO groups (id, name, domain_id, description, created_at) VALUES (?, ?, ?, ?, ?)').run(
        groupId,
        name,
        domainId,
        description,
        new Date().toISOString()
      );

      res.redirect('/directory/groups');
    } catch (error) {
      console.error('[Management] Create group error:', error);
      const domains = db.prepare('SELECT * FROM domains ORDER BY name').all();
      res.status(500).render('directory/group-form', {
        title: 'Create Group',
        group: null,
        domains,
        error: 'Failed to create group',
        session: sessions.get(req.cookies?.['mgmt_session'])
      });
    }
  });

  // Edit group form
  app.get('/directory/groups/:id/edit', requireAuth, (req, res) => {
    try {
      const group = db.prepare(`
        SELECT g.*, d.name as domain_name
        FROM groups g
        JOIN domains d ON g.domain_id = d.id
        WHERE g.id = ?
      `).get(req.params.id);

      if (!group) {
        return res.status(404).render('error', {
          title: 'Not Found',
          error: 'Group not found'
        });
      }

      const domains = db.prepare('SELECT * FROM domains ORDER BY name').all();

      res.render('directory/group-form', {
        title: `Edit Group: ${(group as any).name}`,
        group,
        domains,
        session: sessions.get(req.cookies?.['mgmt_session'])
      });
    } catch (error) {
      console.error('[Management] Edit group form error:', error);
      res.status(500).render('error', {
        title: 'Error',
        error: 'Failed to load group'
      });
    }
  });

  // Update group
  app.post('/directory/groups/:id/update', requireAuth, (req, res): void => {
    try {
      const groupId = sanitize(req.params.id);
      const name = sanitize(req.body.name);
      const description = sanitize(req.body.description || '');
      const domainId = sanitize(req.body.domain_id);

      const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
      if (!group) {
        res.status(404).render('error', {
          title: 'Not Found',
          error: 'Group not found'
        });
        return;
      }

      const domains = db.prepare('SELECT * FROM domains ORDER BY name').all();

      if (!name) {
        res.status(400).render('directory/group-form', {
          title: `Edit Group: ${(group as any).name}`,
          group,
          domains,
          error: 'Group name is required',
          session: sessions.get(req.cookies?.['mgmt_session'])
        });
        return;
      }

      if (!domainId) {
        res.status(400).render('directory/group-form', {
          title: `Edit Group: ${(group as any).name}`,
          group,
          domains,
          error: 'Domain is required',
          session: sessions.get(req.cookies?.['mgmt_session'])
        });
        return;
      }

      // Check if domain exists
      const domain = db.prepare('SELECT * FROM domains WHERE id = ?').get(domainId);
      if (!domain) {
        res.status(400).render('directory/group-form', {
          title: `Edit Group: ${(group as any).name}`,
          group,
          domains,
          error: 'Invalid domain',
          session: sessions.get(req.cookies?.['mgmt_session'])
        });
        return;
      }

      // Check if group name already exists in domain (excluding current group)
      const existing = db.prepare('SELECT * FROM groups WHERE name = ? AND domain_id = ? AND id != ?').get(name, domainId, groupId);
      if (existing) {
        res.status(400).render('directory/group-form', {
          title: `Edit Group: ${(group as any).name}`,
          group,
          domains,
          error: 'Group name already exists in this domain',
          session: sessions.get(req.cookies?.['mgmt_session'])
        });
        return;
      }

      // Update group
      db.prepare('UPDATE groups SET name = ?, description = ?, domain_id = ? WHERE id = ?').run(name, description, domainId, groupId);

      res.redirect(`/directory/groups/${groupId}`);
    } catch (error) {
      console.error('[Management] Update group error:', error);
      res.status(500).json({ error: 'Failed to update group' });
    }
  });

  // Delete group
  app.post('/directory/groups/:id/delete', requireAuth, (req, res): void => {
    try {
      const groupId = sanitize(req.params.id);

      // Check if group exists
      const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
      if (!group) {
        res.status(404).json({ error: 'Group not found' });
        return;
      }

      // Delete group memberships first
      db.prepare('DELETE FROM user_groups WHERE group_id = ?').run(groupId);

      // Delete group
      db.prepare('DELETE FROM groups WHERE id = ?').run(groupId);

      res.json({ success: true, message: 'Group deleted successfully' });
    } catch (error) {
      console.error('[Management] Delete group error:', error);
      res.status(500).json({ error: 'Failed to delete group' });
    }
  });

  // Group detail
  app.get('/directory/groups/:id', requireAuth, (req, res) => {
    try {
      const group = db.prepare(`
        SELECT g.*, d.name as domain_name
        FROM groups g
        JOIN domains d ON g.domain_id = d.id
        WHERE g.id = ?
      `).get(req.params.id);

      if (!group) {
        return res.status(404).render('error', {
          title: 'Not Found',
          error: 'Group not found'
        });
      }

      const users = db.prepare(`
        SELECT u.id, u.username, u.first_name, u.last_name, u.display_name, u.created_at
        FROM users u
        JOIN user_groups ug ON u.id = ug.user_id
        WHERE ug.group_id = ?
        ORDER BY u.created_at DESC
      `).all(req.params.id);

      const availableUsers = db.prepare(`
        SELECT u.id, u.username, u.first_name, u.last_name, u.display_name
        FROM users u
        WHERE u.id NOT IN (
          SELECT user_id FROM user_groups WHERE group_id = ?
        )
        ORDER BY u.username
      `).all(req.params.id);

      res.render('directory/group-detail', {
        title: `Group: ${(group as any).name}`,
        group,
        users,
        availableUsers,
        session: sessions.get(req.cookies?.['mgmt_session'])
      });
    } catch (error) {
      console.error('[Management] Group detail error:', error);
      res.status(500).render('error', {
        title: 'Error',
        error: 'Failed to load group details'
      });
    }
  });

  // Add user to group
  app.post('/directory/groups/:groupId/users/:userId', requireAuth, (req, res): void => {
    try {
      const groupId = sanitize(req.params.groupId);
      const userId = sanitize(req.params.userId);

      // Check if group exists
      const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
      if (!group) {
        res.status(404).json({ error: 'Group not found' });
        return;
      }

      // Check if user exists
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Check if assignment already exists
      const existing = db.prepare('SELECT * FROM user_groups WHERE user_id = ? AND group_id = ?').get(userId, groupId);
      if (existing) {
        res.status(400).json({ error: 'User already in this group' });
        return;
      }

      // Add user to group
      db.prepare('INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)').run(userId, groupId);

      res.json({ success: true, message: 'User added to group successfully' });
    } catch (error) {
      console.error('[Management] Add user to group error:', error);
      res.status(500).json({ error: 'Failed to add user to group' });
    }
  });

  // Remove user from group
  app.post('/directory/groups/:groupId/users/:userId/remove', requireAuth, (req, res): void => {
    try {
      const groupId = sanitize(req.params.groupId);
      const userId = sanitize(req.params.userId);

      db.prepare('DELETE FROM user_groups WHERE user_id = ? AND group_id = ?').run(userId, groupId);

      res.json({ success: true, message: 'User removed from group successfully' });
    } catch (error) {
      console.error('[Management] Remove user from group error:', error);
      res.status(500).json({ error: 'Failed to remove user from group' });
    }
  });
}
