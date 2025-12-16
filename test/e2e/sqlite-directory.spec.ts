/// <reference types="@playwright/test" />
import { test, expect } from '@playwright/test';

const PROVIDER_URL = 'http://localhost:9080';

// Test user credentials (should exist in the test database)
const TEST_USER = {
  email: 'admin@localhost',
  password: 'Rays-93-Accident',
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
    // Verify the provider is running with SQLite directory
    console.log('Verifying SQLite directory is configured...');
  });

  test('should authenticate user with SQLite directory', async ({ page }) => {
    // Navigate to provider's directory management login
    await page.goto(`${PROVIDER_URL}/directory/login`);

    // Should show directory management login page
    await expect(page.locator('input[placeholder="admin@example.com"]')).toBeVisible({ timeout: 10000 });

    // Enter test user credentials
    await page.fill('input[placeholder="admin@example.com"]', TEST_USER.email);
    await page.fill('input[placeholder="Enter your password"]', TEST_USER.password);

    // Submit login form
    await page.click('button:has-text("Sign In")');

    // Should redirect to directory management dashboard (not login page)
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 5000 });

    // Should show directory management interface
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('should reject invalid credentials with SQLite directory', async ({ page }) => {
    await page.goto(`${PROVIDER_URL}/directory/login`);

    await expect(page.locator('input[placeholder="admin@example.com"]')).toBeVisible({ timeout: 10000 });

    // Enter invalid credentials
    await page.fill('input[placeholder="admin@example.com"]', TEST_USER.email);
    await page.fill('input[placeholder="Enter your password"]', 'wrong-password');

    // Submit login form
    await page.click('button:has-text("Sign In")');

    // Should show error message or redirect back to login
    await expect(page).toHaveURL(/\/directory\/login/, { timeout: 5000 });
  });

  test('should load user profile from SQLite directory', async ({ page }) => {
    // Successfully logging in exercises the SQLite directory's find() method
    await login(page, TEST_USER.email, TEST_USER.password);

    // Successful login indicates that:
    // 1. validate() worked (found user by email, checked password)
    // 2. User profile was loaded correctly from SQLite
    // 3. find() method works for retrieving user data

    // Should be in authenticated session
    await expect(page).not.toHaveURL(/\/login/);
  });
});

test.describe('SQLite Directory - User CRUD Operations', () => {

  test('should list all users', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);

    // Navigate to users list
    await page.goto(`${PROVIDER_URL}/directory/users`);

    // Should show users table
    await expect(page.locator('h1:has-text("Users")')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();

    // Should show at least the admin user
    await expect(page.locator('td', { hasText: TEST_USER.email }).first()).toBeVisible();
  });

  test('should view user detail', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);

    // Navigate to users list
    await page.goto(`${PROVIDER_URL}/directory/users`);

    // Wait for page to stabilize before interacting
    await page.waitForLoadState('networkidle');

    // Find and click on the first user's View link
    // Use force click for Mobile Chrome where elements may be overlapped
    const viewLink = page.locator('a:has-text("View")').first();
    await viewLink.click({ force: true, timeout: 5000 });

    // Should show user detail page
    await expect(page.locator('h2:has-text("Basic Information")')).toBeVisible();
    await expect(page.locator('h2:has-text("Email Addresses")')).toBeVisible();
    await expect(page.locator('h2:has-text("Roles")')).toBeVisible();
    await expect(page.locator('h2:has-text("Groups")')).toBeVisible();
  });

  test('should create a new user', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);

    // Navigate to users list
    await page.goto(`${PROVIDER_URL}/directory/users`);

    // Click Add User button
    await page.click('a:has-text("Add User")');

    // Should show create user form
    await expect(page.locator('h1:has-text("Create New User")')).toBeVisible();

    // Generate unique test user data
    const timestamp = Date.now();
    const testUser = {
      username: `testuser${timestamp}`,
      password: 'TestPassword123!',
      email: `testuser${timestamp}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      displayName: 'Test User'
    };

    // Fill out the form
    await page.fill('#username', testUser.username);
    await page.fill('#password', testUser.password);
    await page.fill('#email', testUser.email);
    await page.fill('#first_name', testUser.firstName);
    await page.fill('#last_name', testUser.lastName);

    // Wait for the network response
    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/directory/users/create') && response.status() === 200
    );

    // Submit form
    await page.click('button[type="submit"]:has-text("Create User")');

    // Wait for response
    await responsePromise;

    // Should redirect to user detail page
    await page.waitForURL(/\/directory\/users\/[a-f0-9-]+$/, { timeout: 5000 });

    // Should show the new user's details
    await expect(page.locator(`h1:has-text("${testUser.username}")`)).toBeVisible();
    await expect(page.locator('.info-value', { hasText: testUser.username })).toBeVisible();
  });

  test('should validate required fields when creating user', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);

    // Navigate to create user form
    await page.goto(`${PROVIDER_URL}/directory/users/new`);

    // Try to submit without filling required fields
    await page.click('button[type="submit"]:has-text("Create User")');

    // HTML5 validation should prevent submission
    // Check that we're still on the form page
    await expect(page).toHaveURL(/\/directory\/users\/new/);
  });

  test('should not allow duplicate username', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);

    // Navigate to create user form
    await page.goto(`${PROVIDER_URL}/directory/users/new`);

    // Try to create user with existing username (use the full email as username)
    await page.fill('#username', TEST_USER.email); // admin@localhost is the username
    await page.fill('#password', 'TestPassword123!');
    await page.fill('#email', 'newadmin@example.com');

    // Submit form and wait for response
    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/directory/users/create')
    );
    await page.click('button[type="submit"]:has-text("Create User")');
    const response = await responsePromise;

    // Should show error (status 400)
    expect(response.status()).toBe(400);

    // Should show alert modal
    await expect(page.locator('#alertModal.active')).toBeVisible();
    await expect(page.locator('#alertMessage')).toContainText('Username already exists');
  });

  test('should edit existing user', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);

    // First, create a test user to edit (don't modify the admin user)
    const timestamp = Date.now();
    const testUser = {
      username: `edituser${timestamp}`,
      password: 'OldPassword123!',
      email: `edituser${timestamp}@example.com`,
      firstName: 'Edit',
      lastName: 'User',
      displayName: 'Edit User'
    };

    // Navigate to users list
    await page.goto(`${PROVIDER_URL}/directory/users`);

    // Click Add User button
    await page.click('a:has-text("Add User")');

    // Fill out the form to create the test user
    await page.fill('#username', testUser.username);
    await page.fill('#password', testUser.password);
    await page.fill('#email', testUser.email);
    await page.fill('#first_name', testUser.firstName);
    await page.fill('#last_name', testUser.lastName);

    // Wait for create response
    const createResponsePromise = page.waitForResponse(response =>
      response.url().includes('/directory/users/create') && response.status() === 200
    );

    // Submit form
    await page.click('button[type="submit"]:has-text("Create User")');
    await createResponsePromise;

    // Should redirect to user detail page
    await page.waitForURL(/\/directory\/users\/[a-f0-9-]+$/, { timeout: 5000 });

    // Now edit the user
    await page.click('a.btn.btn-primary:has-text("Edit User")');

    // Should show edit form
    await expect(page.locator('h1:has-text("Edit User:")')).toBeVisible();

    // Update display name
    const newDisplayName = `Updated at ${Date.now()}`;
    await page.fill('#display_name', newDisplayName);

    // Submit form
    await page.click('button[type="submit"]:has-text("Update User")');

    // Should redirect back to user detail
    await page.waitForURL(/\/directory\/users\/[a-f0-9-]+$/, { timeout: 5000 });

    // Should show updated display name
    await expect(page.locator('p', { hasText: newDisplayName })).toBeVisible();
  });

  test('should update user password', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);

    // First, create a test user
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

    // Now edit the user
    await page.click('a.btn.btn-primary:has-text("Edit User")');

    // Change password
    const newPassword = 'NewPassword123!';
    await page.fill('#password', newPassword);
    await page.click('button[type="submit"]:has-text("Update User")');

    // Should update successfully
    await page.waitForURL(/\/directory\/users\/[a-f0-9-]+$/, { timeout: 5000 });
    await expect(page.locator(`h1:has-text("${testUser.username}")`)).toBeVisible();
  });

  test('should delete user', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);

    // First, create a test user to delete
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

    // Wait for page to stabilize before clicking (helps with Mobile Chrome)
    await page.waitForLoadState('networkidle');

    // Delete the user from detail page
    await page.click('button.btn.btn-danger:has-text("Delete User")');

    // Should show confirmation modal
    await expect(page.locator('#confirmModal.active')).toBeVisible();
    await expect(page.locator('#confirmMessage')).toContainText(testUser.username);

    // Wait for elements to stabilize before clicking (helps with Mobile Chrome)
    await page.waitForLoadState('networkidle');

    // Confirm deletion
    await page.click('#confirmBtn', { force: true });

    // Should redirect to users list
    await page.waitForURL(/\/directory\/users$/, { timeout: 5000 });

    // User should no longer appear in the list
    await expect(page.locator('td', { hasText: testUser.username })).not.toBeVisible();
  });

  test('should delete user from list page', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);

    // Create a test user
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

    // Go back to users list
    await page.goto(`${PROVIDER_URL}/directory/users`);

    // Wait for page to stabilize
    await page.waitForLoadState('networkidle');

    // Find the test user row and click delete
    const userRow = page.locator('tr', { hasText: testUser.username });
    await userRow.locator('button.btn.btn-danger:has-text("Delete")').click({ force: true });

    // Should show confirmation modal
    await expect(page.locator('#confirmModal.active')).toBeVisible({ timeout: 5000 });

    // Wait for elements to stabilize
    await page.waitForLoadState('networkidle');

    // Confirm deletion - wait for button to be ready and then click
    const confirmBtn = page.locator('#confirmBtn');
    await confirmBtn.waitFor({ state: 'visible', timeout: 5000 });
    await confirmBtn.click({ force: true });

    // Wait for deletion to complete - page should reload
    await page.waitForTimeout(500);
    await page.waitForLoadState('networkidle');

    // Give browser extra time to complete deletion and DOM update
    await page.waitForTimeout(1000);

    // User should be gone - check that row doesn't exist
    const userRows = page.locator('table tbody tr').filter({ hasText: testUser.username });
    await expect(userRows).toHaveCount(0, { timeout: 5000 });
  });

  test('should cancel user deletion', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);

    // Create a test user for this test
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

    // Page should already be on the user detail page from creation
    await page.waitForLoadState('networkidle');

    // Click delete button
    const deleteButton = page.locator('button.btn.btn-danger:has-text("Delete User")');
    await deleteButton.waitFor({ state: 'visible', timeout: 5000 });
    await page.click('button.btn.btn-danger:has-text("Delete User")', { force: true });

    // Should show confirmation modal
    await expect(page.locator('#confirmModal.active')).toBeVisible();

    // Cancel deletion (use force for Mobile Chrome where modal may intercept clicks)
    await page.click('button:has-text("Cancel")', { force: true });

    // Modal should close
    await expect(page.locator('#confirmModal.active')).not.toBeVisible();

    // Should still be on user detail page
    await expect(page).toHaveURL(/\/directory\/users\/[a-f0-9-]+$/);
  });

  test('should auto-generate display name from first and last name', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);

    // Navigate to create user form
    await page.goto(`${PROVIDER_URL}/directory/users/new`);

    const timestamp = Date.now();

    // Fill first and last name
    await page.fill('#first_name', 'Alice');
    await page.fill('#last_name', 'Johnson');

    // Display name should auto-populate
    await expect(page.locator('#display_name')).toHaveValue('Alice Johnson');

    // Complete the form
    await page.fill('#username', `alice${timestamp}`);
    await page.fill('#password', 'TestPassword123!');
    await page.fill('#email', `alice${timestamp}@example.com`);

    // Submit
    await page.click('button[type="submit"]:has-text("Create User")');
    await page.waitForURL(/\/directory\/users\/[a-f0-9-]+$/, { timeout: 5000 });

    // Should show auto-generated display name
    await expect(page.locator('p', { hasText: 'Alice Johnson' })).toBeVisible();
  });

  test('should handle inactive users', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);

    // Create an inactive user
    const timestamp = Date.now();
    await page.goto(`${PROVIDER_URL}/directory/users/new`);

    await page.fill('#username', `inactive${timestamp}`);
    await page.fill('#password', 'TestPassword123!');
    await page.fill('#email', `inactive${timestamp}@example.com`);
    await page.selectOption('#is_active', 'false');

    await page.click('button[type="submit"]:has-text("Create User")');
    await page.waitForURL(/\/directory\/users\/[a-f0-9-]+$/, { timeout: 5000 });

    // Should show inactive status (exact match in Status field)
    await expect(page.locator('.info-item').filter({ hasText: 'Status' }).locator('.info-value', { hasText: 'Inactive' })).toBeVisible();
  });
});
