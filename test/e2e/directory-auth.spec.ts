/// <reference types="@playwright/test" />
import { test, expect } from '@playwright/test';
import { DIRECTORY_BASE_URL } from '../utils/urls';

const BASE_URL = DIRECTORY_BASE_URL;
const BEARER_TOKEN = process.env.DIRECTORY_BEARER_TOKEN || 'local-dev-bearer-token';
const INVALID_TOKEN = 'sk-invalid-token-12345';

async function login(page, redirectTo: string = '/') {
  const redirectPath = redirectTo.startsWith('/') ? redirectTo : `/${redirectTo}`;
  await page.goto(`${BASE_URL}/login${redirectPath !== '/' ? `?redirectTo=${encodeURIComponent(redirectPath)}` : ''}`);

  // Wait for token input to be ready
  await page.waitForSelector('input#token', { state: 'visible', timeout: 15000 });

  await page.fill('input#token', BEARER_TOKEN);
  await Promise.all([
    page.waitForURL(url => url.toString().startsWith(`${BASE_URL}${redirectPath}`), { timeout: 15000 }),
    page.click('button:has-text("Sign In")')
  ]);

  // Session-based admin auth (issue #53): credentials are not embedded as auth-token meta.
  await expect(page.locator('nav a:has-text("Users"), nav a:has-text("Dashboard")').first()).toBeVisible({ timeout: 15000 });
}

test.describe('Directory Service Authentication', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    // Should be redirected to login page
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('h1')).toContainText('Simple Directory');
  });

  test('should show login form with required fields', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Verify login form exists
    await expect(page.locator('input[type="password"][placeholder*="bearer token"]')).toBeVisible();
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
  });

  test('should reject invalid bearer token', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Enter invalid token
    await page.fill('input[type="password"]', INVALID_TOKEN);
    await page.click('button:has-text("Sign In")');

    // Should show error message
    await expect(page.locator('text=/Invalid token|error|failed/i')).toBeVisible({ timeout: 5000 });
  });

  test('should successfully login with valid bearer token', async ({ page }) => {
    await login(page);

    // Should redirect to home page (users view) after successful login
    await expect(page).toHaveURL(`${BASE_URL}/`);

    // Session cookie authorizes subsequent same-origin API calls (no embedded token)
    await expect(page.locator('nav a:has-text("Users")')).toBeVisible();
  });

  test('should persist authentication across page navigation', async ({ page }) => {
    await login(page);

    // Navigate to different pages
    await Promise.all([
      page.waitForURL(`${BASE_URL}/roles`),
      page.click('a[href="/roles"]', { force: true })
    ]);
    await expect(page.locator('h2').first()).toContainText('Roles');

    await Promise.all([
      page.waitForURL(`${BASE_URL}/groups`),
      page.click('a[href="/groups"]', { force: true })
    ]);
    await expect(page.locator('h2').first()).toContainText('Groups');

    await Promise.all([
      page.waitForURL(`${BASE_URL}/domains`),
      page.click('a[href="/domains"]', { force: true })
    ]);
    await expect(page.locator('h2').first()).toContainText('Domains');

    // Session remains valid across navigation
    await expect(page.locator('nav a:has-text("Users")')).toBeVisible();
  });

  test('should make authenticated API calls with admin session', async ({ page }) => {
    // Login establishes server-side admin session; same-origin fetches use cookies
    await login(page);

    const response = await page.evaluate(async () => {
      const res = await window.csrfFetch('/api/users');
      return { status: res.status, ok: res.ok };
    });

    expect(response.status).toBe(200);
    expect(response.ok).toBe(true);
  });

  test('should logout and clear authentication', async ({ page }) => {
    await login(page);

    // Logout via the header link
    await page.locator('a[title="Sign out"]').click({ force: true });

    // Should redirect to login page after session clear
    await expect(page).toHaveURL(`${BASE_URL}/login`);

    // Accessing dashboard again should bounce back to login
    await page.goto(`${BASE_URL}/`);
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect to login when accessing protected page after logout', async ({ page }) => {
    await login(page);

    // Logout
    await page.locator('a[title="Sign out"]').click({ force: true });
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
    await page.click('button:has-text("Sign In")');

    // Should redirect to the originally requested page
    await expect(page).toHaveURL(/\/domains/);
  });

  test('should handle API 401 responses by redirecting to login', async ({ page, context }) => {
    await login(page, '/users');

    // Clear server session cookie so subsequent same-origin API calls are unauthorized
    await context.clearCookies();

    // Trigger an API call that will fail and should redirect to login
    await Promise.all([
      page.waitForURL(/\/login/, { timeout: 5000 }),
      page.evaluate(() => window.csrfFetch('/api/users'))
    ]);
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
