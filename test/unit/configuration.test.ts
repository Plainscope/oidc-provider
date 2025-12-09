/**
 * Unit tests for configuration module
 * Run with: node --test test/unit/configuration.test.js
 * 
 * Note: This test requires the provider to be built first (npm run build in src/provider)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// Test helpers
function resetEnv() {
  delete process.env.CLIENTS;
  delete process.env.CLIENT_ID;
  delete process.env.CLIENT_SECRET;
  delete process.env.CLIENT_NAME;
  delete process.env.REDIRECT_URIS;
  delete process.env.POST_LOGOUT_REDIRECT_URIS;
  delete process.env.GRANT_TYPES;
  delete process.env.RESPONSE_TYPES;
  delete process.env.TOKEN_ENDPOINT_AUTH_METHOD;
  delete process.env.INTROSPECTION_ENDPOINT_AUTH_METHOD;
  delete process.env.APPLICATION_TYPE;
  delete process.env.CONFIG;
  delete process.env.COOKIES;
  delete process.env.COOKIES_KEYS;
  delete process.env.CLAIMS;
  delete process.env.SCOPES;
  delete process.env.FEATURES_DEV_INTERACTIONS;
  delete process.env.JWKS;
  delete process.env.CONFIG_FILE;
}

describe('Configuration Module', () => {
  describe('Configuration Precedence', () => {
    it('should load default configuration when no env vars or file', () => {
      resetEnv();
      // Create empty config file for this test
      const testConfigPath = path.join(__dirname, 'test-config-empty.json');
      fs.writeFileSync(testConfigPath, JSON.stringify({ clients: [], cookies: { keys: [] } }));
      process.env.CONFIG_FILE = testConfigPath;
      
      // Clear require cache and reload
      delete require.cache[require.resolve('../../../src/provider/dist/configuration')];
      const { configuration } = require('../../../src/provider/dist/configuration');
      
      assert.ok(Array.isArray(configuration.scopes), 'scopes should be an array');
      assert.ok(configuration.scopes.includes('openid'), 'should include openid scope');
      
      // Cleanup
      fs.unlinkSync(testConfigPath);
      resetEnv();
    });

    it('should override defaults with config file', () => {
      resetEnv();
      const testConfigPath = path.join(__dirname, 'test-config-override.json');
      fs.writeFileSync(testConfigPath, JSON.stringify({
        scopes: ['custom', 'scopes'],
        clients: []
      }));
      process.env.CONFIG_FILE = testConfigPath;
      
      delete require.cache[require.resolve('../../../src/provider/dist/configuration')];
      const { configuration } = require('../../../src/provider/dist/configuration');
      
      assert.deepStrictEqual(configuration.scopes, ['custom', 'scopes'], 'should use config file scopes');
      
      fs.unlinkSync(testConfigPath);
      resetEnv();
    });

    it('should override config file with CONFIG env var', () => {
      resetEnv();
      const testConfigPath = path.join(__dirname, 'test-config-env.json');
      fs.writeFileSync(testConfigPath, JSON.stringify({
        scopes: ['from', 'file'],
        clients: []
      }));
      process.env.CONFIG_FILE = testConfigPath;
      process.env.CONFIG = JSON.stringify({ scopes: ['from', 'env'] });
      
      delete require.cache[require.resolve('../../../src/provider/dist/configuration')];
      const { configuration } = require('../../../src/provider/dist/configuration');
      
      assert.deepStrictEqual(configuration.scopes, ['from', 'env'], 'CONFIG env var should override file');
      
      fs.unlinkSync(testConfigPath);
      resetEnv();
    });

    it('should override CONFIG env var with explicit env vars', () => {
      resetEnv();
      process.env.CONFIG = JSON.stringify({ scopes: ['from', 'config'] });
      process.env.SCOPES = 'explicit,override';
      
      delete require.cache[require.resolve('../../../src/provider/dist/configuration')];
      const { configuration } = require('../../../src/provider/dist/configuration');
      
      assert.deepStrictEqual(configuration.scopes, ['explicit', 'override'], 'explicit SCOPES should win');
      
      resetEnv();
    });
  });

  describe('Array Replacement', () => {
    it('should replace arrays instead of concatenating', () => {
      resetEnv();
      const testConfigPath = path.join(__dirname, 'test-config-array.json');
      fs.writeFileSync(testConfigPath, JSON.stringify({
        scopes: ['scope1', 'scope2', 'scope3'],
        clients: []
      }));
      process.env.CONFIG_FILE = testConfigPath;
      process.env.SCOPES = 'new1,new2';
      
      delete require.cache[require.resolve('../../../src/provider/dist/configuration')];
      const { configuration } = require('../../../src/provider/dist/configuration');
      
      assert.strictEqual(configuration.scopes.length, 2, 'should have 2 scopes, not 5');
      assert.deepStrictEqual(configuration.scopes, ['new1', 'new2'], 'should replace not concat');
      
      fs.unlinkSync(testConfigPath);
      resetEnv();
    });
  });

  describe('Individual Client Environment Variables', () => {
    it('should create client from individual env vars', () => {
      resetEnv();
      process.env.CLIENT_ID = 'test-client-id';
      process.env.CLIENT_SECRET = 'test-secret';
      process.env.CLIENT_NAME = 'Test Client';
      process.env.REDIRECT_URIS = 'http://localhost:3000/callback,http://localhost:3001/callback';
      
      delete require.cache[require.resolve('../../../src/provider/dist/configuration')];
      const { configuration } = require('../../../src/provider/dist/configuration');
      
      assert.strictEqual(configuration.clients.length, 1, 'should have 1 client');
      assert.strictEqual(configuration.clients[0].client_id, 'test-client-id');
      assert.strictEqual(configuration.clients[0].client_secret, 'test-secret');
      assert.strictEqual(configuration.clients[0].client_name, 'Test Client');
      assert.strictEqual(configuration.clients[0].redirect_uris?.length, 2);
      
      resetEnv();
    });

    it('should prefer CLIENTS env var over individual vars', () => {
      resetEnv();
      process.env.CLIENT_ID = 'individual-client';
      process.env.CLIENTS = JSON.stringify([
        { client_id: 'json-client-1' },
        { client_id: 'json-client-2' }
      ]);
      
      delete require.cache[require.resolve('../../../src/provider/dist/configuration')];
      const { configuration } = require('../../../src/provider/dist/configuration');
      
      assert.strictEqual(configuration.clients.length, 2, 'should use CLIENTS array');
      assert.strictEqual(configuration.clients[0].client_id, 'json-client-1');
      
      resetEnv();
    });
  });

  describe('SCOPES Environment Variable', () => {
    it('should filter out empty strings from SCOPES', () => {
      resetEnv();
      process.env.SCOPES = 'openid,,profile, ,email';
      
      delete require.cache[require.resolve('../../../src/provider/dist/configuration')];
      const { configuration } = require('../../../src/provider/dist/configuration');
      
      assert.deepStrictEqual(configuration.scopes, ['openid', 'profile', 'email'], 'should filter empty strings');
      
      resetEnv();
    });

    it('should handle empty SCOPES gracefully', () => {
      resetEnv();
      process.env.SCOPES = '';
      
      delete require.cache[require.resolve('../../../src/provider/dist/configuration')];
      const { configuration } = require('../../../src/provider/dist/configuration');
      
      // Should use default scopes when SCOPES is empty
      assert.ok(Array.isArray(configuration.scopes), 'scopes should still be an array');
      
      resetEnv();
    });
  });

  describe('JWKS Support', () => {
    it('should support JWKS environment variable', () => {
      resetEnv();
      process.env.JWKS = JSON.stringify({ keys: [{ kty: 'RSA', kid: 'test-key' }] });
      
      delete require.cache[require.resolve('../../../src/provider/dist/configuration')];
      const { configuration } = require('../../../src/provider/dist/configuration');
      
      assert.ok(configuration.jwks, 'should have jwks config');
      assert.strictEqual(configuration.jwks.keys.length, 1);
      assert.strictEqual(configuration.jwks.keys[0].kty, 'RSA');
      
      resetEnv();
    });
  });

  describe('Safe JSON Parsing', () => {
    it('should handle malformed JSON gracefully', () => {
      resetEnv();
      process.env.CLIENTS = 'invalid json {{{';
      
      delete require.cache[require.resolve('../../../src/provider/dist/configuration')];
      const { configuration } = require('../../../src/provider/dist/configuration');
      
      // Should not crash and should use defaults
      assert.ok(Array.isArray(configuration.clients), 'should still have clients array');
      
      resetEnv();
    });
  });

  describe('Prototype Pollution Protection', () => {
    it('should prevent prototype pollution via __proto__', () => {
      resetEnv();
      const originalPrototype = Object.prototype.toString();
      process.env.CONFIG = JSON.stringify({
        '__proto__': { polluted: true }
      });
      
      delete require.cache[require.resolve('../../../src/provider/dist/configuration')];
      require('../../../src/provider/dist/configuration');
      
      assert.strictEqual((Object.prototype as any).polluted, undefined, 'prototype should not be polluted');
      assert.strictEqual(Object.prototype.toString(), originalPrototype, 'prototype should be unchanged');
      
      resetEnv();
    });
  });
});
