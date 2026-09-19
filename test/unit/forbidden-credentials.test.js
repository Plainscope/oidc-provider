/**
 * CI regression: prevent reintroduction of retired credential-like defaults
 * that previously triggered GitHub secret scanning (issue #37 / PR #25/#39).
 *
 * Policy:
 * - Development/test examples must use unmistakably non-production placeholders
 *   (e.g. test-password, local-dev-secret, local-dev-bearer-token, test-client-id).
 * - The retired realistic values listed below must never reappear in tracked
 *   source, config, fixtures, or documentation.
 *
 * To add a new test credential: prefer the canonical placeholders above, or a
 * value that clearly contains "test", "local-dev", or "example". Never commit
 * high-entropy hex/base64 strings that look production-ready.
 *
 * Run: node --test test/unit/forbidden-credentials.test.js
 */
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

/** Values retired in the secret-scanning remediation; must not reappear. */
const FORBIDDEN = [
  'Rays-93-Accident',
  'Signal-27-Bridge',
  '85125d57-a403-4fe2-84d8-62c6db9b6d73',
  '+XiBpec4OAIeFBSbRdGaAGLNz6ZFfAbq',
  'sk-AKnZKbq1O9RYwEagYhARZWlrPpbMCvliO8H646DmndO2Phth',
];

const REPO_ROOT = path.resolve(__dirname, '../..');
const SKIP_DIR_NAMES = new Set([
  '.git',
  'node_modules',
  'dist',
  'compiled',
  '.tmp',
  'playwright-report',
  'test-results',
  'coverage',
]);
const SKIP_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.pdf', '.zip',
  '.map', '.lock',
]);
/** This file must list the forbidden strings; exclude it from the scan. */
const SELF = path.normalize(path.join(__dirname, 'forbidden-credentials.test.js'));

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    if (SKIP_DIR_NAMES.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walk(full, out);
    } else if (ent.isFile()) {
      const ext = path.extname(ent.name).toLowerCase();
      if (SKIP_EXTENSIONS.has(ext)) continue;
      out.push(full);
    }
  }
  return out;
}

describe('forbidden credential regression scan (issue #37)', () => {
  it('does not reintroduce retired credential-like defaults in tracked files', () => {
    const files = walk(REPO_ROOT);
    const hits = [];

    for (const file of files) {
      if (path.normalize(file) === SELF) continue;
      let text;
      try {
        text = fs.readFileSync(file, 'utf8');
      } catch {
        continue;
      }
      for (const value of FORBIDDEN) {
        if (text.includes(value)) {
          const rel = path.relative(REPO_ROOT, file);
          hits.push({ file: rel, value });
        }
      }
    }

    if (hits.length > 0) {
      const lines = hits.map(
        (h) =>
          `  ${h.file}: contains retired value "${h.value}"\n` +
          `    Remediation: replace with an unmistakably non-production placeholder ` +
          `(test-password, local-dev-secret, local-dev-bearer-token, test-client-id). ` +
          `See CONTRIBUTING.md (Test credentials).`,
      );
      assert.fail(
        `Retired credential-like values reintroduced (${hits.length}):\n${lines.join('\n')}`,
      );
    }
  });

  it('documents the forbidden list (self-check that FORBIDDEN is non-empty)', () => {
    assert.ok(FORBIDDEN.length >= 5, 'forbidden list should cover passwords, client id/secret, bearer');
    for (const v of FORBIDDEN) {
      assert.ok(v.length >= 8, `forbidden value too short: ${v}`);
    }
  });
});
