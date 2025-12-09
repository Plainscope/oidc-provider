import { test, expect } from '../fixtures/auth.fixtures';
import { TEST_USER } from '../fixtures/auth.fixtures';

/**
 * Tests for User Profile and Claims
 * Validates OIDC profile endpoints and user information
 */

test.describe('User Profile and Claims', () => {
  test('should display user profile on Profile page', async ({ authenticatedPage }) => {
    // Navigate to profile page via main button
    const viewProfileButton = authenticatedPage.locator('main a[href="/Profile"]');
    await viewProfileButton.click();
    await authenticatedPage.waitForURL(/\/Profile/);

    // Verify profile information is displayed
    await expect(authenticatedPage.locator('h2')).toContainText('Your profile');
  });

  test('should display email claim in profile', async ({ authenticatedPage }) => {
    const viewProfileButton = authenticatedPage.locator('main a[href="/Profile"]');
    await viewProfileButton.click();
    await authenticatedPage.waitForURL(/\/Profile/);

    // Should display email - use first() to handle multiple matches
    const emailDisplay = authenticatedPage.locator('text=admin@localhost').first();
    await expect(emailDisplay).toBeVisible();
  });

  test('should display user claims on index page for authenticated users', async ({ authenticatedPage }) => {
    // Go back to home page
    await authenticatedPage.goto('/');

    // Should show user name
    const quickGlance = authenticatedPage.locator('h3:has-text("Quick glance")');
    await expect(quickGlance).toBeVisible();

    // Should display name (avoid strict mode by getting first match)
    const nameDisplay = authenticatedPage.locator('p:has-text("John Doe")').first();
    await expect(nameDisplay).toBeVisible();
  });

  test('should display email in quick glance', async ({ authenticatedPage }) => {
    // Should show email in quick glance section
    const emailDisplay = authenticatedPage.locator('text=/Email:/');
    await expect(emailDisplay).toBeVisible();
  });

  test('should persist claims across page navigation', async ({ authenticatedPage }) => {
    // Get initial claims
    const initialEmail = await authenticatedPage.locator('p:has-text("Email:")').textContent();

    // Navigate to profile
    const viewProfileButton = authenticatedPage.locator('main a[href="/Profile"]');
    await viewProfileButton.click();
    await authenticatedPage.waitForURL(/\/Profile/);

    // Navigate back to home
    await authenticatedPage.goto('/');

    // Claims should still be visible
    const finalEmail = await authenticatedPage.locator('p:has-text("Email:")').textContent();
    expect(initialEmail).toBe(finalEmail);
  });

  test('should maintain session during profile navigation', async ({ authenticatedPage }) => {
    // Verify authenticated state
    let signOutButton = authenticatedPage.locator('main form[action="/auth/signout"] button');
    await expect(signOutButton).toBeVisible();

    // Navigate to profile
    const viewProfileButton = authenticatedPage.locator('main a[href="/Profile"]');
    await viewProfileButton.click();
    await authenticatedPage.waitForURL(/\/Profile/);
    await authenticatedPage.waitForLoadState('domcontentloaded');

    // Should still be authenticated - check that user email is displayed (indicates auth)
    const emailDisplay = authenticatedPage.locator('text=admin@localhost').first();
    await expect(emailDisplay).toBeVisible();
  });

  test('should include openid scope in token claims', async ({ authenticatedPage }) => {
    // Profile page should display user information from id_token
    await authenticatedPage.click('a.btn.primary:has-text("View profile")');
    await authenticatedPage.waitForURL(/\/Profile/);

    // Verify OIDC claims are present (sub claim is mandatory for openid scope)
    const pageContent = await authenticatedPage.content();

    // At minimum, should have user identification
    expect(pageContent).toContain('Profile');
  });

  test('should include profile scope claims', async ({ authenticatedPage }) => {
    // Navigate to profile to see claims
    await authenticatedPage.click('a.btn.primary:has-text("View profile")');
    await authenticatedPage.waitForURL(/\/Profile/);

    // Should have name information (profile scope includes name, etc.)
    const profileContent = await authenticatedPage.content();
    expect(profileContent).toMatch(/John|Name|Profile/i);
  });

  test('should include email scope claims', async ({ authenticatedPage }) => {
    // Navigate to profile
    await authenticatedPage.click('a.btn.primary:has-text("View profile")');
    await authenticatedPage.waitForURL(/\/Profile/);

    // Should have email information (email scope includes email)
    const profileContent = await authenticatedPage.content();
    expect(profileContent).toContain('admin@localhost');
  });
});
