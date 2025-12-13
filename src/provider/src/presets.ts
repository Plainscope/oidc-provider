/**
 * Configuration presets for common deployment scenarios
 * Provides sensible defaults for local development, self-hosted, and testing scenarios
 */

import { Configuration, ClientMetadata } from 'oidc-provider';
import crypto from 'node:crypto';

/**
 * Generate a secure random string of specified length
 */
const generateSecureRandom = (bytes: number = 32): string => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Preset configurations for different deployment scenarios
 */
export const PRESETS = {
  /**
   * Local Development Preset
   * - Single client with localhost redirects
   * - Relaxed security for development convenience
   * - Debug logging enabled
   * - Development interactions enabled
   */
  local: (): Partial<Configuration> => ({
    clients: [
      {
        client_name: 'Local Development',
        client_id: 'local-dev',
        client_secret: 'local-dev-secret',
        redirect_uris: [
          'http://localhost:3000/callback',
          'http://localhost:3000/auth/callback',
          'http://localhost:8080/callback',
          'http://127.0.0.1:3000/callback',
        ],
        post_logout_redirect_uris: [
          'http://localhost:3000',
          'http://localhost:8080',
        ],
        response_types: ['code'],
        grant_types: ['authorization_code', 'refresh_token'],
        token_endpoint_auth_method: 'client_secret_post',
        application_type: 'web',
      } as ClientMetadata,
    ],
    cookies: {
      keys: [generateSecureRandom(32)],
    } as any,
    claims: {
      openid: ['sub', 'sid'],
      email: ['email', 'email_verified'],
      profile: ['name', 'nickname', 'given_name', 'family_name', 'groups', 'picture'],
    },
    scopes: ['openid', 'profile', 'email', 'offline_access'],
    features: {
      devInteractions: { enabled: true }, // Enable for easier debugging
      revocation: { enabled: true },
      introspection: { enabled: true },
      deviceFlow: { enabled: false },
      clientCredentials: { enabled: true },
    },
    ttl: {
      AccessToken: 60 * 60, // 1 hour
      AuthorizationCode: 10 * 60, // 10 minutes
      IdToken: 60 * 60, // 1 hour
      RefreshToken: 14 * 24 * 60 * 60, // 14 days
    },
  }),

  /**
   * Self-Hosted Small Team Preset
   * - Balanced security and convenience
   * - Longer token lifetimes for stable environments
   * - Multiple OAuth flows enabled
   */
  selfHosted: (): Partial<Configuration> => ({
    clients: [
      {
        client_name: 'Self-Hosted Application',
        client_id: process.env.CLIENT_ID || generateSecureRandom(16),
        client_secret: process.env.CLIENT_SECRET || generateSecureRandom(32),
        redirect_uris: process.env.REDIRECT_URIS?.split(',') || [],
        post_logout_redirect_uris: process.env.POST_LOGOUT_REDIRECT_URIS?.split(',') || [],
        response_types: ['code'],
        grant_types: ['authorization_code', 'refresh_token', 'client_credentials'],
        token_endpoint_auth_method: 'client_secret_basic',
        introspection_endpoint_auth_method: 'client_secret_basic',
        application_type: 'web',
      } as ClientMetadata,
    ],
    cookies: {
      keys: process.env.COOKIES_KEYS ? JSON.parse(process.env.COOKIES_KEYS) : [generateSecureRandom(32)],
    } as any,
    claims: {
      openid: ['sub', 'sid'],
      email: ['email', 'email_verified'],
      profile: ['name', 'nickname', 'given_name', 'family_name', 'groups', 'picture'],
    },
    scopes: ['openid', 'profile', 'email', 'offline_access'],
    features: {
      devInteractions: { enabled: false },
      revocation: { enabled: true },
      introspection: { enabled: true },
      deviceFlow: { enabled: false },
      clientCredentials: { enabled: true },
    },
    ttl: {
      AccessToken: 60 * 60, // 1 hour
      AuthorizationCode: 10 * 60, // 10 minutes
      IdToken: 60 * 60, // 1 hour
      RefreshToken: 30 * 24 * 60 * 60, // 30 days
    },
  }),

  /**
   * Testing/CI Preset
   * - Optimized for automated testing
   * - Short token lifetimes
   * - Simplified configuration
   */
  testing: (): Partial<Configuration> => ({
    clients: [
      {
        client_name: 'Test Client',
        client_id: 'test-client',
        client_secret: 'test-secret',
        redirect_uris: [
          'http://localhost:3000/callback',
          'http://test-app:3000/callback',
        ],
        post_logout_redirect_uris: [
          'http://localhost:3000',
          'http://test-app:3000',
        ],
        response_types: ['code'],
        grant_types: ['authorization_code', 'refresh_token'],
        token_endpoint_auth_method: 'client_secret_post',
        application_type: 'web',
      } as ClientMetadata,
    ],
    cookies: {
      keys: ['test-cookie-key-12345678901234567890123456789012'],
    },
    claims: {
      openid: ['sub', 'sid'],
      email: ['email', 'email_verified'],
      profile: ['name', 'given_name', 'family_name', 'groups'],
    },
    scopes: ['openid', 'profile', 'email', 'offline_access'],
    features: {
      devInteractions: { enabled: false },
      revocation: { enabled: true },
      introspection: { enabled: true },
    },
    ttl: {
      AccessToken: 5 * 60, // 5 minutes
      AuthorizationCode: 1 * 60, // 1 minute
      IdToken: 5 * 60, // 5 minutes
      RefreshToken: 60 * 60, // 1 hour
    },
  }),
};

/**
 * Get preset configuration by name
 */
export const getPreset = (presetName: string): Partial<Configuration> => {
  const preset = PRESETS[presetName as keyof typeof PRESETS];
  if (!preset) {
    throw new Error(`Unknown preset: ${presetName}. Available presets: ${Object.keys(PRESETS).join(', ')}`);
  }
  return preset();
};

/**
 * Detect environment and return appropriate preset
 */
export const detectEnvironmentPreset = (): string => {
  // Check explicit preset environment variable
  if (process.env.OIDC_PRESET) {
    return process.env.OIDC_PRESET;
  }

  // Detect from NODE_ENV
  const nodeEnv = process.env.NODE_ENV?.toLowerCase();
  if (nodeEnv === 'test' || nodeEnv === 'testing') {
    return 'testing';
  }

  // Check for CI environment
  if (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true') {
    return 'testing';
  }

  // Check for Docker environment with minimal config
  if (process.env.DOCKER === 'true' && !process.env.CLIENT_ID) {
    return 'local';
  }

  // Check if issuer is localhost
  const issuer = process.env.ISSUER || `http://localhost:${process.env.PORT || 8080}`;
  if (issuer.includes('localhost') || issuer.includes('127.0.0.1')) {
    return 'local';
  }

  // Default to self-hosted for production-like environments
  return 'selfHosted';
};

/**
 * Apply preset to configuration
 */
export const applyPreset = (
  baseConfig: Partial<Configuration>,
  presetName?: string
): Partial<Configuration> => {
  const preset = presetName || detectEnvironmentPreset();
  console.log(`[PRESET] Applying configuration preset: ${preset}`);
  
  const presetConfig = getPreset(preset);
  
  // Merge preset with base config (base config takes precedence)
  return {
    ...presetConfig,
    ...baseConfig,
    // Special handling for nested objects
    clients: baseConfig.clients || presetConfig.clients,
    cookies: { ...presetConfig.cookies, ...baseConfig.cookies },
    claims: { ...presetConfig.claims, ...baseConfig.claims },
    features: { ...presetConfig.features, ...baseConfig.features },
    ttl: { ...presetConfig.ttl, ...baseConfig.ttl },
  };
};
