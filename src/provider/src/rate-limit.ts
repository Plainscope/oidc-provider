/**
 * Authentication rate limiting (brute-force mitigation).
 *
 * Scoped narrowly to credential-bearing POST endpoints (login forms) so that
 * routine OIDC flows (authorization, consent, discovery) and automated test
 * suites are not throttled.
 *
 * Enabled by default in production; disabled elsewhere unless explicitly
 * opted in, mirroring the repo's other production-only hardening (HSTS,
 * secure cookies, default-secret rejection):
 *   - RATE_LIMIT_ENABLED=true forces it on (any environment)
 *   - RATE_LIMIT_ENABLED=false forces it off (any environment)
 *   - RATE_LIMIT_MAX / RATE_LIMIT_WINDOW_MS tune threshold (defaults 100 / 15min)
 */
import { RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';

const explicitlyEnabled = process.env.RATE_LIMIT_ENABLED === 'true';
const explicitlyDisabled = process.env.RATE_LIMIT_ENABLED === 'false';
const enabled = explicitlyEnabled || (process.env.NODE_ENV === 'production' && !explicitlyDisabled);

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const parsed = parseInt(raw || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const authLimiter: RequestHandler = enabled
  ? rateLimit({
      windowMs: parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
      limit: parsePositiveInt(process.env.RATE_LIMIT_MAX, 100),
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { error: 'Too many requests, please try again later' },
    })
  : (_req, _res, next) => next();

export const isRateLimitEnabled = enabled;
