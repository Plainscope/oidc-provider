import { test, expect } from '../fixtures/auth.fixtures';
import { TEST_USER, OIDC_CONFIG } from '../fixtures/auth.fixtures';

/**
 * Tests for Authorization Code Flow
 * Validates the complete OIDC authentication flow
 */

test.describe('OIDC Authorization Code Flow', () => {
  test('should redirect to authorization endpoint on login', async ({ page }) => {
    await page.goto('/');

    // Click sign in button
    await page.click('a.btn.primary:has-text("Sign in")');

    // Verify redirect to OIDC provider
    await expect(page).toHaveURL(/\/interaction/);
  });

  test('should display login form at interaction endpoint', async ({ page }) => {
    await page.goto('/');
    await page.click('a.btn.primary:has-text("Sign in")');

    // Verify login form elements (provider login page)
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/');
    await page.click('a.btn.primary:has-text("Sign in")');

    // Enter invalid credentials
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button:has-text("Sign In")');

    // Provider re-renders login with error banner
    const errorBanner = page.locator('.error-banner');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText(/invalid email or password/i);
    await expect(page).toHaveURL(/\/interaction/);
  });

  test('should accept valid credentials', async ({ page }) => {
    await page.goto('/');
    await page.click('a.btn.primary:has-text("Sign in")');

    // Enter valid credentials
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button:has-text("Sign In")');

    // Handle consent if prompted
    const authorizeButton = page.locator('button:has-text("Authorize")');
    const consentVisible = await authorizeButton.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
    if (consentVisible) {
      await authorizeButton.click();
    }

    await page.waitForURL(
      (url) => url.href.startsWith('http://localhost:8080') && !url.pathname.includes('signin-oidc'),
      { timeout: 20000 },
    );
    const signOutButton = page.locator('main form[action="/auth/signout"] button');
    await expect(signOutButton).toBeVisible();
  });

  test('should complete full auth flow and return to app', async ({ authenticatedPage }) => {
    // User should be authenticated and back at the app
    const url = authenticatedPage.url();
    expect(url).toContain('localhost:8080');

    // Should show authenticated UI (sign out button)
    const signOutButton = authenticatedPage.locator('main form[action="/auth/signout"] button');
    await expect(signOutButton).toBeVisible();
  });

  test('should have access token in session after login', async ({ authenticatedPage }) => {
    // Navigate to profile page
    await authenticatedPage.click('a.btn.primary:has-text("View profile")');

    // Verify we can access protected resource
    await authenticatedPage.waitForURL(/\/Profile/);

    // Should have user info displayed
    const profileCard = authenticatedPage.locator('.card', { hasText: 'Your profile' });
    await expect(profileCard).toBeVisible();
  });

  test('should create valid session cookie', async ({ authenticatedPage }) => {
    // Get cookies
    const cookies = await authenticatedPage.context().cookies();

    // Should have a session cookie
    const sessionCookie = cookies.find((c: any) =>
      c.name.toLowerCase().includes('session') ||
      c.name.toLowerCase().includes('sid')
    );
    expect(sessionCookie).toBeDefined();

    if (sessionCookie) {
      expect(sessionCookie.httpOnly).toBe(true);
      expect(sessionCookie.secure).toBe(false); // Development only
    }
  });

  test('should include OIDC state parameter in authorization request', async ({ page }) => {
    let capturedUrl = '';

    const authRequestPromise = page.waitForRequest(request => 
      request.url().includes('/auth?')
    );

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/auth?')) {
        capturedUrl = url;
      }
    });

    await page.goto('/');
    await page.click('a.btn.primary:has-text("Sign in")');

    await authRequestPromise;

    // Verify state parameter is present
    if (capturedUrl) {
      expect(capturedUrl).toContain('state=');
    }
  });
});
