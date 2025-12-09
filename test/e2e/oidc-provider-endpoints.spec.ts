import { test, expect } from '@playwright/test';

/**
 * Tests for OIDC Provider Endpoints
 * Validates all critical OpenID Connect endpoints
 */

test.describe('OIDC Provider Endpoints', () => {
  // Base URL for provider (via Docker Compose port mapping)
  const providerUrl = 'http://localhost:9080';

  test('should serve OpenID Configuration metadata', async ({ page }) => {
    const response = await page.goto(
      `${providerUrl}/.well-known/openid-configuration`
    );
    expect(response?.status()).toBe(200);

    const config = await response?.json();

    // Verify essential metadata fields
    expect(config.issuer).toBeDefined();
    expect(config.authorization_endpoint).toBeDefined();
    expect(config.token_endpoint).toBeDefined();
    expect(config.userinfo_endpoint).toBeDefined();
    expect(config.end_session_endpoint).toBeDefined();
    expect(config.jwks_uri).toBeDefined();
    expect(config.scopes_supported).toContain('openid');
    expect(config.scopes_supported).toContain('profile');
    expect(config.scopes_supported).toContain('email');
    expect(config.response_types_supported).toContain('code');
    expect(config.grant_types_supported).toContain('authorization_code');
  });

  test('should serve JWKS (JSON Web Key Set)', async ({ page }) => {
    // Use request API to avoid Firefox download dialog
    const response = await page.request.get(`${providerUrl}/jwks`);
    expect(response.status()).toBe(200);

    const jwks = await response.json();

    // Verify JWKS structure
    expect(jwks.keys).toBeDefined();
    expect(Array.isArray(jwks.keys)).toBe(true);
    expect(jwks.keys.length).toBeGreaterThan(0);

    // Verify key structure
    const key = jwks.keys[0];
    expect(key.kty).toBeDefined(); // Key type (RSA, EC, etc.)
    expect(key.use).toBe('sig'); // Signing key
    expect(key.kid).toBeDefined(); // Key ID
  });

  test('should have correct issuer in OpenID Configuration', async ({ page }) => {
    const response = await page.goto(
      `${providerUrl}/.well-known/openid-configuration`
    );
    const config = await response?.json();

    expect(config.issuer).toMatch(/http:\/\/(localhost|provider)/);
  });

  test('should expose all required endpoints', async ({ page }) => {
    const response = await page.goto(
      `${providerUrl}/.well-known/openid-configuration`
    );
    const config = await response?.json();

    const requiredEndpoints = [
      'issuer',
      'authorization_endpoint',
      'token_endpoint',
      'userinfo_endpoint',
      'end_session_endpoint',
      'jwks_uri',
    ];

    for (const endpoint of requiredEndpoints) {
      expect(config[endpoint]).toBeDefined();
      expect(typeof config[endpoint]).toBe('string');
    }
  });

  test('should support recommended response types', async ({ page }) => {
    const response = await page.goto(
      `${providerUrl}/.well-known/openid-configuration`
    );
    const config = await response?.json();

    expect(config.response_types_supported).toContain('code');
  });

  test('should support required grant types', async ({ page }) => {
    const response = await page.goto(
      `${providerUrl}/.well-known/openid-configuration`
    );
    const config = await response?.json();

    expect(config.grant_types_supported).toContain('authorization_code');
  });
});
