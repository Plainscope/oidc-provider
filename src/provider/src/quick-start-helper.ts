/**
 * Quick Start Helper
 * Provides helpful guidance for first-time users and local development scenarios
 */

import crypto from 'node:crypto';

/**
 * Display quick start information if in local development mode
 */
export const displayQuickStartInfo = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const issuer = process.env.ISSUER || `http://localhost:${process.env.PORT || 8080}`;
  const isLocalDev = issuer.includes('localhost') || issuer.includes('127.0.0.1');
  
  // Only show quick start for local development
  if (!isLocalDev || nodeEnv === 'production') {
    return;
  }

  console.log('\n' + '='.repeat(80));
  console.log('🚀 OIDC Provider - Quick Start Mode');
  console.log('='.repeat(80));
  console.log('\n📍 Server Information:');
  console.log(`   Issuer: ${issuer}`);
  console.log(`   Environment: ${nodeEnv}`);
  console.log(`   Port: ${process.env.PORT || 8080}`);
  
  console.log('\n🔐 Default Test Credentials:');
  console.log('   Email: admin@localhost');
  console.log('   Password: Rays-93-Accident');
  console.log('   ⚠️  WARNING: Development-only credentials. Change in production!');
  
  console.log('\n⚙️  Quick Configuration:');
  console.log('   • Using auto-detected preset for easy setup');
  console.log('   • Default client configured for localhost');
  console.log('   • Development features enabled');
  
  console.log('\n📚 Useful Endpoints:');
  console.log(`   • Discovery: ${issuer}/.well-known/openid-configuration`);
  console.log(`   • Authorization: ${issuer}/auth`);
  console.log(`   • Token: ${issuer}/token`);
  console.log(`   • Health Check: ${issuer}/healthz`);
  
  console.log('\n🔧 Environment Variables for Customization:');
  console.log('   • OIDC_PRESET=local|selfHosted|testing - Choose configuration preset');
  console.log('   • CLIENT_ID - OAuth client identifier');
  console.log('   • CLIENT_SECRET - OAuth client secret');
  console.log('   • REDIRECT_URIS - Comma-separated redirect URIs');
  console.log('   • DIRECTORY_TYPE=local|remote - User directory type');
  
  console.log('\n📖 Documentation:');
  console.log('   • GitHub: https://github.com/Plainscope/oidc-provider');
  console.log('   • Full Docs: https://github.com/Plainscope/oidc-provider/tree/main/docs');
  
  console.log('\n💡 Tips:');
  console.log('   • Set OIDC_AUTO_PRESET=false to disable automatic preset detection');
  console.log('   • Set FEATURES_DEV_INTERACTIONS=true for debug UI');
  console.log('   • Check logs above for loaded configuration details');
  
  console.log('\n' + '='.repeat(80) + '\n');
};

/**
 * Generate sample client configuration for documentation
 */
export const generateSampleClientConfig = () => {
  const clientId = crypto.randomBytes(16).toString('hex');
  const clientSecret = crypto.randomBytes(32).toString('hex');
  const cookieKey = crypto.randomBytes(32).toString('hex');
  
  return {
    clientId,
    clientSecret,
    cookieKey,
    envExample: `
# OIDC Provider Configuration
PORT=8080
ISSUER=http://localhost:8080
NODE_ENV=development

# Client Configuration
CLIENT_ID=${clientId}
CLIENT_SECRET=${clientSecret}
REDIRECT_URIS=http://localhost:3000/callback
POST_LOGOUT_REDIRECT_URIS=http://localhost:3000

# Cookie Configuration
COOKIES_KEYS=["${cookieKey}"]

# Preset Configuration (optional)
OIDC_PRESET=local
# or set OIDC_AUTO_PRESET=false to disable auto-detection

# Directory Configuration
DIRECTORY_TYPE=local
# For remote directory:
# DIRECTORY_TYPE=remote
# DIRECTORY_BASE_URL=http://directory:5000
`,
    dockerComposeExample: `
version: '3.8'

services:
  oidc-provider:
    image: plainscope/simple-oidc-provider:latest
    ports:
      - "8080:8080"
    environment:
      - PORT=8080
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

/**
 * Display warning for production without proper configuration
 */
export const validateProductionConfig = () => {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const warnings: string[] = [];
  const errors: string[] = [];

  // Check HTTPS in production
  const issuer = process.env.ISSUER;
  if (issuer && !issuer.startsWith('https://')) {
    warnings.push('ISSUER should use HTTPS in production');
  }

  // Check cookie keys
  if (!process.env.COOKIES_KEYS) {
    errors.push('Cookie keys must be explicitly configured in production (COOKIES_KEYS)');
  } else {
    try {
      const parsed = JSON.parse(process.env.COOKIES_KEYS);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        errors.push('COOKIES_KEYS must be a non-empty JSON array of keys');
      }
    } catch (e) {
      errors.push('COOKIES_KEYS is not valid JSON: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  // Check client secrets
  if (process.env.CLIENT_SECRET === 'local-dev-secret' || process.env.CLIENT_SECRET === 'test-secret') {
    errors.push('Default development client secret detected in production');
  }

  // Check preset
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

    console.log('See documentation: https://github.com/Plainscope/oidc-provider/docs/guides/production-deployment.md');
    console.log('⚠️'.repeat(40) + '\n');

    if (errors.length > 0) {
      throw new Error('Production configuration errors detected. Server will not start.');
    }
  }
};
