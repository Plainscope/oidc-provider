/**
 * Loads and merges OIDC Provider configuration from environment, file, or defaults.
 * Handles client registration, claims, cookies, and feature flags.
 */
import { ClientMetadata, Configuration } from 'oidc-provider';
import path from "node:path";
import fs from "node:fs";

// Log configuration loading
console.log('[CONFIG] Loading OIDC configuration...');

// File path to the config.json file
const configFilePath = process.env.CONFIG_FILE || path.join(__dirname, 'config.json');
console.log(`[CONFIG] Using config file path: ${configFilePath}`);

// Load client metadata from environment or defaults
const CLIENTS: ClientMetadata[] = process.env.CLIENTS ? JSON.parse(process.env.CLIENTS) : [
  {
    client_id: process.env.CLIENT_ID || '325c2ce7-7390-411b-af3a-2bdf5a260f9d',
    client_secret: process.env.CLIENT_SECRET || 'a74566f905056b6806d69afc09f2803d1aa477e1d708540683994d6e4745334a',
    redirect_uris: process.env.REDIRECT_URIS ? JSON.parse(process.env.REDIRECT_URIS) : [],
    post_logout_redirect_uris: process.env.POST_LOGOUT_REDIRECT_URIS ? JSON.parse(process.env.POST_LOGOUT_REDIRECT_URIS) : [],
    response_types: process.env.RESPONSE_TYPES ? JSON.parse(process.env.RESPONSE_TYPES) : ['code'],
    grant_types: process.env.GRANT_TYPES ? JSON.parse(process.env.GRANT_TYPES) : ['authorization_code', 'refresh_token'],
    token_endpoint_auth_method: process.env.TOKEN_ENDPOINT_AUTH_METHOD || 'client_secret_basic',
    introspection_endpoint_auth_method: process.env.INTROSPECTION_ENDPOINT_AUTH_METHOD || 'client_secret_basic',
    application_type: process.env.APPLICATION_TYPE || 'web',
  }
];
console.log(`[CONFIG] Registered clients:`, CLIENTS.map(c => c.client_id));

// Load main configuration from environment, file, or defaults
let configuration: Configuration = process.env.CONFIG ?
  JSON.parse(process.env.CONFIG) :
  fs.existsSync(configFilePath) ?
    JSON.parse(fs.readFileSync(configFilePath, "utf-8")) :
    {} as Configuration;
console.log('[CONFIG] Base configuration loaded:', configuration);

// Set default configuration values if not provided
configuration = {
  ...configuration,
  clients: CLIENTS,
  cookies: process.env.COOKIES ? JSON.parse(process.env.COOKIES) : {
    keys: process.env.COOKIES_KEYS ? JSON.parse(process.env.COOKIES_KEYS) : [
      '40763539018b2f012d30aa7eba0123db3dc847b0eca146e5d7160838f8b2d092'
    ]
  },
  claims: process.env.CLAIMS ? JSON.parse(process.env.CLAIMS) : {
    openid: ['sub', 'sid'],
    email: ['email', 'email_verified'],
    profile: ['name', 'nickname', 'given_name', 'family_name', 'groups', 'picture']
  },
  scopes: process.env.SCOPES ? process.env.SCOPES.split(',') : [
    'openid', 'profile', 'email', 'offline_access'
  ],
  features: {
    devInteractions: {
      enabled: process.env.FEATURES_DEV_INTERACTIONS === 'true',
    },
  }
};
console.log('[CONFIG] Final merged configuration:', configuration);

export { configuration };