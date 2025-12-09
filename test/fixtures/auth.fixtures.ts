import { test as base, expect } from '@playwright/test';

/**
 * Credentials for test user
 */
export const TEST_USER = {
  email: 'admin@localhost',
  password: 'Rays-93-Accident',
};

/**
 * OAuth 2.0 / OIDC Configuration
 */
export const OIDC_CONFIG = {
  clientId: '85125d57-a403-4fe2-84d8-62c6db9b6d73',
  clientSecret: '+XiBpec4OAIeFBSbRdGaAGLNz6ZFfAbq',
  redirectUri: 'http://localhost:8080/signin-oidc',
  postLogoutRedirectUri: 'http://localhost:8080/signout-callback-oidc',
  scope: 'openid profile email',
  // Provider URLs (internal Docker network)
  providerBaseUrl: 'http://provider:8080',
  // Demo app URLs (from host)
  demoBaseUrl: 'http://localhost:8080',
};

/**
 * Custom fixture to add authenticated page context
 */
type AuthFixtures = {
  authenticatedPage: Awaited<ReturnType<typeof createAuthenticatedPage>>;
};

async function createAuthenticatedPage(page: any, credentials = TEST_USER) {
  // Navigate to demo app
  await page.goto('/');

  // Check if already authenticated
  const isAuthenticated = await page.locator('.btn.secondary').isVisible().catch(() => false);
  if (isAuthenticated) {
    return page;
  }

  // Click sign in button
  await page.click('a.btn.primary:has-text("Sign in")');

  // Wait for redirect to OIDC provider
  await page.waitForURL(/\/interaction/);

  // Enter credentials
  await page.fill('input[name="email"]', credentials.email);
  await page.fill('input[name="password"]', credentials.password);

  // Submit login form
  await page.click('button:has-text("Sign In")');

  // Consent prompt may appear after login depending on scopes
  const authorizeButton = page.locator('button:has-text("Authorize")');
  const consentVisible = await authorizeButton.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
  if (consentVisible) {
    await authorizeButton.click();
  }

  // Wait for redirect back to the demo app (callback may briefly hit /signin-oidc)
  await page.waitForURL(
    (url: URL) => url.href.startsWith('http://localhost:8080') && !url.pathname.includes('signin-oidc'),
    { timeout: 20000 },
  );

  return page;
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }: any, use: any) => {
    const authPage = await createAuthenticatedPage(page, TEST_USER);
    await use(authPage);
  },
});

export { expect };
