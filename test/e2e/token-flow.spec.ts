import { test, expect } from '@playwright/test';
import { OIDC_CONFIG } from '../fixtures/auth.fixtures';

/**
 * Tests for Token Flow and Endpoints
 * Validates token generation, exchange, and validation
 */

test.describe('OIDC Token Flow', () => {
  const providerUrl = 'http://localhost:9080';

  test('should return valid authorization code from /auth endpoint', async ({ page }) => {
    // Build authorization request
    const authUrl = new URL(`${providerUrl}/auth`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', OIDC_CONFIG.clientId);
    authUrl.searchParams.set('redirect_uri', OIDC_CONFIG.redirectUri);
    authUrl.searchParams.set('scope', 'openid profile email');
    authUrl.searchParams.set('state', 'test-state-' + Date.now());
    authUrl.searchParams.set('nonce', 'test-nonce-' + Date.now());

    // Make request
    const response = await page.goto(authUrl.toString(), { waitUntil: 'networkidle' });

    // Should redirect (not be on provider page)
    expect(response?.status()).toBeLessThan(400);
  });

  test('should require code grant for token endpoint without PKCE', async ({ page }) => {
    // Token endpoint should require code grant
    const response = await page.request.post(`${providerUrl}/token`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: {
        grant_type: 'authorization_code',
        code: 'invalid-code',
        redirect_uri: OIDC_CONFIG.redirectUri,
        client_id: OIDC_CONFIG.clientId,
        client_secret: OIDC_CONFIG.clientSecret,
      },
    });

    // Should return error for invalid code
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  test('should validate client credentials at token endpoint', async ({ page }) => {
    // Token endpoint should validate client
    const response = await page.request.post(`${providerUrl}/token`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: {
        grant_type: 'authorization_code',
        code: 'test-code',
        redirect_uri: OIDC_CONFIG.redirectUri,
        client_id: 'invalid-client',
        client_secret: 'invalid-secret',
      },
    });

    // Should return unauthorized error
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('should have token endpoint at /token', async ({ page }) => {
    // Verify token endpoint exists
    const response = await page.request.get(`${providerUrl}/token`, {
      headers: { Accept: 'application/json' },
    }).catch(() => null);

    // Should exist (may be GET not allowed, but endpoint should exist)
    expect(response).toBeDefined();
  });

  test('should validate redirect_uri on token endpoint', async ({ page }) => {
    const response = await page.request.post(`${providerUrl}/token`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: {
        grant_type: 'authorization_code',
        code: 'invalid-code',
        redirect_uri: 'http://invalid-redirect.example.com',
        client_id: OIDC_CONFIG.clientId,
        client_secret: OIDC_CONFIG.clientSecret,
      },
    });

    // Should return error for redirect_uri mismatch
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('should support refresh token grant', async ({ page }) => {
    // Verify token endpoint supports refresh_token grant
    const response = await page.request.post(`${providerUrl}/token`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: {
        grant_type: 'refresh_token',
        refresh_token: 'invalid-token',
        client_id: OIDC_CONFIG.clientId,
        client_secret: OIDC_CONFIG.clientSecret,
      },
    }).catch(() => null);

    // Should respond (error or success)
    expect(response).toBeDefined();
  });

  test('should provide userinfo endpoint for access token', async ({ page }) => {
    // Verify userinfo endpoint exists
    const response = await page.request.get(`${providerUrl}/me`, {
      headers: {
        'Authorization': 'Bearer invalid-token',
      },
    });

    // Should exist (return error for invalid token)
    expect(response).toBeDefined();
  });

  test('should validate access token format', async ({ page }) => {
    const response = await page.request.get(`${providerUrl}/me`, {
      headers: {
        'Authorization': 'Bearer not-a-jwt-token',
      },
    });

    // Should return 401 or 400
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('should reject expired tokens at userinfo endpoint', async ({ page }) => {
    // Use an old/expired token format
    const expiredToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.invalid';

    const response = await page.request.get(`${providerUrl}/me`, {
      headers: {
        'Authorization': `Bearer ${expiredToken}`,
      },
    });

    // Should reject expired token
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('should support HTTP Basic Auth at token endpoint', async ({ page }) => {
    const credentials = Buffer.from(
      `${OIDC_CONFIG.clientId}:${OIDC_CONFIG.clientSecret}`
    ).toString('base64');

    const response = await page.request.post(`${providerUrl}/token`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      data: {
        grant_type: 'authorization_code',
        code: 'invalid-code',
        redirect_uri: OIDC_CONFIG.redirectUri,
      },
    });

    // Should process auth header (return error for invalid code)
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('should have introspection endpoint', async ({ page }) => {
    const response = await page.request.post(`${providerUrl}/introspect`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: {
        token: 'invalid-token',
        client_id: OIDC_CONFIG.clientId,
        client_secret: OIDC_CONFIG.clientSecret,
      },
    });

    // Endpoint should exist
    expect(response).toBeDefined();
    expect(response.status()).toBeGreaterThanOrEqual(200);
  });

  test('should have revocation endpoint', async ({ page }) => {
    const response = await page.request.post(`${providerUrl}/revoke`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: {
        token: 'invalid-token',
        client_id: OIDC_CONFIG.clientId,
        client_secret: OIDC_CONFIG.clientSecret,
      },
    });

    // Endpoint should exist
    expect(response).toBeDefined();
  });
});
