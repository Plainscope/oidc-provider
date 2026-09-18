/**
 * Quick-start helper utilities for generating sample configuration and validating production settings.
 */

import crypto from 'node:crypto';

const generateSecureRandom = (bytes: number = 32): string => {
  return crypto.randomBytes(bytes).toString('hex');
};

export const generateQuickStartConfig = () => {
  const clientId = process.env.CLIENT_ID || 'local-dev';
  const clientSecret = process.env.CLIENT_SECRET || 'local-dev-secret';

  return {
    envExample: `# Quick-start local development values (NOT for production)
CLIENT_ID=${clientId}
CLIENT_SECRET=${clientSecret}
REDIRECT_URIS=http://localhost:3000/callback
ISSUER=http://localhost:8080
OIDC_PRESET=local
`,
    dockerComposeSnippet: `services:
  provider:
    environment:
      - ISSUER=http://localhost:8080
      - CLIENT_ID=${clientId}
      - CLIENT_SECRET=${clientSecret}
      - REDIRECT_URIS=http://localhost:3000/callback
      - OIDC_PRESET=local
    volumes:
      - ./data:/app/data
`,
  };
};

export const validateProductionConfig = () => {
  if (process.env.NODE_ENV !== 'production') return;

  const warnings: string[] = [];
  const errors: string[] = [];
  const issuer = process.env.ISSUER;
  if (issuer && !issuer.startsWith('https://')) warnings.push('ISSUER should use HTTPS in production');

  if (!process.env.COOKIES_KEYS) {
    errors.push('Cookie keys must be explicitly configured in production (COOKIES_KEYS)');
  } else {
    try {
      const parsed = JSON.parse(process.env.COOKIES_KEYS);
      if (!Array.isArray(parsed) || parsed.length === 0) errors.push('COOKIES_KEYS must be a non-empty JSON array of keys');
    } catch (e) {
      errors.push('COOKIES_KEYS is not valid JSON: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  const knownDevClientSecrets = [
    'local-dev-secret',
    'local-dev-client-secret',
    'test-secret',
    'test-client-secret',
    'dev-secret',
  ];
  if (process.env.CLIENT_SECRET && knownDevClientSecrets.includes(process.env.CLIENT_SECRET)) {
    errors.push('Default development client secret detected in production');
  }

  if (process.env.COOKIES_KEYS) {
    try {
      const parsed = JSON.parse(process.env.COOKIES_KEYS);
      if (Array.isArray(parsed)) {
        const testKey = 'test-cookie-key-12345678901234567890123456789012';
        if (parsed.some(key => key === testKey)) errors.push('Test-only cookie key detected in production');
      }
    } catch { /* JSON validation above reports malformed input. */ }
  }

  if (process.env.OIDC_PRESET === 'local' || process.env.OIDC_PRESET === 'testing') {
    warnings.push(`Development preset "${process.env.OIDC_PRESET}" is being used in production`);
  }

  if (warnings.length > 0 || errors.length > 0) {
    console.log('\n' + '⚠️'.repeat(40));
    console.log('PRODUCTION CONFIGURATION WARNINGS');
    console.log('⚠️'.repeat(40) + '\n');
    if (errors.length > 0) {
      console.error('❌ ERRORS (must be fixed):');
      errors.forEach(err => console.error(`   • ${err}`));
      console.log('');
    }
    if (warnings.length > 0) {
      console.warn('⚠️  WARNINGS (should be addressed):');
      warnings.forEach(warn => console.warn(`   • ${warn}`));
      console.log('');
    }
    console.log('See documentation: https://github.com/Plainscope/oidc-provider/tree/main/docs/guides/production-deployment.md');
    console.log('⚠️'.repeat(40) + '\n');
    if (errors.length > 0) throw new Error('Production configuration errors detected. Server will not start.');
  }
};
