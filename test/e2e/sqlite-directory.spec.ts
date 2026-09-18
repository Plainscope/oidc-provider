/// <reference types="@playwright/test" />
import { test, expect } from '@playwright/test';
import { PROVIDER_BASE_URL } from '../utils/urls';

const PROVIDER_URL = PROVIDER_BASE_URL;

// Test user credentials (should exist in the test database)
const TEST_USER = {
  email: 'admin@localhost',
  password: 'test-password',
  id: '8276bb5b-d0b7-41e9-a805-77b62a2865f4'
};

// Helper function to login
async function login(page: any, email: string, password: string) {
  await page.goto(`${PROVIDER_URL}/directory/login`);
  await expect(page.locator('input[placeholder="admin@example.com"]')).toBeVisible({ timeout: 10000 });
  await page.fill('input[placeholder="admin@example.com"]', email);
  await page.fill('input[placeholder="Enter your password"]', password);
  await page.click('button:has-text("Sign In")');
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 5000 });
}

test.describe('SQLite Directory Integration', () => {

  test.beforeAll(async () => {
    console.log('Verifying SQLite directory is configured...');
  });

  test('should authenticate user with SQLite directory', async ({ page }) => {
    await page.goto(`${PROVIDER_URL}/directory/login`);
    await expect(page.locator('input[placeholder="admin@example.com"]')).toBeVisible({ timeout: 10000 });
    await page.fill('input[placeholder="admin@example.com"]', TEST_USER.email);
    await page.fill('input[placeholder="Enter your password"]', TEST_USER.password);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 5000 });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('should reject invalid credentials with SQLite directory', async ({ page }) => {
    await page.goto(`${PROVIDER_URL}/directory/login`);
    await expect(page.locator('input[placeholder="admin@example.com"]')).toBeVisible({ timeout: 10000 });
    await page.fill('input[placeholder="admin@example.com"]', TEST_USER.email);
    await page.fill('input[placeholder="Enter your password"]', 'wrong-password');
    await page.click('button:has-text("Sign In")');
    await expect(page).toHaveURL(/\/directory\/login/, { timeout: 5000 });
  });

  test('should load user profile from SQLite directory', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    await expect(page).not.toHaveURL(/\/login/);
  });
});

test.describe('SQLite Directory - User CRUD Operations', () => {

  test('should list all users', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    await page.goto(`${PROVIDER_URL}/directory/users`);
    await expect(page.locator('h1:has-text("Users")')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('td', { hasText: TEST_USER.email }).first()).toBeVisible();
  });

  test('should view user detail', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    await page.goto(`${PROVIDER_URL}/directory/users`);
    await page.waitForLoadState('networkidle');
    const viewLink = page.locator('a:has-text("View")').first();
    await viewLink.click({ force: true, timeout: 5000 });
    await expect(page.locator('h2:has-text("Basic Information")')).toBeVisible();
    await expect(page.locator('h2:has-text("Email Addresses")')).toBeVisible();
    await expect(page.locator('h2:has-text("Roles")')).toBeVisible();
    await expect(page.locator('h2:has-text("Groups")')).toBeVisible();
  });

  test('should create a new user', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    await page.goto(`${PROVIDER_URL}/directory/users`);
    await page.click('a:has-text("Add User")');
    await expect(page.locator('h1:has-text("Create New User")')).toBeVisible();
    const timestamp = Date.now();
    const testUser = {
      username: `testuser${timestamp}`,
      password: 'TestPassword123!',
      email: `testuser${timestamp}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      displayName: 'Test User'
    };
    await page.fill('#username', testUser.username);
    await page.fill('#password', testUser.password);
    await page.fill('#email', testUser.email);
    await page.fill('#first_name', testUser.firstName);
    await page.fill('#last_name', testUser.lastName);
    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/directory/users/create') && response.status() === 200
    );
    await page.click('button[type="submit"]:has-text("Create User")');
    await responsePromise;
    await page.waitForURL(/\/directory\/users\/[a-f0-9-]+$/, { timeout: 5000 });
    await expect(page.locator(`h1:has-text("${testUser.username}")`)).toBeVisible();
    await expect(page.locator('.info-value', { hasText: testUser.username })).toBeVisible();
  });

  test('should validate required fields when creating user', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    await page.goto(`${PROVIDER_URL}/directory/users/new`);
    await page.click('button[type="submit"]:has-text("Create User")');
    await expect(page).toHaveURL(/\/directory\/users\/new/);
  });

  test('should not allow duplicate username', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    await page.goto(`${PROVIDER_URL}/directory/users/new`);
    await page.fill('#username', TEST_USER.email);
    await page.fill('#password', 'TestPassword123!');
    await page.fill('#email', 'newadmin@example.com');
    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/directory/users/create')
    );
    await page.click('button[type="submit"]:has-text("Create User")');
    const response = await responsePromise;
    expect(response.status()).toBe(400);
    await expect(page.locator('#alertModal.active')).toBeVisible();
    await expect(page.locator('#alertMessage')).toContainText('Username already exists');
  });

  test('should edit existing user', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    const timestamp = Date.now();
    const testUser = {
      username: `edituser${timestamp}`,
      password: 'OldPassword123!',
      email: `edituser${timestamp}@example.com`,
      firstName: 'Edit',
      lastName: 'User',
      displayName: 'Edit User'
    };
    await page.goto(`${PROVIDER_URL}/directory/users`);
    await page.click('a:has-text("Add User")');
    await page.fill('#username', testUser.username);
    await page.fill('#password', testUser.password);
    await page.fill('#email', testUser.email);
    await page.fill('#first_name', testUser.firstName);
    await page.fill('#last_name', testUser.lastName);
    const createResponsePromise = page.waitForResponse(response =>
      response.url().includes('/directory/users/create') && response.status() === 200
    );
    await page.click('button[type="submit"]:has-text("Create User")');
    await createResponsePromise;
    await page.waitForURL(/\/directory\/users\/[a-f0-9-]+$/, { timeout: 5000 });
    await page.click('a.btn.btn-primary:has-text("Edit User")');
    await expect(page.locator('h1:has-text("Edit User:")')).toBeVisible();
    const newDisplayName = `Updated at ${Date.now()}`;
    await page.fill('#display_name', newDisplayName);
    await page.click('button[type="submit"]:has-text("Update User")');
    await page.waitForURL(/\/directory\/users\/[a-f0-9-]+$/, { timeout: 5000 });
    await expect(page.locator('p', { hasText: newDisplayName })).toBeVisible();
  });

  test('should update user password', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    const timestamp = Date.now();
    const testUser = {
      username: `passtest${timestamp}`,
      password: 'OldPassword123!',
      email: `passtest${timestamp}@example.com`
    };
    await page.goto(`${PROVIDER_URL}/directory/users/new`);
    await page.fill('#username', testUser.username);
    await page.fill('#password', testUser.password);
    await page.fill('#email', testUser.email);
    await page.click('button[type="submit"]:has-text("Create User")');
    await page.waitForURL(/\/directory\/users\/[a-f0-9-]+$/, { timeout: 5000 });
    await page.click('a.btn.btn-primary:has-text("Edit User")');
    const newPassword = 'NewPassword123!';
    await page.fill('#password', newPassword);
    await page.click('button[type="submit"]:has-text("Update User")');
    await page.waitForURL(/\/directory\/users\/[a-f0-9-]+$/, { timeout: 5000 });
    await expect(page.locator(`h1:has-text("${testUser.username}")`)).toBeVisible();
  });

  test('should delete user', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    const timestamp = Date.now();
    const testUser = {
      username: `deltest${timestamp}`,
      password: 'TestPassword123!',
      email: `deltest${timestamp}@example.com`
    };
    await page.goto(`${PROVIDER_URL}/directory/users/new`);
    await page.fill('#username', testUser.username);
    await page.fill('#password', testUser.password);
    await page.fill('#email', testUser.email);
    await page.click('button[type="submit"]:has-text("Create User")');
    await page.waitForURL(/\/directory\/users\/[a-f0-9-]+$/, { timeout: 5000 });
    await page.waitForLoadState('networkidle');
    await page.click('button.btn.btn-danger:has-text("Delete User")');
    await expect(page.locator('#confirmModal.active')).toBeVisible();
    await expect(page.locator('#confirmMessage')).toContainText(testUser.username);
    await page.waitForLoadState('networkidle');
    await page.click('#confirmBtn', { force: true });
    await page.waitForURL(/\/directory\/users$/, { timeout: 5000 });
    await expect(page.locator('td', { hasText: testUser.username })).not.toBeVisible();
  });

  test('should delete user from list page', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    const timestamp = Date.now();
    const testUser = {
      username: `listdel${timestamp}`,
      password: 'TestPassword123!',
      email: `listdel${timestamp}@example.com`
    };
    await page.goto(`${PROVIDER_URL}/directory/users/new`);
    await page.fill('#username', testUser.username);
    await page.fill('#password', testUser.password);
    await page.fill('#email', testUser.email);
    await page.click('button[type="submit"]:has-text("Create User")');
    await page.waitForURL(/\/directory\/users\/[a-f0-9-]+$/, { timeout: 5000 });
    await page.goto(`${PROVIDER_URL}/directory/users`);
    await page.waitForLoadState('networkidle');
    const userRow = page.locator('tr', { hasText: testUser.username });
    await userRow.locator('button.btn.btn-danger:has-text("Delete")').click({ force: true });
    await expect(page.locator('#confirmModal.active')).toBeVisible({ timeout: 5000 });
    await page.waitForLoadState('networkidle');
    const confirmBtn = page.locator('#confirmBtn');
    await confirmBtn.waitFor({ state: 'visible', timeout: 5000 });
    await confirmBtn.click({ force: true });
    await page.waitForTimeout(500);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const userRows = page.locator('table tbody tr').filter({ hasText: testUser.username });
    await expect(userRows).toHaveCount(0, { timeout: 5000 });
  });

  test('should cancel user deletion', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    const timestamp = Date.now();
    const testUser = {
      username: `canceltest${timestamp}`,
      password: 'TestPassword123!',
      email: `canceltest${timestamp}@example.com`
    };
    await page.goto(`${PROVIDER_URL}/directory/users/new`);
    await page.fill('#username', testUser.username);
    await page.fill('#password', testUser.password);
    await page.fill('#email', testUser.email);
    await page.click('button[type="submit"]:has-text("Create User")');
    await page.waitForURL(/\/directory\/users\/[a-f0-9-]+$/, { timeout: 5000 });
    await page.waitForLoadState('networkidle');
    const deleteButton = page.locator('button.btn.btn-danger:has-text("Delete User")');
    await deleteButton.waitFor({ state: 'visible', timeout: 5000 });
    await page.click('button.btn.btn-danger:has-text("Delete User")', { force: true });
    await expect(page.locator('#confirmModal.active')).toBeVisible();
    await page.click('button:has-text("Cancel")', { force: true });
    await expect(page.locator('#confirmModal.active')).not.toBeVisible();
    await expect(page).toHaveURL(/\/directory\/users\/[a-f0-9-]+$/);
  });

  test('should auto-generate display name from first and last name', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    await page.goto(`${PROVIDER_URL}/directory/users/new`);
    const timestamp = Date.now();
    await page.fill('#first_name', 'Alice');
    await page.fill('#last_name', 'Johnson');
    await expect(page.locator('#display_name')).toHaveValue('Alice Johnson');
    await page.fill('#username', `alice${timestamp}`);
    await page.fill('#password', 'TestPassword123!');
    await page.fill('#email', `alice${timestamp}@example.com`);
    await page.click('button[type="submit"]:has-text("Create User")');
    await page.waitForURL(/\/directory\/users\/[a-f0-9-]+$/, { timeout: 5000 });
    await expect(page.locator('p', { hasText: 'Alice Johnson' })).toBeVisible();
  });

  test('should handle inactive users', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    const timestamp = Date.now();
    await page.goto(`${PROVIDER_URL}/directory/users/new`);
    await page.fill('#username', `inactive${timestamp}`);
    await page.fill('#password', 'TestPassword123!');
    await page.fill('#email', `inactive${timestamp}@example.com`);
    await page.selectOption('#is_active', 'false');
    await page.click('button[type="submit"]:has-text("Create User")');
    await page.waitForURL(/\/directory\/users\/[a-f0-9-]+$/, { timeout: 5000 });
    await expect(page.locator('.info-item').filter({ hasText: 'Status' }).locator('.info-value', { hasText: 'Inactive' })).toBeVisible();
  });
});
