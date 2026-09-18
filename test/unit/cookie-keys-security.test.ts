/**
 * Regression coverage for cookie-signing key generation and production guards.
 * Ensures no predictable default cookie key is ever used at runtime.
 *
 * Run with: node --import tsx --test test/unit/cookie-keys-security.test.ts
 * (or after provider build, via the unit job)
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { generateDevelopmentSecret } from '../../src/provider/src/security-defaults';
import { getPreset } from '../../src/provider/src/presets';

describe('cookie signing keys — no predictable defaults', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.COOKIES_KEYS;
    delete process.env.COOKIES;
    delete process.env.CLIENT_SECRET;
    delete process.env.CLIENT_ID;
    delete process.env.OIDC_PRESET;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('generateDevelopmentSecret produces unique values across calls', () => {
    const a = generateDevelopmentSecret();
    const b = generateDevelopmentSecret();
    assert.notEqual(a, b);
    assert.equal(a.length, 64);
    assert.equal(b.length, 64);
  });

  it('local and testing presets generate distinct cookie keys on each invocation', () => {
    process.env.NODE_ENV = 'development';
    const first = getPreset('local');
    const second = getPreset('local');
    const firstKey = (first as any).cookies?.keys?.[0];
    const secondKey = (second as any).cookies?.keys?.[0];
    assert.equal(typeof firstKey, 'string');
    assert.equal(typeof secondKey, 'string');
    assert.ok(firstKey.length >= 32);
    assert.notEqual(firstKey, secondKey, 'two fresh local presets must not share a cookie key');

    const t1 = getPreset('testing');
    const t2 = getPreset('testing');
    assert.notEqual((t1 as any).cookies.keys[0], (t2 as any).cookies.keys[0]);
  });

  it('selfHosted preset does not emit cookie keys when NODE_ENV=production and COOKIES_KEYS is unset', () => {
    process.env.NODE_ENV = 'production';
    const preset = getPreset('selfHosted');
    assert.equal((preset as any).cookies, undefined);
  });

  it('selfHosted preset honors an explicit COOKIES_KEYS value in production', () => {
    process.env.NODE_ENV = 'production';
    const explicit = 'c'.repeat(64);
    process.env.COOKIES_KEYS = JSON.stringify([explicit]);
    const preset = getPreset('selfHosted');
    assert.deepEqual((preset as any).cookies.keys, [explicit]);
  });
});
