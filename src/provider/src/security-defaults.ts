import crypto from 'node:crypto';

/** Generate a cryptographically secure development-only secret. */
export const generateDevelopmentSecret = (bytes = 32): string =>
  crypto.randomBytes(bytes).toString('hex');
