import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateDevelopmentSecret } from '../../src/provider/src/security-defaults';

describe('security defaults', () => {
  it('generates cryptographically random development secrets', () => {
    const first = generateDevelopmentSecret();
    const second = generateDevelopmentSecret();

    assert.equal(first.length, 64);
    assert.equal(second.length, 64);
    assert.match(first, /^[0-9a-f]+$/);
    assert.match(second, /^[0-9a-f]+$/);
    assert.notEqual(first, second);
  });

  it('supports an explicit byte length', () => {
    assert.equal(generateDevelopmentSecret(16).length, 32);
  });
});
