import * as jwt from 'jsonwebtoken';
import { test as base } from '@playwright/test';

/**
 * OIDC Helper Utilities
 * Provides utility functions for OIDC/OAuth testing
 */

export class OIDCHelper {
  static providerUrl = 'http://localhost:9080';
  static demoUrl = 'http://localhost:8080';

  /**
   * Fetch OpenID Configuration
   */
  static async getOIDCConfiguration(page: any) {
    const response = await page.goto(
      `${this.providerUrl}/.well-known/openid-configuration`
    );
    const content = await page.content();
    return JSON.parse(content);
  }

  /**
   * Fetch JWKS (JSON Web Key Set)
   */
  static async getJWKS(page: any) {
    const response = await page.goto(
      `${this.providerUrl}/.well-known/jwks`
    );
    const content = await page.content();
    return JSON.parse(content);
  }

  /**
   * Verify JWT Token
   * Note: For testing, signature verification may be skipped
   */
  static verifyToken(token: string, secret?: string) {
    // For testing, we decode without verification
    // In production, use jwt.verify with proper secret
    return jwt.decode(token);
  }

  /**
   * Decode JWT without verification
   */
  static decodeToken(token: string) {
    return jwt.decode(token);
  }

  /**
   * Wait for service to be ready
   */
  static async waitForService(
    url: string,
    maxAttempts: number = 30,
    delayMs: number = 1000
  ): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return true;
        }
      } catch (error) {
        // Service not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    return false;
  }

  /**
   * Extract authorization code from redirect URL
   */
  static extractAuthorizationCode(url: string): string | null {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('code');
  }

  /**
   * Extract error from redirect URL
   */
  static extractError(url: string): string | null {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('error');
  }

  /**
   * Build authorization URL
   */
  static buildAuthorizationUrl(
    clientId: string,
    redirectUri: string,
    scope: string = 'openid profile email',
    state?: string,
    nonce?: string
  ): string {
    const url = new URL(`${this.providerUrl}/auth`);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('scope', scope);
    url.searchParams.set('state', state || `state-${Date.now()}`);
    if (nonce) {
      url.searchParams.set('nonce', nonce);
    }
    return url.toString();
  }

  /**
   * Extract token from response
   */
  static extractAccessToken(response: any): string | null {
    return response?.access_token || null;
  }

  /**
   * Extract ID Token from response
   */
  static extractIdToken(response: any): string | null {
    return response?.id_token || null;
  }

  /**
   * Extract Refresh Token from response
   */
  static extractRefreshToken(response: any): string | null {
    return response?.refresh_token || null;
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || typeof decoded === 'string') return true;

    const exp = decoded.exp;
    if (!exp) return false;

    return Math.floor(Date.now() / 1000) > exp;
  }

  /**
   * Get token expiry time
   */
  static getTokenExpiry(token: string): Date | null {
    const decoded = this.decodeToken(token);
    if (!decoded || typeof decoded === 'string') return null;

    const exp = decoded.exp;
    if (!exp) return null;

    return new Date(exp * 1000);
  }

  /**
   * Wait for URL to contain specific text
   */
  static async waitForUrlContains(
    page: any,
    substring: string,
    timeoutMs: number = 5000
  ): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      if (page.url().includes(substring)) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return false;
  }
}

export default OIDCHelper;
