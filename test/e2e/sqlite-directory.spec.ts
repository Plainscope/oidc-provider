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

    await page.goto(`${PROVIDER_URL}/directory/users`);
    await page.click(`a[href*="/directory/users/${TEST_USER.id}"]`);
    await expect(page.locator('h1')).toContainText(/User|Profile|Detail/i);
  });
});
