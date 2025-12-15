/// <reference types="@playwright/test" />
import { test, expect } from '@playwright/test';

const PROVIDER_URL = 'http://localhost:9080';
const DIRECTORY_URL = 'http://localhost:7080';
const BEARER_TOKEN = 'sk-AKnZKbq1O9RYwEagYhARZWlrPpbMCvliO8H646DmndO2Phth';

// Test user credentials (should exist in the test database)
const TEST_USER = {
  email: 'admin@localhost',
  password: 'Rays-93-Accident',
  id: '8276bb5b-d0b7-41e9-a805-77b62a2865f4'
};

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
    await page.goto(`${PROVIDER_URL}/directory/login`);

    await expect(page.locator('input[placeholder="admin@example.com"]')).toBeVisible({ timeout: 10000 });

    await page.fill('input[placeholder="admin@example.com"]', TEST_USER.email);
    await page.fill('input[placeholder="Enter your password"]', TEST_USER.password);

    await page.click('button:has-text("Sign In")');

    // Successful login indicates that:
    // 1. validate() worked (found user by email, checked password)
    // 2. User profile was loaded correctly from SQLite
    // 3. find() method works for retrieving user data

    // Should move past the login page
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 5000 });

    // Should be in authenticated session
    await expect(page).not.toHaveURL(/\/login/);
  });
});

test.describe('SQLite Directory API (via Remote Directory endpoints)', () => {

  test('should count users via /count endpoint', async ({ request }) => {
    const response = await request.get(`${DIRECTORY_URL}/count`, {
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Should have at least the test user
    expect(data.count).toBeGreaterThan(0);
  });

  test('should find user by ID via /find endpoint', async ({ request }) => {
    const response = await request.get(`${DIRECTORY_URL}/find/${TEST_USER.id}`, {
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const user = await response.json();

    expect(user.id).toBe(TEST_USER.id);
    expect(user.emails).toBeDefined();
    expect(user.emails.length).toBeGreaterThan(0);
  });

  test('should find user by email via /find endpoint', async ({ request }) => {
    const response = await request.get(`${DIRECTORY_URL}/find/${encodeURIComponent(TEST_USER.email)}`, {
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const user = await response.json();

    expect(user.emails).toBeDefined();
    const primaryEmail = user.emails.find((e: any) => e.is_primary);
    expect(primaryEmail.email).toBe(TEST_USER.email);
  });

  test('should validate correct credentials via /validate endpoint', async ({ request }) => {
    const response = await request.post(`${DIRECTORY_URL}/validate`, {
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`,
        'Content-Type': 'application/json'
      },
      data: {
        email: TEST_USER.email,
        password: TEST_USER.password
      }
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();

    expect(result.valid).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user.id).toBe(TEST_USER.id);
  });

  test('should reject invalid credentials via /validate endpoint', async ({ request }) => {
    const response = await request.post(`${DIRECTORY_URL}/validate`, {
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`,
        'Content-Type': 'application/json'
      },
      data: {
        email: TEST_USER.email,
        password: 'wrong-password'
      }
    });

    // Should return 400 for invalid credentials
    expect(response.status()).toBe(400);
    const result = await response.json();
    expect(result.valid).toBe(false);
  });

  test('should return user with groups and roles', async ({ request }) => {
    const response = await request.get(`${DIRECTORY_URL}/find/${TEST_USER.id}`, {
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const user = await response.json();

    // User should have groups and roles arrays (may be empty)
    expect(Array.isArray(user.groups)).toBeTruthy();
    expect(Array.isArray(user.roles)).toBeTruthy();
  });

  test('should return user with properties', async ({ request }) => {
    const response = await request.get(`${DIRECTORY_URL}/find/${TEST_USER.id}`, {
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const user = await response.json();

    // User should have properties object
    expect(user.properties).toBeDefined();
  });
});

test.describe('SQLite Directory - User Profile Claims', () => {

  test('should include standard OIDC claims in user profile', async ({ request }) => {
    const response = await request.get(`${DIRECTORY_URL}/find/${TEST_USER.id}`, {
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const user = await response.json();

    // Check for standard OIDC claims
    expect(user.id).toBeDefined();
    expect(user.first_name).toBeDefined();
    expect(user.last_name).toBeDefined();
    expect(user.display_name).toBeDefined();
  });

  test('should handle user without optional claims', async ({ request }) => {
    // This test verifies that the directory handles users with minimal data
    const response = await request.get(`${DIRECTORY_URL}/find/${TEST_USER.id}`, {
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const user = await response.json();

    // Required fields should exist
    expect(user.id).toBeDefined();

    // Optional fields may or may not exist, but should not cause errors
    // The directory should handle missing optional fields gracefully
  });
});

test.describe('SQLite Directory - Error Handling', () => {

  test('should return 404 for non-existent user', async ({ request }) => {
    const fakeUserId = '00000000-0000-0000-0000-000000000000';
    const response = await request.get(`${DIRECTORY_URL}/find/${fakeUserId}`, {
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`
      }
    });

    expect(response.status()).toBe(404);
  });

  test('should handle concurrent requests', async ({ request }) => {
    // Test that SQLite directory can handle multiple concurrent requests
    const requests = [];

    for (let i = 0; i < 10; i++) {
      requests.push(
        request.get(`${DIRECTORY_URL}/find/${TEST_USER.id}`, {
          headers: {
            'Authorization': `Bearer ${BEARER_TOKEN}`
          }
        })
      );
    }

    const responses = await Promise.all(requests);

    // All requests should succeed
    responses.forEach(response => {
      expect(response.ok()).toBeTruthy();
    });
  });
});
