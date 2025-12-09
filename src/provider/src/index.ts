/**
 * OIDC Provider - OAuth 2.0 Authorization Server with OpenID Connect support
 * Main server entry point. Sets up Express, OIDC Provider, and all routes.
 */
import express, { Express, Request, Response, NextFunction } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { Provider } from 'oidc-provider';
import { configuration } from './configuration';
import useDirectory, { IDirectory } from './directories/directory';
import useInteractions from './routes/interations';
import useSqliteAdapter from './sqlite-adapter';

/**
 * Security headers middleware
 * Adds comprehensive security headers to all responses
 */
const securityHeaders = (_req: Request, res: Response, next: NextFunction) => {
  // Prevent clickjacking attacks
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS filter in browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
  );
  
  // Permissions Policy (formerly Feature Policy)
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=()'
  );
  
  // HSTS header for HTTPS (only in production with HTTPS)
  // Note: Start with shorter max-age in initial deployment and gradually increase
  // Default is 1 day (86400s), can be increased to 1 year (31536000s) after validation
  if (process.env.NODE_ENV === 'production' && process.env.ISSUER?.startsWith('https://')) {
    const hstsMaxAge = process.env.HSTS_MAX_AGE || '86400'; // Default: 1 day
    res.setHeader('Strict-Transport-Security', `max-age=${hstsMaxAge}; includeSubDomains; preload`);
  }
  
  next();
};

// Log environment variables for debugging
console.log('[INIT] Starting OIDC Provider with environment:', {
  PORT: process.env.PORT,
  ISSUER: process.env.ISSUER,
  CONFIG: process.env.CONFIG,
  CONFIG_FILE: process.env.CONFIG_FILE,
  CLIENTS: process.env.CLIENTS,
  DIRECTORY_TYPE: process.env.DIRECTORY_TYPE,
  DIRECTORY_CONFIG: process.env.DIRECTORY_CONFIG ? '<set>' : undefined,
  DIRECTORY_USERS: process.env.DIRECTORY_USERS ? '<set>' : undefined,
  DIRECTORY_USERS_FILE: process.env.DIRECTORY_USERS_FILE,
});

/**
 * Validates required environment variables on startup
 * Throws an error if critical variables are missing or invalid
 */
const validateEnvironment = () => {
  const errors: string[] = [];
  
  // Validate PORT
  const port = process.env.PORT || '8080';
  const portNum = parseInt(port, 10);
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    errors.push('PORT must be a valid number between 1 and 65535');
  }
  
  // Validate ISSUER
  const issuer = process.env.ISSUER || `http://localhost:${port}`;
  try {
    new URL(issuer);
  } catch {
    errors.push('ISSUER must be a valid URL');
  }
  
  // Warn about production without HTTPS
  if (process.env.NODE_ENV === 'production' && !issuer.startsWith('https://')) {
    console.warn('[SECURITY WARNING] Production deployment should use HTTPS. Current issuer:', issuer);
  }
  
  // Validate cookie keys in production
  if (process.env.NODE_ENV === 'production') {
    if (process.env.COOKIES_KEYS) {
      try {
        const keys = JSON.parse(process.env.COOKIES_KEYS);
        if (!Array.isArray(keys) || keys.length === 0) {
          errors.push('COOKIES_KEYS must be a non-empty array');
        }
        keys.forEach((key: any, index: number) => {
          if (typeof key !== 'string' || key.length < 64) {
            errors.push(`COOKIES_KEYS[${index}] must be at least 64 characters long for cryptographic security`);
          }
          // Optionally validate hexadecimal format
          if (typeof key === 'string' && !/^[a-fA-F0-9]+$/.test(key)) {
            console.warn(`[VALIDATION WARNING] COOKIES_KEYS[${index}] is not in hexadecimal format. Consider using: openssl rand -hex 32`);
          }
        });
      } catch {
        errors.push('COOKIES_KEYS must be valid JSON array');
      }
    }
  }
  
  if (errors.length > 0) {
    console.error('[VALIDATION ERROR] Environment validation failed:');
    errors.forEach(error => console.error(`  - ${error}`));
    throw new Error('Environment validation failed. See errors above.');
  }
  
  console.log('[VALIDATION] Environment validation passed');
};

// Validate environment before proceeding
validateEnvironment();

const PORT = process.env.PORT || 8080;
const ISSUER = process.env.ISSUER || `http://localhost:${PORT}`;
const DIRECTORY_TYPE = process.env.DIRECTORY_TYPE || 'local';
const resolveDirectoryJson = (): string => {
  if (process.env.DIRECTORY_USERS) {
    return process.env.DIRECTORY_USERS;
  }

  const fallbackPath = process.env.DIRECTORY_USERS_FILE || path.join(__dirname, 'users.json');
  if (fs.existsSync(fallbackPath)) {
    return fs.readFileSync(fallbackPath, 'utf-8');
  }

  throw new Error('No user directory data provided. Set DIRECTORY_USERS or DIRECTORY_USERS_FILE to a valid JSON source.');
};

const DIRECTORY_CONFIG = process.env.DIRECTORY_CONFIG ? JSON.parse(process.env.DIRECTORY_CONFIG) : {
  json: DIRECTORY_TYPE === 'local' ? resolveDirectoryJson() : undefined,
  baseUrl: process.env.DIRECTORY_BASE_URL,
  headers: process.env.DIRECTORY_HEADERS ? JSON.parse(process.env.DIRECTORY_HEADERS) : undefined,
  countEndpoint: process.env.DIRECTORY_COUNT_ENDPOINT,
  findEndpoint: process.env.DIRECTORY_FIND_ENDPOINT,
  validateEndpoint: process.env.DIRECTORY_VALIDATE_ENDPOINT,
};
const directory: IDirectory = useDirectory(DIRECTORY_TYPE as 'local' | 'remote', DIRECTORY_CONFIG);
console.log(`[INIT] Using directory type: ${DIRECTORY_TYPE}`);

/**
 * Main entry point for OIDC Provider server.
 * Sets up Express, view engine, static files, and OIDC routes.
 */
const app: Express = express();
app.set('views', './views');
app.set('view engine', 'pug');
console.log('[INIT] Express app configured with Pug view engine and views directory ./views');

// Initialize OIDC Provider with configuration and custom account finder
const provider = new Provider(ISSUER, {
  ...configuration,
  adapter: useSqliteAdapter,
  findAccount: (_ctx, id) => directory.find(id),
  renderError: async (ctx, out, _error) => {
    console.log('[CONFIG] Custom error renderer called:', { error: out.error, error_description: out.error_description });

    // Render using the Express app's render method
    ctx.type = 'html';
    ctx.body = await new Promise<string>((resolve, reject) => {
      app.render('error', {
        title: 'Authorization Error',
        error: out.error || 'unknown_error',
        error_description: out.error_description || 'An unexpected error occurred',
        state: out.state,
      }, (err, html) => {
        if (err) reject(err);
        else resolve(html);
      });
    });
  },
});
console.log(`[INIT] OIDC Provider initialized with issuer: ${ISSUER}`);

// Enable proxy if behind a reverse proxy
provider.proxy = process.env.PROXY === 'true';
console.log(`[INIT] Proxy mode: ${provider.proxy ? 'enabled' : 'disabled'}`);

// Log all incoming OIDC requests for auditing
provider.use(async (ctx, next) => {
  console.log(`[PROVIDER] ${ctx.method} ${ctx.path} - Headers:`, ctx.headers);
  await next();
});

// Serve static files (CSS, images, etc.)
app.use(express.static('./public'));
console.log('[INIT] Serving static files from ./public');

// Apply security headers to all routes
app.use(securityHeaders);
console.log('[INIT] Security headers middleware enabled');

// Parse URL-encoded bodies (for form submissions)
app.use(express.urlencoded({ extended: false }));
console.log('[INIT] URL-encoded body parser enabled');

// Lightweight health check for container orchestration
app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});

// Register OIDC interaction routes
useInteractions(app, provider, directory);
console.log('[INIT] OIDC interaction routes registered');

// OIDC Provider callback for protocol endpoints
app.use(provider.callback());
console.log('[INIT] OIDC protocol endpoints registered');

// Custom error handler for OIDC errors
app.get('/error', (req, res) => {
  const { error, error_description, state } = req.query;
  console.log('[ERROR_HANDLER] Rendering custom error page:', { error, error_description });
  res.render('error', {
    title: 'Authorization Error',
    error: error || 'unknown_error',
    error_description: error_description || 'An unexpected error occurred',
    state,
  });
});

// Start the server and log configuration
const server = app.listen(PORT, () => {
  console.log(`[SERVER] OIDC Provider is listening on port ${PORT}, issuer: ${ISSUER}`);
  console.log(`[SERVER] Configuration loaded from ${process.env.CONFIG ? 'environment variable' : (process.env.CONFIG_FILE || './config.json')}`);
  console.log(`[SERVER] Configured clients: ${configuration.clients?.length || 0}`);
  directory.count()
    .then(count => console.log(`[SERVER] Number of users: ${count}`))
    .catch(err => console.error('[SERVER] Failed to count users:', err instanceof Error ? err.message : err));
  console.log(`[SERVER] Proxy mode is ${provider.proxy ? 'enabled' : 'disabled'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});