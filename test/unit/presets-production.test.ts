import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { getPreset } from '../../src/provider/src/presets';

describe('selfHosted preset production credentials', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.CLIENT_ID;
    delete process.env.CLIENT_SECRET;
    delete process.env.COOKIES_KEYS;
    delete process.env.REDIRECT_URIS;
    delete process.env.POST_LOGOUT_REDIRECT_URIS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('does not synthesize client_secret or cookie keys when NODE_ENV is production', () => {
    process.env.NODE_ENV = 'production';
    const preset = getPreset('selfHosted');
    const client = (preset.clients as any[])?.[0];

    assert.ok(client, 'selfHosted should still define a client shell');
    assert.equal(client.client_secret, undefined, 'must not generate client_secret in production');
    assert.equal(client.client_id, undefined, 'must not generate client_id in production');
    assert.equal((preset as any).cookies, undefined, 'must not generate cookie keys in production');
  });

  it('uses explicitly supplied production credentials from environment', () => {
    process.env.NODE_ENV = 'production';
    process.env.CLIENT_ID = 'explicit-client-id';
    process.env.CLIENT_SECRET = 'a'.repeat(32);
    process.env.COOKIES_KEYS = JSON.stringify(['b'.repeat(64)]);

    const preset = getPreset('selfHosted');
    const client = (preset.clients as any[])?.[0];

    assert.equal(client.client_id, 'explicit-client-id');
    assert.equal(client.client_secret, 'a'.repeat(32));
    assert.deepEqual((preset as any).cookies.keys, ['b'.repeat(64)]);
  });

  it('still generates development secrets when not in production', () => {
    process.env.NODE_ENV = 'development';
    const preset = getPreset('selfHosted');
    const client = (preset.clients as any[])?.[0];

    assert.equal(typeof client.client_secret, 'string');
    assert.ok(client.client_secret.length >= 32);
    assert.equal(typeof client.client_id, 'string');
    assert.ok(Array.isArray((preset as any).cookies?.keys));
    assert.ok((preset as any).cookies.keys[0].length >= 32);
  });
});
