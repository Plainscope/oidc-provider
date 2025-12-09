/**
 * OIDC Provider - OAuth 2.0 Authorization Server with OpenID Connect support
 * Main server entry point. Sets up Express, OIDC Provider, and all routes.
 */
import express, { Express } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { Provider } from 'oidc-provider';
import { configuration } from './configuration';
import useDirectory, { IDirectory } from './directories/directory';
import useInteractions from './routes/interations';
import useSqliteAdapter from './sqlite-adapter';

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