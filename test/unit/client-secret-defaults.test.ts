/**
 * Regression coverage for canonical non-production CLIENT_SECRET and
 * production rejection of known development defaults (issue #36).
 *
 * Run with: npx tsx --test test/unit/client-secret-defaults.test.ts
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { getPreset } from '../../src/provider/src/presets';
import { validateProductionConfig } from '../../src/provider/src/quick-start-helper';

describe('canonical non-production CLIENT_SECRET', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('local preset uses the canonical local-dev-secret', () => {
    const preset = getPreset('local');
    const client = (preset.clients as any[])?.[0];
    assert.equal(client?.client_secret, 'local-dev-secret');
  });

  it('testing preset uses test-secret (CI-scoped, distinct from local)', () => {
    const preset = getPreset('testing');
    const client = (preset.clients as any[])?.[0];
    assert.equal(client?.client_secret, 'test-secret');
  });
});

describe('production rejection of known development client secrets', () => {
  const originalEnv = { ...process.env };
  const known = [
    'local-dev-secret',
    'local-dev-client-secret',
    'test-secret',
    'test-client-secret',
    'dev-secret',
  ];

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'production';
    process.env.COOKIES_KEYS = JSON.stringify(['a'.repeat(64)]);
    process.env.ISSUER = 'https://oidc.example.com';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  for (const secret of known) {
    it(`rejects known development secret "${secret}" in production`, () => {
      process.env.CLIENT_SECRET = secret;
      assert.throws(
        () => validateProductionConfig(),
        (err: unknown) =>
          err instanceof Error &&
          err.message.includes('Production configuration errors detected'),
      );
    });
  }

  it('does not flag a strong random production secret', () => {
    process.env.CLIENT_SECRET = 'a'.repeat(64);
    assert.doesNotThrow(() => validateProductionConfig());
  });
});
