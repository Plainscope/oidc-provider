/**
 * Loads and merges OIDC Provider configuration from environment, file, or defaults.
 * Handles client registration, claims, cookies, and feature flags.
 * 
 * Configuration precedence (highest to lowest):
 * 1. Explicit environment variables (CLIENTS, COOKIES_KEYS, SCOPES, etc.)
 * 2. process.env.CONFIG (full configuration as JSON)
 * 3. Config file (config.json)
 * 4. Default values
 */
import { ClientMetadata, Configuration } from 'oidc-provider';
import path from "node:path";
import fs from "node:fs";

// Log configuration loading
console.log('[CONFIG] Loading OIDC configuration...');

// File path to the config.json file (can be overridden)
const configFilePath = process.env.CONFIG_FILE || path.join(__dirname, 'config.json');
console.log(`[CONFIG] Using config file path: ${configFilePath}`);

// Helper: safe JSON parse
function safeJSONParse<T>(input?: string): T | undefined {
  if (!input) return undefined;
  try {
    return JSON.parse(input) as T;
  } catch (err) {
    console.warn('[CONFIG] Failed to parse JSON from environment variable:', err);
    return undefined;
  }
}

// Deep merge helper where arrays are replaced (not concatenated)
function mergeDeep(target: any, ...sources: any[]): any {
  if (!sources.length) return target;
  const src = sources.shift();
  if (src === undefined) return mergeDeep(target, ...sources);

  if (isObject(target) && isObject(src)) {
    for (const key of Object.keys(src)) {
      const srcVal = src[key];
      const tgtVal = target[key];
      if (Array.isArray(srcVal)) {
        // replace arrays entirely
        target[key] = srcVal;
      } else if (isObject(srcVal)) {
        if (!isObject(tgtVal)) target[key] = {};
        mergeDeep(target[key], srcVal);
      } else {
        target[key] = srcVal;
      }
    }
  } else {
    target = src;
  }
  return mergeDeep(target, ...sources);
}
function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

// Default values
const defaultConfig: Partial<Configuration> = {
  clients: [
    {
      client_name: 'Demo',
      client_id: '325c2ce7-7390-411b-af3a-2bdf5a260f9d',
      client_secret: 'a74566f905056b6806d69afc09f2803d1aa477e1d708540683994d6e4745334a', // replace in production
      redirect_uris: [],
      post_logout_redirect_uris: [],
      response_types: ['code'],
      grant_types: ['authorization_code', 'refresh_token'],
      token_endpoint_auth_method: 'client_secret_basic',
      introspection_endpoint_auth_method: 'client_secret_basic',
      application_type: 'web',
    } as ClientMetadata,
  ],
  cookies: {
    keys: [
      '40763539018b2f012d30aa7eba0123db3dc847b0eca146e5d7160838f8b2d092',
    ],
  },
  claims: {
    openid: ['sub', 'sid'],
    email: ['email', 'email_verified'],
    profile: ['name', 'nickname', 'given_name', 'family_name', 'groups', 'picture'],
  },
  scopes: ['openid', 'profile', 'email', 'offline_access'],
  features: {
    devInteractions: {
      enabled: false, // default to disabled for production-safe default
    },
  },
};

// Load configuration from config file (if present)
let fileConfig: Partial<Configuration> = {};
if (fs.existsSync(configFilePath)) {
  try {
    const raw = fs.readFileSync(configFilePath, 'utf-8');
    fileConfig = JSON.parse(raw);
    console.log('[CONFIG] Loaded configuration file:', configFilePath);
  } catch (err) {
    console.warn('[CONFIG] Failed to read/parse config file, ignoring fileConfig:', err);
    fileConfig = {};
  }
} else {
  console.log('[CONFIG] No configuration file found at path:', configFilePath);
}

// If process.env.CONFIG is set treat it as a config object that is applied after the file config
const envConfigFull = safeJSONParse<Partial<Configuration>>(process.env.CONFIG);
if (envConfigFull) {
  console.log('[CONFIG] Loaded full configuration from process.env.CONFIG');
}

// Merge in order: defaults -> fileConfig -> envConfigFull
let configuration: Configuration = mergeDeep({}, defaultConfig, fileConfig, envConfigFull || {}) as Configuration;

// Apply explicit environment variable overrides (highest priority)
// These always override config file or process.env.CONFIG
const envOverrides: Partial<Configuration> = {};

// CLIENTS override
if (process.env.CLIENTS) {
  const clients = safeJSONParse<ClientMetadata[]>(process.env.CLIENTS);
  if (clients) {
    envOverrides.clients = clients;
    console.log('[CONFIG] Overriding clients from CLIENTS env var');
  }
}

// COOKIES_KEYS override
if (process.env.COOKIES_KEYS) {
  const keys = safeJSONParse<string[]>(process.env.COOKIES_KEYS);
  if (keys) {
    if (!envOverrides.cookies) envOverrides.cookies = {};
    envOverrides.cookies.keys = keys;
    console.log('[CONFIG] Overriding cookies.keys from COOKIES_KEYS env var');
  }
}

// COOKIES override (full cookies object)
if (process.env.COOKIES) {
  const cookies = safeJSONParse<any>(process.env.COOKIES);
  if (cookies) {
    envOverrides.cookies = cookies;
    console.log('[CONFIG] Overriding cookies from COOKIES env var');
  }
}

// CLAIMS override
if (process.env.CLAIMS) {
  const claims = safeJSONParse<any>(process.env.CLAIMS);
  if (claims) {
    envOverrides.claims = claims;
    console.log('[CONFIG] Overriding claims from CLAIMS env var');
  }
}

// SCOPES override
if (process.env.SCOPES) {
  envOverrides.scopes = process.env.SCOPES.split(',').map(s => s.trim());
  console.log('[CONFIG] Overriding scopes from SCOPES env var');
}

// FEATURES_DEV_INTERACTIONS override
if (process.env.FEATURES_DEV_INTERACTIONS !== undefined) {
  if (!envOverrides.features) envOverrides.features = {};
  if (!envOverrides.features.devInteractions) envOverrides.features.devInteractions = {};
  envOverrides.features.devInteractions.enabled = process.env.FEATURES_DEV_INTERACTIONS === 'true';
  console.log('[CONFIG] Overriding features.devInteractions.enabled from FEATURES_DEV_INTERACTIONS env var');
}

// Apply environment overrides (highest priority)
configuration = mergeDeep(configuration, envOverrides) as Configuration;

console.log('[CONFIG] Final merged configuration:', JSON.stringify(configuration, null, 2));
console.log(`[CONFIG] Registered clients:`, configuration.clients?.map(c => c.client_id) || []);

export { configuration };