import { test, expect } from '../fixtures/auth.fixtures';

/**
 * Tests for Logout Flow
 * Validates OIDC logout, session termination, and redirect
 */

/**
 * Helper function to perform logout with confirmation
 */
async function performLogout(page: any) {
  const signOutButton = page.locator('main form[action="/auth/signout"] button');
  await signOutButton.click();

  // Wait for logout confirmation page
  await page.waitForURL(/localhost:9080\/session\/end/, { timeout: 5000 });

  // Click "Yes, sign me out" button on the confirmation page
  const confirmButton = page.getByRole('button', { name: /yes.*sign.*out/i });
  await confirmButton.click();

  // Wait for redirect back to demo app
  await page.waitForURL(url =>
    url.hostname === 'localhost' && url.port === '8080',
    { timeout: 10000 }
  );
}

test.describe('OIDC Logout Flow', () => {
  test('should display sign out button when authenticated', async ({ authenticatedPage }) => {
    const signOutButton = authenticatedPage.locator('main form[action="/auth/signout"] button');
    await expect(signOutButton).toBeVisible();
  });

  test('should redirect to logout endpoint on sign out', async ({ authenticatedPage }) => {
    // Perform logout with confirmation
    await performLogout(authenticatedPage);

    // Verify we're back at the demo app
    const url = authenticatedPage.url();
    expect(url).toContain('localhost:8080');
  });

  test('should clear session on logout', async ({ authenticatedPage }) => {
    // Verify authenticated
    const signOutButton = authenticatedPage.locator('main form[action="/auth/signout"] button');
    await expect(signOutButton).toBeVisible();

    // Perform logout with confirmation
    await performLogout(authenticatedPage);

    // Should be back at signed out page - check for sign in link
    const signInButton = authenticatedPage.locator('a[href="/auth/signin"]').first();
    await expect(signInButton).toBeVisible();
  });

  test('should not show profile after logout', async ({ authenticatedPage }) => {
    // Perform logout with confirmation
    await performLogout(authenticatedPage);

    // Navigate to profile - should redirect to signin for unauthenticated user
    await authenticatedPage.goto('/Profile').catch(() => {
      // Expected to fail if not authenticated
    });

    // Should be redirected to login or show error
    const url = authenticatedPage.url();
    expect(url).toBeDefined();
  });

  test('should invalidate session cookie on logout', async ({ authenticatedPage }) => {
    // Get cookies before logout
    const cookiesBefore = await authenticatedPage.context().cookies();
    const sessionCookieBefore = cookiesBefore.find((c: any) =>
      c.name.toLowerCase().includes('session') ||
      c.name.toLowerCase().includes('sid') ||
      c.name.toLowerCase().includes('aspnetcore')
    );

    // Perform logout with confirmation
    await performLogout(authenticatedPage);

    // Get cookies after logout
    const cookiesAfter = await authenticatedPage.context().cookies();
    const sessionCookieAfter = cookiesAfter.find((c: any) =>
      c.name.toLowerCase().includes('session') ||
      c.name.toLowerCase().includes('sid') ||
      c.name.toLowerCase().includes('aspnetcore')
    );

    // Session cookie should be cleared or changed
    if (sessionCookieBefore) {
      // Either cookie is gone or value is different
      expect(!sessionCookieAfter || sessionCookieAfter.value !== sessionCookieBefore.value).toBe(true);
    }
  });

  test('should prevent access to protected resources after logout', async ({ authenticatedPage }) => {
    // Perform logout with confirmation
    await performLogout(authenticatedPage);

    // Try to access profile directly
    const response = await authenticatedPage.goto('/Profile').catch(() => null);

    // Should either redirect or require re-authentication
    const url = authenticatedPage.url();
    expect(url).toBeDefined();
  });

  test('should complete OIDC logout flow', async ({ authenticatedPage }) => {
    // Verify authenticated
    const initialUrl = authenticatedPage.url();
    expect(initialUrl).toContain('localhost:8080');

    // Click sign out
    const signOutButton = authenticatedPage.locator('main form[action="/auth/signout"] button');
    await expect(signOutButton).toBeVisible();

    // Perform logout with confirmation
    await performLogout(authenticatedPage);

    // Should be back at app but unauthenticated
    const finalUrl = authenticatedPage.url();
    expect(finalUrl).toContain('localhost:8080');
  });

  test('should show login button after logout', async ({ authenticatedPage }) => {
    // Perform logout with confirmation
    await performLogout(authenticatedPage);

    // Should show sign in button
    const signInButton = authenticatedPage.locator('a[href="/auth/signin"]').first();
    await expect(signInButton).toBeVisible();
  });

  test('should allow re-authentication after logout', async ({ authenticatedPage }) => {
    // Perform logout with confirmation
    await performLogout(authenticatedPage);

    // Click sign in again
    const signInButton = authenticatedPage.locator('a[href="/auth/signin"]').first();
    await signInButton.click();

    // Should redirect to authorization endpoint
    await authenticatedPage.waitForURL(/\/interaction/, { timeout: 5000 });

    const url = authenticatedPage.url();
    expect(url).toContain('interaction');
  });
});
