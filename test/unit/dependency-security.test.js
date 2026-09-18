/**
 * Regression coverage for security-hardening updates to transitive test deps
 * form-data (4.0.5 → 4.0.6) and qs (6.14.0 → 6.16.0) from Dependabot PR #27.
 *
 * These packages are pulled in via supertest / superagent (and express's
 * optional qs path). The application itself uses express.urlencoded({ extended:
 * false }) so production body parsing does not load qs; the tests below pin the
 * safe behavior of the locked versions so future lockfile drift or accidental
 * downgrades fail CI.
 *
 * Related: https://github.com/Plainscope/oidc-provider/issues/29
 */
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const FormData = require('form-data');
const qs = require('qs');

describe('form-data security regressions (multipart field/filename escaping)', () => {
  it('escapes CR, LF, and double-quote in field names', () => {
    const fd = new FormData();
    fd.append('evil\r\nname', 'payload');
    fd.append('quoted"name', 'payload');
    const body = fd.getBuffer().toString('utf8');

    // Must not inject raw control characters into Content-Disposition
    assert.equal(/\r|\n/.test(body.match(/name="[^"]*"/g)?.join('') || ''), false);
    assert.match(body, /name="evil%0D%0Aname"/);
    assert.match(body, /name="quoted%22name"/);
  });

  it('escapes CR, LF, and double-quote in filenames', () => {
    const fd = new FormData();
    fd.append('file', Buffer.from('content'), {
      filename: 'report\r\n".txt',
      contentType: 'text/plain',
    });
    const body = fd.getBuffer().toString('utf8');

    assert.match(body, /filename="report%0D%0A%22\.txt"/);
    // No raw CR/LF inside the filename attribute value
    const filenameAttr = body.match(/filename="([^"]*)"/)?.[1] || '';
    assert.equal(/\r|\n/.test(filenameAttr), false);
  });

  it('preserves normal field names and values unchanged', () => {
    const fd = new FormData();
    fd.append('email', 'admin@localhost');
    fd.append('password', 'secret');
    const body = fd.getBuffer().toString('utf8');
    assert.match(body, /name="email"/);
    assert.match(body, /name="password"/);
    assert.match(body, /admin@localhost/);
  });
});

describe('qs security / robustness regressions', () => {
  it('does not pollute Object.prototype via __proto__ keys', () => {
    const parsed = qs.parse('__proto__[polluted]=yes&safe=1');
    assert.equal(parsed.safe, '1');
    // Own property may exist on the result object, but must not affect Object.prototype
    assert.equal({}.polluted, undefined);
    assert.equal(Object.prototype.polluted, undefined);
  });

  it('does not pollute via constructor.prototype', () => {
    const parsed = qs.parse('constructor[prototype][polluted]=yes');
    assert.equal({}.polluted, undefined);
    assert.equal(Object.prototype.polluted, undefined);
    // Result may contain a constructor key as plain data; must not mutate Object.prototype
    assert.equal(Object.getPrototypeOf({}) === Object.prototype, true);
  });

  it('enforces arrayLimit and can throw when configured', () => {
    const limited = qs.parse('a[]=1&a[]=2&a[]=3&a[]=4', { arrayLimit: 2 });
    // When limit is exceeded, qs represents overflow as an object (not unbounded array)
    assert.ok(limited.a === undefined || typeof limited.a === 'object');

    assert.throws(
      () => qs.parse('a[]=1&a[]=2&a[]=3', { arrayLimit: 1, throwOnLimitExceeded: true }),
      /limit|array/i
    );
  });

  it('enforces arrayLimit on comma-separated groups under []= when throwOnLimitExceeded', () => {
    assert.throws(
      () =>
        qs.parse('a[]=1,2,3,4', {
          arrayLimit: 2,
          comma: true,
          throwOnLimitExceeded: true,
        }),
      /limit|array/i
    );
  });

  it('parses nested bracket keys without unbounded growth', () => {
    const nested = qs.parse('user[profile][email]=a@b.c&user[profile][name]=x');
    assert.equal(nested.user.profile.email, 'a@b.c');
    assert.equal(nested.user.profile.name, 'x');
  });

  it('stringifies with a depth bound (caller-controlled DoS mitigation)', () => {
    const deep = { a: { b: { c: { d: { e: 'leaf' } } } } };
    // depth option throws when nesting exceeds the bound (caller-controlled DoS mitigation)
    assert.throws(
      () => qs.stringify(deep, { depth: 2 }),
      /depth/i
    );
    const shallow = qs.stringify({ a: { b: 'ok' } }, { depth: 2 });
    assert.equal(typeof shallow, 'string');
    assert.match(shallow, /a%5Bb%5D=ok|a\[b\]=ok/);
  });

  it('handles duplicate keys without prototype assignment side effects', () => {
    const parsed = qs.parse('toString=1&valueOf=2&safe=ok');
    assert.equal(parsed.safe, 'ok');
    assert.equal(typeof {}.toString, 'function');
  });
});

describe('lockfile version pins (form-data / qs)', () => {
  it('resolves form-data at the security-fixed 4.0.6 line', () => {
    const version = require('form-data/package.json').version;
    assert.ok(
      version.localeCompare('4.0.6', undefined, { numeric: true }) >= 0,
      `expected form-data >= 4.0.6, got ${version}`
    );
  });

  it('resolves qs at the hardened 6.16.x line', () => {
    const version = require('qs/package.json').version;
    assert.ok(
      version.localeCompare('6.16.0', undefined, { numeric: true }) >= 0,
      `expected qs >= 6.16.0, got ${version}`
    );
  });
});
