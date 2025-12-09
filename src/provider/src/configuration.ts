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
function mergeDeep(target: any, ...sources: any[]) {
  if (!sources.length) return target;
  const src = sources.shift();
  if (src === undefined) return mergeDeep(target, ...sources);

  if (isObject(target) && isObject(src)) {
    for (const key of Object.keys(src)) {
      // Guard against prototype pollution
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
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
function isObject(item: any) {
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

// Apply precedence: defaults -> file -> process.env.CONFIG -> explicit env vars
// Start with defaults
let configuration: Configuration = structuredClone(defaultConfig) as Configuration;

// Merge file config
if (Object.keys(fileConfig).length > 0) {
  configuration = mergeDeep(configuration, fileConfig);
  console.log('[CONFIG] Merged file config');
}

// Merge process.env.CONFIG
if (envConfigFull) {
  configuration = mergeDeep(configuration, envConfigFull);
  console.log('[CONFIG] Merged process.env.CONFIG');
}

// Apply explicit environment variable overrides (highest priority)
const envOverrides: Partial<Configuration> = {};

// CLIENTS override
const clientsEnv = safeJSONParse<ClientMetadata[]>(process.env.CLIENTS);
if (clientsEnv) {
  envOverrides.clients = clientsEnv;
  console.log('[CONFIG] Override clients from CLIENTS env var');
} else {
  // Support individual client environment variables for backward compatibility
  if (process.env.CLIENT_ID) {
    const client: ClientMetadata = {
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      client_name: process.env.CLIENT_NAME,
      redirect_uris: process.env.REDIRECT_URIS ? process.env.REDIRECT_URIS.split(',').map(u => u.trim()) : undefined,
      grant_types: process.env.GRANT_TYPES ? process.env.GRANT_TYPES.split(',').map(g => g.trim()) : undefined,
      response_types: process.env.RESPONSE_TYPES ? process.env.RESPONSE_TYPES.split(',').map(r => r.trim()) : undefined,
      token_endpoint_auth_method: process.env.TOKEN_ENDPOINT_AUTH_METHOD,
    };
    envOverrides.clients = [client];
    console.log('[CONFIG] Override clients from individual client env vars');
  }
}

// COOKIES override
const cookiesEnv = safeJSONParse<any>(process.env.COOKIES);
if (cookiesEnv) {
  envOverrides.cookies = cookiesEnv;
  console.log('[CONFIG] Override cookies from COOKIES env var');
} else {
  // COOKIES_KEYS override
  const cookiesKeysEnv = safeJSONParse<string[]>(process.env.COOKIES_KEYS);
  if (cookiesKeysEnv) {
    if (!envOverrides.cookies) envOverrides.cookies = {};
    envOverrides.cookies.keys = cookiesKeysEnv;
    console.log('[CONFIG] Override cookies.keys from COOKIES_KEYS env var');
  }
}

// CLAIMS override
const claimsEnv = safeJSONParse<any>(process.env.CLAIMS);
if (claimsEnv) {
  envOverrides.claims = claimsEnv;
  console.log('[CONFIG] Override claims from CLAIMS env var');
}

// SCOPES override
if (process.env.SCOPES) {
  envOverrides.scopes = process.env.SCOPES.split(',').map(s => s.trim());
  console.log('[CONFIG] Override scopes from SCOPES env var');
}

// FEATURES_DEV_INTERACTIONS override
if (process.env.FEATURES_DEV_INTERACTIONS !== undefined) {
  if (!envOverrides.features) envOverrides.features = {};
  if (!envOverrides.features.devInteractions) envOverrides.features.devInteractions = {};
  envOverrides.features.devInteractions.enabled = process.env.FEATURES_DEV_INTERACTIONS === 'true';
  console.log('[CONFIG] Override features.devInteractions.enabled from FEATURES_DEV_INTERACTIONS env var');
}

// Apply env overrides
if (Object.keys(envOverrides).length > 0) {
  configuration = mergeDeep(configuration, envOverrides);
  console.log('[CONFIG] Applied explicit environment variable overrides');
}

console.log('[CONFIG] Final merged configuration:', configuration);

export { configuration };