import crypto from 'node:crypto';

/** Generate a cryptographically secure secret for non-production development. */
export const generateDevelopmentSecret = (bytes = 32): string =>
  crypto.randomBytes(bytes).toString('hex');
