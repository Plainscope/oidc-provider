/**
 * Integration tests for SQLite directory management routes
 * Using CommonJS directly to avoid TypeScript transpilation issues
 */
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const express = require('express');
const cookieParser = require('cookie-parser');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const request = require('supertest');

// Import from compiled provider code using absolute paths
const providerDist = path.resolve(__dirname, '../../src/provider/dist');
const { registerManagementRoutes } = require(path.join(providerDist, 'routes/directory'));
const { SqliteDirectory } = require(path.join(providerDist, 'directories/sqlite-directory'));

const DB_PATH = path.join(os.tmpdir(), 'sqlite-mgmt-routes.db');
const ADMIN_EMAIL = 'admin@localhost';
const ADMIN_PASSWORD = 'Rays-93-Accident';
const ADMIN_ID = '8276bb5b-d0b7-41e9-a805-77b62a2865f4';
const DOMAIN_ID = '00000000-0000-0000-0000-000000000001';

function resetDbFile() {
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }
}

function seedDatabase(db) {
  db.pragma('foreign_keys = ON');
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

  const hashedPassword = bcrypt.hashSync(ADMIN_PASSWORD, 10);

  db.prepare('INSERT INTO domains (id, name, description, is_default) VALUES (?, ?, ?, 1)')
    .run(DOMAIN_ID, 'localhost', 'Default domain');

  db.prepare(`INSERT INTO users (id, username, password, first_name, last_name, display_name, domain_id, is_active)
              VALUES (?, ?, ?, ?, ?, ?, ?, 1)`)
    .run(ADMIN_ID, 'admin', hashedPassword, 'Admin', 'User', 'Admin User', DOMAIN_ID);

  db.prepare('INSERT INTO user_emails (id, user_id, email, is_primary, is_verified) VALUES (?, ?, ?, 1, 1)')
    .run('00000000-0000-0000-0000-000000000002', ADMIN_ID, ADMIN_EMAIL);

  db.prepare('INSERT INTO roles (id, name, description) VALUES (?, ?, ?)')
    .run('00000000-0000-0000-0000-000000000003', 'admin', 'Administrator role');

  db.prepare('INSERT INTO user_roles (id, user_id, role_id) VALUES (?, ?, ?)')
    .run('00000000-0000-0000-0000-000000000004', ADMIN_ID, '00000000-0000-0000-0000-000000000003');
}

function buildApp() {
  resetDbFile();
  const db = new Database(DB_PATH);
  seedDatabase(db);

  const directory = new SqliteDirectory(DB_PATH);
  const app = express();
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.set('view engine', 'pug');
  app.set('views', path.resolve(__dirname, '../../src/provider/src/views'));

  registerManagementRoutes(app, directory, db);

  return { db, directory, agent: request.agent(app) };
}

async function login(agent) {
  const res = await agent
    .post('/directory/login')
    .type('form')
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

  const cookies = res.headers['set-cookie'];
  assert.strictEqual(res.status, 302);
  assert.ok(Array.isArray(cookies) && cookies.some(c => c.includes('mgmt_session=')));
}

describe('Directory Management Routes (SQLite)', () => {
  let ctx;

  beforeEach(() => {
    ctx = buildApp();
  });

  afterEach(() => {
    ctx?.directory.close();
    ctx?.db.close();
    resetDbFile();
  });

  it('authenticates admin and issues session cookie', async () => {
    assert.ok(ctx);
    await login(ctx.agent);
  });

  it('creates, updates, and deletes roles', async () => {
    assert.ok(ctx);
    await login(ctx.agent);

    const createRes = await ctx.agent
      .post('/directory/roles')
      .type('form')
      .send({ name: 'auditor', description: 'Audits things' });
    assert.strictEqual(createRes.status, 302);

    const createdRole = ctx.db.prepare('SELECT * FROM roles WHERE name = ?').get('auditor');
    assert.ok(createdRole?.id, 'role should be created');

    const updateRes = await ctx.agent
      .post(`/directory/roles/${createdRole.id}/update`)
      .type('form')
      .send({ name: 'auditor-updated', description: 'Updated description' });
    assert.strictEqual(updateRes.status, 302);

    const updatedRole = ctx.db.prepare('SELECT * FROM roles WHERE id = ?').get(createdRole.id);
    assert.strictEqual(updatedRole.name, 'auditor-updated');

    ctx.db.prepare('INSERT INTO user_roles (id, user_id, role_id) VALUES (?, ?, ?)')
      .run('00000000-0000-0000-0000-000000000055', ADMIN_ID, createdRole.id);

    const deleteRes = await ctx.agent.post(`/directory/roles/${createdRole.id}/delete`);
    assert.strictEqual(deleteRes.status, 200);

    const deletedRole = ctx.db.prepare('SELECT * FROM roles WHERE id = ?').get(createdRole.id);
    assert.strictEqual(deletedRole, undefined);

    const orphanedAssignment = ctx.db.prepare('SELECT * FROM user_roles WHERE role_id = ?').get(createdRole.id);
    assert.strictEqual(orphanedAssignment, undefined);
  });

  it('creates, updates, and deletes groups with domain validation', async () => {
    assert.ok(ctx);
    await login(ctx.agent);

    const createRes = await ctx.agent
      .post('/directory/groups')
      .type('form')
      .send({ name: 'developers', description: 'Dev team', domain_id: DOMAIN_ID });
    assert.strictEqual(createRes.status, 302);

    const group = ctx.db.prepare('SELECT * FROM groups WHERE name = ?').get('developers');
    assert.ok(group?.id, 'group should be created');

    const updateRes = await ctx.agent
      .post(`/directory/groups/${group.id}/update`)
      .type('form')
      .send({ name: 'engineers', description: 'Updated team', domain_id: DOMAIN_ID });
    assert.strictEqual(updateRes.status, 302);

    const updatedGroup = ctx.db.prepare('SELECT * FROM groups WHERE id = ?').get(group.id);
    assert.strictEqual(updatedGroup.name, 'engineers');

    ctx.db.prepare('INSERT INTO user_groups (id, user_id, group_id) VALUES (?, ?, ?)')
      .run('00000000-0000-0000-0000-000000000077', ADMIN_ID, group.id);

    const deleteRes = await ctx.agent.post(`/directory/groups/${group.id}/delete`);
    assert.strictEqual(deleteRes.status, 200);

    const deletedGroup = ctx.db.prepare('SELECT * FROM groups WHERE id = ?').get(group.id);
    assert.strictEqual(deletedGroup, undefined);

    const orphanedMembership = ctx.db.prepare('SELECT * FROM user_groups WHERE group_id = ?').get(group.id);
    assert.strictEqual(orphanedMembership, undefined);
  });

  it('manages user role and group assignments', async () => {
    assert.ok(ctx);
    await login(ctx.agent);

    const roleRes = await ctx.agent
      .post('/directory/roles')
      .type('form')
      .send({ name: 'contributor', description: 'Contributor role' });
    assert.strictEqual(roleRes.status, 302);
    const role = ctx.db.prepare('SELECT * FROM roles WHERE name = ?').get('contributor');

    const groupRes = await ctx.agent
      .post('/directory/groups')
      .type('form')
      .send({ name: 'qa', description: 'QA group', domain_id: DOMAIN_ID });
    assert.strictEqual(groupRes.status, 302);
    const group = ctx.db.prepare('SELECT * FROM groups WHERE name = ?').get('qa');

    const addRoleRes = await ctx.agent.post(`/directory/users/${ADMIN_ID}/roles/${role.id}`);
    assert.strictEqual(addRoleRes.status, 200);
    const roleAssignment = ctx.db.prepare('SELECT * FROM user_roles WHERE user_id = ? AND role_id = ?').get(ADMIN_ID, role.id);
    assert.ok(roleAssignment, 'role assignment should exist');

    const addGroupRes = await ctx.agent.post(`/directory/users/${ADMIN_ID}/groups/${group.id}`);
    assert.strictEqual(addGroupRes.status, 200);
    const groupAssignment = ctx.db.prepare('SELECT * FROM user_groups WHERE user_id = ? AND group_id = ?').get(ADMIN_ID, group.id);
    assert.ok(groupAssignment, 'group assignment should exist');

    const removeRoleRes = await ctx.agent.post(`/directory/users/${ADMIN_ID}/roles/${role.id}/remove`);
    assert.strictEqual(removeRoleRes.status, 200);
    const removedRole = ctx.db.prepare('SELECT * FROM user_roles WHERE user_id = ? AND role_id = ?').get(ADMIN_ID, role.id);
    assert.strictEqual(removedRole, undefined);

    const removeGroupRes = await ctx.agent.post(`/directory/users/${ADMIN_ID}/groups/${group.id}/remove`);
    assert.strictEqual(removeGroupRes.status, 200);
    const removedGroup = ctx.db.prepare('SELECT * FROM user_groups WHERE user_id = ? AND group_id = ?').get(ADMIN_ID, group.id);
    assert.strictEqual(removedGroup, undefined);
  });

  it('accesses dashboard and list views', async () => {
    assert.ok(ctx);
    await login(ctx.agent);

    const dashRes = await ctx.agent.get('/directory');
    assert.strictEqual(dashRes.status, 200);
    assert.ok(dashRes.text.includes('Directory Management') || dashRes.text.includes('stats'));

    const usersRes = await ctx.agent.get('/directory/users');
    assert.strictEqual(usersRes.status, 200);

    const rolesRes = await ctx.agent.get('/directory/roles');
    assert.strictEqual(rolesRes.status, 200);

    const groupsRes = await ctx.agent.get('/directory/groups');
    assert.strictEqual(groupsRes.status, 200);
  });

  it('displays role and group detail pages', async () => {
    assert.ok(ctx);
    await login(ctx.agent);

    const roleRes = await ctx.agent
      .post('/directory/roles')
      .type('form')
      .send({ name: 'viewer', description: 'View-only role' });
    assert.strictEqual(roleRes.status, 302);
    const role = ctx.db.prepare('SELECT * FROM roles WHERE name = ?').get('viewer');

    const groupRes = await ctx.agent
      .post('/directory/groups')
      .type('form')
      .send({ name: 'customers', description: 'Customer group', domain_id: DOMAIN_ID });
    assert.strictEqual(groupRes.status, 302);
    const group = ctx.db.prepare('SELECT * FROM groups WHERE name = ?').get('customers');

    const roleDetailRes = await ctx.agent.get(`/directory/roles/${role.id}`);
    assert.strictEqual(roleDetailRes.status, 200);

    const groupDetailRes = await ctx.agent.get(`/directory/groups/${group.id}`);
    assert.strictEqual(groupDetailRes.status, 200);
  });

  it('rejects duplicate role names', async () => {
    assert.ok(ctx);
    await login(ctx.agent);

    const createRes1 = await ctx.agent
      .post('/directory/roles')
      .type('form')
      .send({ name: 'unique-role', description: 'First' });
    assert.strictEqual(createRes1.status, 302);

    const createRes2 = await ctx.agent
      .post('/directory/roles')
      .type('form')
      .send({ name: 'unique-role', description: 'Second' });
    assert.strictEqual(createRes2.status, 400);
  });

  it('rejects duplicate group names in same domain', async () => {
    assert.ok(ctx);
    await login(ctx.agent);

    const createRes1 = await ctx.agent
      .post('/directory/groups')
      .type('form')
      .send({ name: 'same-domain-group', description: 'First', domain_id: DOMAIN_ID });
    assert.strictEqual(createRes1.status, 302);

    const createRes2 = await ctx.agent
      .post('/directory/groups')
      .type('form')
      .send({ name: 'same-domain-group', description: 'Second', domain_id: DOMAIN_ID });
    assert.strictEqual(createRes2.status, 400);
  });

  it('rejects role creation with empty name', async () => {
    assert.ok(ctx);
    await login(ctx.agent);

    const createRes = await ctx.agent
      .post('/directory/roles')
      .type('form')
      .send({ name: '', description: 'Empty name' });
    assert.strictEqual(createRes.status, 400);
  });

  it('rejects group creation with empty name or domain', async () => {
    assert.ok(ctx);
    await login(ctx.agent);

    const noNameRes = await ctx.agent
      .post('/directory/groups')
      .type('form')
      .send({ name: '', description: 'No name', domain_id: DOMAIN_ID });
    assert.strictEqual(noNameRes.status, 400);

    const noDomainRes = await ctx.agent
      .post('/directory/groups')
      .type('form')
      .send({ name: 'valid-name', description: 'No domain', domain_id: '' });
    assert.strictEqual(noDomainRes.status, 400);
  });

  it('handles non-existent role edits and deletes', async () => {
    assert.ok(ctx);
    await login(ctx.agent);

    const fakeId = '00000000-0000-0000-0000-000000000099';

    const editRes = await ctx.agent.get(`/directory/roles/${fakeId}/edit`);
    assert.strictEqual(editRes.status, 404);

    const detailRes = await ctx.agent.get(`/directory/roles/${fakeId}`);
    assert.strictEqual(detailRes.status, 404);

    const deleteRes = await ctx.agent.post(`/directory/roles/${fakeId}/delete`);
    assert.strictEqual(deleteRes.status, 404);
  });

  it('handles non-existent group edits and deletes', async () => {
    assert.ok(ctx);
    await login(ctx.agent);

    const fakeId = '00000000-0000-0000-0000-000000000098';

    const editRes = await ctx.agent.get(`/directory/groups/${fakeId}/edit`);
    assert.strictEqual(editRes.status, 404);

    const detailRes = await ctx.agent.get(`/directory/groups/${fakeId}`);
    assert.strictEqual(detailRes.status, 404);

    const deleteRes = await ctx.agent.post(`/directory/groups/${fakeId}/delete`);
    assert.strictEqual(deleteRes.status, 404);
  });

  it('prevents duplicate role assignments', async () => {
    assert.ok(ctx);
    await login(ctx.agent);

    const roleRes = await ctx.agent
      .post('/directory/roles')
      .type('form')
      .send({ name: 'duplicate-test-role', description: 'For duplicate test' });
    assert.strictEqual(roleRes.status, 302);
    const role = ctx.db.prepare('SELECT * FROM roles WHERE name = ?').get('duplicate-test-role');

    const addRes1 = await ctx.agent.post(`/directory/users/${ADMIN_ID}/roles/${role.id}`);
    assert.strictEqual(addRes1.status, 200);

    const addRes2 = await ctx.agent.post(`/directory/users/${ADMIN_ID}/roles/${role.id}`);
    assert.strictEqual(addRes2.status, 400);
  });

  it('prevents duplicate group assignments', async () => {
    assert.ok(ctx);
    await login(ctx.agent);

    const groupRes = await ctx.agent
      .post('/directory/groups')
      .type('form')
      .send({ name: 'duplicate-test-group', description: 'For duplicate test', domain_id: DOMAIN_ID });
    assert.strictEqual(groupRes.status, 302);
    const group = ctx.db.prepare('SELECT * FROM groups WHERE name = ?').get('duplicate-test-group');

    const addRes1 = await ctx.agent.post(`/directory/users/${ADMIN_ID}/groups/${group.id}`);
    assert.strictEqual(addRes1.status, 200);

    const addRes2 = await ctx.agent.post(`/directory/users/${ADMIN_ID}/groups/${group.id}`);
    assert.strictEqual(addRes2.status, 400);
  });

  it('handles non-existent user/role/group assignments', async () => {
    assert.ok(ctx);
    await login(ctx.agent);

    const fakeUserId = '00000000-0000-0000-0000-000000000097';
    const fakeRoleId = '00000000-0000-0000-0000-000000000096';
    const fakeGroupId = '00000000-0000-0000-0000-000000000095';

    const badUserRole = await ctx.agent.post(`/directory/users/${fakeUserId}/roles/${fakeRoleId}`);
    assert.strictEqual(badUserRole.status, 404);

    const badUserGroup = await ctx.agent.post(`/directory/users/${fakeUserId}/groups/${fakeGroupId}`);
    assert.strictEqual(badUserGroup.status, 404);
  });

  it('adds and removes users from role detail page', async () => {
    assert.ok(ctx);
    await login(ctx.agent);

    const roleRes = await ctx.agent
      .post('/directory/roles')
      .type('form')
      .send({ name: 'role-for-user-mgmt', description: 'User management test' });
    assert.strictEqual(roleRes.status, 302);
    const role = ctx.db.prepare('SELECT * FROM roles WHERE name = ?').get('role-for-user-mgmt');

    const addRes = await ctx.agent.post(`/directory/roles/${role.id}/users/${ADMIN_ID}`);
    assert.strictEqual(addRes.status, 200);
    const assignment = ctx.db.prepare('SELECT * FROM user_roles WHERE role_id = ? AND user_id = ?').get(role.id, ADMIN_ID);
    assert.ok(assignment, 'user should be assigned to role');

    const removeRes = await ctx.agent.post(`/directory/roles/${role.id}/users/${ADMIN_ID}/remove`);
    assert.strictEqual(removeRes.status, 200);
    const removed = ctx.db.prepare('SELECT * FROM user_roles WHERE role_id = ? AND user_id = ?').get(role.id, ADMIN_ID);
    assert.strictEqual(removed, undefined, 'user should be removed from role');
  });

  it('adds and removes users from group detail page', async () => {
    assert.ok(ctx);
    await login(ctx.agent);

    const groupRes = await ctx.agent
      .post('/directory/groups')
      .type('form')
      .send({ name: 'group-for-user-mgmt', description: 'User management test', domain_id: DOMAIN_ID });
    assert.strictEqual(groupRes.status, 302);
    const group = ctx.db.prepare('SELECT * FROM groups WHERE name = ?').get('group-for-user-mgmt');

    const addRes = await ctx.agent.post(`/directory/groups/${group.id}/users/${ADMIN_ID}`);
    assert.strictEqual(addRes.status, 200);
    const membership = ctx.db.prepare('SELECT * FROM user_groups WHERE group_id = ? AND user_id = ?').get(group.id, ADMIN_ID);
    assert.ok(membership, 'user should be added to group');

    const removeRes = await ctx.agent.post(`/directory/groups/${group.id}/users/${ADMIN_ID}/remove`);
    assert.strictEqual(removeRes.status, 200);
    const removed = ctx.db.prepare('SELECT * FROM user_groups WHERE group_id = ? AND user_id = ?').get(group.id, ADMIN_ID);
    assert.strictEqual(removed, undefined, 'user should be removed from group');
  });

  it('updates role with unique name validation', async () => {
    assert.ok(ctx);
    await login(ctx.agent);

    const role1Res = await ctx.agent
      .post('/directory/roles')
      .type('form')
      .send({ name: 'original-name', description: 'First role' });
    assert.strictEqual(role1Res.status, 302);
    const role1 = ctx.db.prepare('SELECT * FROM roles WHERE name = ?').get('original-name');

    const role2Res = await ctx.agent
      .post('/directory/roles')
      .type('form')
      .send({ name: 'another-name', description: 'Second role' });
    assert.strictEqual(role2Res.status, 302);
    const role2 = ctx.db.prepare('SELECT * FROM roles WHERE name = ?').get('another-name');

    const conflictRes = await ctx.agent
      .post(`/directory/roles/${role1.id}/update`)
      .type('form')
      .send({ name: 'another-name', description: 'Trying to conflict' });
    assert.strictEqual(conflictRes.status, 400);
  });

  it('updates group with unique name per domain validation', async () => {
    assert.ok(ctx);
    await login(ctx.agent);

    const group1Res = await ctx.agent
      .post('/directory/groups')
      .type('form')
      .send({ name: 'original-group', description: 'First group', domain_id: DOMAIN_ID });
    assert.strictEqual(group1Res.status, 302);
    const group1 = ctx.db.prepare('SELECT * FROM groups WHERE name = ?').get('original-group');

    const group2Res = await ctx.agent
      .post('/directory/groups')
      .type('form')
      .send({ name: 'another-group', description: 'Second group', domain_id: DOMAIN_ID });
    assert.strictEqual(group2Res.status, 302);
    const group2 = ctx.db.prepare('SELECT * FROM groups WHERE name = ?').get('another-group');

    const conflictRes = await ctx.agent
      .post(`/directory/groups/${group1.id}/update`)
      .type('form')
      .send({ name: 'another-group', description: 'Trying to conflict', domain_id: DOMAIN_ID });
    assert.strictEqual(conflictRes.status, 400);
  });

  it('rejects invalid domain on group creation and update', async () => {
    assert.ok(ctx);
    await login(ctx.agent);

    const invalidDomainId = '00000000-0000-0000-0000-000000000094';

    const createRes = await ctx.agent
      .post('/directory/groups')
      .type('form')
      .send({ name: 'invalid-domain-group', description: 'Bad domain', domain_id: invalidDomainId });
    assert.strictEqual(createRes.status, 400);

    const groupRes = await ctx.agent
      .post('/directory/groups')
      .type('form')
      .send({ name: 'valid-group', description: 'Valid first', domain_id: DOMAIN_ID });
    assert.strictEqual(groupRes.status, 302);
    const group = ctx.db.prepare('SELECT * FROM groups WHERE name = ?').get('valid-group');

    const updateRes = await ctx.agent
      .post(`/directory/groups/${group.id}/update`)
      .type('form')
      .send({ name: 'valid-group', description: 'Now invalid domain', domain_id: invalidDomainId });
    assert.strictEqual(updateRes.status, 400);
  });

  it('logout clears session', async () => {
    assert.ok(ctx);
    await login(ctx.agent);

    const logoutRes = await ctx.agent.get('/directory/logout');
    assert.strictEqual(logoutRes.status, 302);

    const redirectRes = await ctx.agent.get('/directory/logout').redirects(0);
    assert.ok(redirectRes.headers['set-cookie']?.some(c => c.includes('mgmt_session=')));
  });
});
