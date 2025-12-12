import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:7080';
const BEARER_TOKEN = 'sk-AKnZKbq1O9RYwEagYhARZWlrPpbMCvliO8H646DmndO2Phth';
const INVALID_TOKEN = 'sk-invalid-token-12345';

test.describe('Directory Service Authentication', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto(`${BASE_URL}/users`);

    // Should be redirected to login page
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('h2')).toContainText('Login');
  });

  test('should show login form with required fields', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Verify login form exists
    await expect(page.locator('input[type="password"][placeholder*="Bearer"]')).toBeVisible();
    await expect(page.locator('button:has-text("Login")')).toBeVisible();
  });

  test('should reject invalid bearer token', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Enter invalid token
    await page.fill('input[type="password"]', INVALID_TOKEN);
    await page.click('button:has-text("Login")');

    // Should show error message
    await expect(page.locator('text=/Invalid token|error|failed/i')).toBeVisible({ timeout: 5000 });
  });

  test('should successfully login with valid bearer token', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Enter valid token
    await page.fill('input[type="password"]', BEARER_TOKEN);
    await page.click('button:has-text("Login")');

    // Should redirect to users page after successful login
    await page.waitForURL(`${BASE_URL}/users`, { timeout: 5000 });
    await expect(page).toHaveURL(`${BASE_URL}/users`);

    // Verify token stored in sessionStorage
    const token = await page.evaluate(() => sessionStorage.getItem('bearer_token'));
    expect(token).toBe(BEARER_TOKEN);
  });

  test('should persist authentication across page navigation', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="password"]', BEARER_TOKEN);
    await page.click('button:has-text("Login")');
    await page.waitForURL(`${BASE_URL}/users`);

    // Navigate to different pages
    await page.click('a[href="/roles"]');
    await expect(page).toHaveURL(`${BASE_URL}/roles`);
    await expect(page.locator('h2')).toContainText('Roles');

    await page.click('a[href="/groups"]');
    await expect(page).toHaveURL(`${BASE_URL}/groups`);
    await expect(page.locator('h2')).toContainText('Groups');

    await page.click('a[href="/domains"]');
    await expect(page).toHaveURL(`${BASE_URL}/domains`);
    await expect(page.locator('h2')).toContainText('Domains');

    // Token should still be in sessionStorage
    const token = await page.evaluate(() => sessionStorage.getItem('bearer_token'));
    expect(token).toBe(BEARER_TOKEN);
  });

  test('should make authenticated API calls with Bearer token', async ({ page }) => {
    // Setup request interception to verify Bearer token
    const apiCalls: any[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiCalls.push({
          url: request.url(),
          headers: request.headers()
        });
      }
    });

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="password"]', BEARER_TOKEN);
    await page.click('button:has-text("Login")');
    await page.waitForURL(`${BASE_URL}/users`);

    // Wait for API call to complete
    await page.waitForTimeout(1000);

    // Verify API calls include Bearer token
    const usersApiCall = apiCalls.find(call => call.url.includes('/api/users'));
    expect(usersApiCall).toBeDefined();
    expect(usersApiCall.headers.authorization).toBe(`Bearer ${BEARER_TOKEN}`);
  });

  test('should logout and clear authentication', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="password"]', BEARER_TOKEN);
    await page.click('button:has-text("Login")');
    await page.waitForURL(`${BASE_URL}/users`);

    // Verify token exists
    let token = await page.evaluate(() => sessionStorage.getItem('bearer_token'));
    expect(token).toBe(BEARER_TOKEN);

    // Logout
    await page.click('button:has-text("Logout")');

    // Should redirect to login page
    await expect(page).toHaveURL(`${BASE_URL}/login`);

    // Token should be cleared from sessionStorage
    token = await page.evaluate(() => sessionStorage.getItem('bearer_token'));
    expect(token).toBeNull();
  });

  test('should redirect to login when accessing protected page after logout', async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="password"]', BEARER_TOKEN);
    await page.click('button:has-text("Login")');
    await page.waitForURL(`${BASE_URL}/users`);

    // Logout
    await page.click('button:has-text("Logout")');
    await expect(page).toHaveURL(`${BASE_URL}/login`);

    // Try to access protected page directly
    await page.goto(`${BASE_URL}/roles`);

    // Should be redirected back to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should preserve redirect URL after login', async ({ page }) => {
    // Try to access a specific page without auth
    await page.goto(`${BASE_URL}/domains`);

    // Should redirect to login with redirectTo parameter
    await expect(page).toHaveURL(/\/login.*redirectTo/);

    // Login
    await page.fill('input[type="password"]', BEARER_TOKEN);
    await page.click('button:has-text("Login")');

    // Should redirect back to originally requested page
    await expect(page).toHaveURL(`${BASE_URL}/domains`);
    await expect(page.locator('h2')).toContainText('Domains');
  });

  test('should handle API 401 responses by redirecting to login', async ({ page }) => {
    // Login with valid token
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="password"]', BEARER_TOKEN);
    await page.click('button:has-text("Login")');
    await page.waitForURL(`${BASE_URL}/users`);

    // Manually corrupt the token in sessionStorage
    await page.evaluate(() => {
      sessionStorage.setItem('directoryAuthToken', 'sk-corrupted-token');
    });

    // Reload the page - should trigger API call with corrupted token
    await page.reload();

    // Should redirect to login due to 401 response
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('should not allow access to API endpoints without authentication', async ({ request }) => {
    // Try to access API endpoint without Bearer token
    const response = await request.get(`${BASE_URL}/api/users`);

    // Should return 401 Unauthorized
    expect(response.status()).toBe(401);
  });

  test('should allow access to API endpoints with valid Bearer token', async ({ request }) => {
    // Access API endpoint with valid Bearer token
    const response = await request.get(`${BASE_URL}/api/users`, {
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`
      }
    });

    // Should return 200 OK
    expect(response.status()).toBe(200);

    // Response should be JSON array
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });
});
