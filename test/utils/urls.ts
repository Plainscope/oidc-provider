/**
 * Centralized service URLs for e2e tests.
 *
 * All values are configurable via environment (or test/.env, loaded by
 * playwright.config.ts) so the suite can run against non-default ports,
 * e.g. when localhost:8080 is already taken:
 *
 *   DEMO_PORT=18080 docker compose up -d
 *   DEMO_BASE_URL=http://localhost:18080 npm run test:e2e
 *
 * IMPORTANT: DEMO_BASE_URL must match the provider's registered redirect
 * URIs, which docker-compose derives from DEMO_PORT
 * (http://localhost:${DEMO_PORT}/signin-oidc). Keep them in sync.
 */

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function envUrl(name: string, fallback: string): string {
  return stripTrailingSlash(process.env[name] || fallback);
}

/** Demo app (default http://localhost:8080). */
export const DEMO_BASE_URL = envUrl('DEMO_BASE_URL', 'http://localhost:8080');

/** OIDC provider public origin (default http://localhost:9080). */
export const PROVIDER_BASE_URL = envUrl('PROVIDER_BASE_URL', 'http://localhost:9080');

/**
 * Directory service (default http://localhost:7080).
 * DIRECTORY_URL is accepted as a legacy alias.
 */
export const DIRECTORY_BASE_URL = stripTrailingSlash(
  process.env.DIRECTORY_BASE_URL || process.env.DIRECTORY_URL || 'http://localhost:7080'
);

/** Port extracted from a base URL ('' when default for the scheme). */
export function portOf(baseUrl: string): string {
  try {
    return new URL(baseUrl).port;
  } catch {
    return '';
  }
}

/** Host (hostname:port) extracted from a base URL, for URL assertions. */
export function hostOf(baseUrl: string): string {
  try {
    return new URL(baseUrl).host;
  } catch {
    return baseUrl;
  }
}

/** Demo app port, for assertions that compare against url.port. */
export const DEMO_PORT = portOf(DEMO_BASE_URL);

/** Demo app host, for `toContain` URL assertions. */
export const DEMO_HOST = hostOf(DEMO_BASE_URL);

/** Provider host, for negative redirect assertions. */
export const PROVIDER_HOST = hostOf(PROVIDER_BASE_URL);
