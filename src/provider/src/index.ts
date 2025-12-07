/**
 * OIDC Provider - OAuth 2.0 Authorization Server with OpenID Connect support
 * Main server entry point. Sets up Express, OIDC Provider, and all routes.
 */
import express, { Express } from 'express';
import { Provider } from 'oidc-provider';
import { configuration } from './configuration';
import { Profile } from './profile';
import useInteractions from './routes/interations';

// Log environment variables for debugging
console.log('[INIT] Starting OIDC Provider with environment:', {
  PORT: process.env.PORT,
  ISSUER: process.env.ISSUER,
  CONFIG: process.env.CONFIG,
  CONFIG_FILE: process.env.CONFIG_FILE,
  CLIENTS: process.env.CLIENTS,
});

const PORT = process.env.PORT || 8080;
const ISSUER = process.env.ISSUER || `http://localhost:${PORT}`;

// Initialize OIDC Provider with configuration and custom account finder
const provider = new Provider(ISSUER, {
  ...configuration,
  findAccount: Profile.find,
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

/**
 * Main entry point for OIDC Provider server.
 * Sets up Express, view engine, static files, and OIDC routes.
 */
const app: Express = express();
app.set('views', './views');
app.set('view engine', 'pug');
console.log('[INIT] Express app configured with Pug view engine and views directory ./views');

// Serve static files (CSS, images, etc.)
app.use(express.static('./public'));
console.log('[INIT] Serving static files from ./public');
// Parse URL-encoded bodies (for form submissions)
app.use(express.urlencoded({ extended: false }));
console.log('[INIT] URL-encoded body parser enabled');

// Register OIDC interaction routes
useInteractions(app, provider);
console.log('[INIT] OIDC interaction routes registered');

// OIDC Provider callback for protocol endpoints
app.use(provider.callback());
console.log('[INIT] OIDC protocol endpoints registered');

// Start the server and log configuration
const server = app.listen(PORT, () => {
  console.log(`[SERVER] OIDC Provider is listening on port ${PORT}, issuer: ${ISSUER}`);
  console.log(`[SERVER] Configuration loaded from ${process.env.CONFIG ? 'environment variable' : (process.env.CONFIG_FILE || './config.json')}`);
  console.log(`[SERVER] Configured clients: ${configuration.clients?.length || 0}`);
  console.log(`[SERVER] Number of users: ${require('./users').Users.length}`);
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