import { ClientMetadata, Configuration } from 'oidc-provider';
import crypto from 'node:crypto';
import path from "node:path";
import fs from "node:fs";
import { applyPreset, detectEnvironmentPreset } from './presets';

// Log configuration loading
console.log('[CONFIG] Loading OIDC configuration...');
console.log('[CONFIG] Environment preset detection:', detectEnvironmentPreset());

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
// Creates a new object instead of mutating the target
function mergeDeep(target: any, ...sources: any[]): any {
  if (!sources.length) return target;
  const src = sources.shift();
  if (src === undefined) return mergeDeep(target, ...sources);

  // Create a new result object to avoid mutating the target
  let result: any;

  if (isObject(target) && isObject(src)) {
    result = { ...target };
    for (const key of Object.keys(src)) {
      // Guard against prototype pollution
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      const srcVal = src[key];
      const tgtVal = result[key];
      if (Array.isArray(srcVal)) {
        // replace arrays entirely
        result[key] = srcVal;
      } else if (isObject(srcVal)) {
        if (!isObject(tgtVal)) {
          result[key] = mergeDeep({}, srcVal);
        } else {
          result[key] = mergeDeep(tgtVal, srcVal);
        }
      } else {
        result[key] = srcVal;
      }
    }
  } else {
    result = src;
  }
  return mergeDeep(result, ...sources);
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

// Helper: validate basic configuration structure
function validateConfig(config: any): void {
  if (!config || typeof config !== 'object') {
    console.warn('[CONFIG] Invalid configuration: not an object');
    return;
  }

  // Validate clients array if present
  if (config.clients !== undefined) {
    if (!Array.isArray(config.clients)) {
      console.warn('[CONFIG] Invalid configuration: clients must be an array');
    } else {
      config.clients.forEach((client: any, index: number) => {
        if (!client.client_id) {
          console.warn(`[CONFIG] Invalid client at index ${index}: missing client_id`);
        }
      });
    }
  }

  // Validate scopes array if present
  if (config.scopes !== undefined && !Array.isArray(config.scopes)) {
    console.warn('[CONFIG] Invalid configuration: scopes must be an array');
  }

  // Validate cookies object if present
  if (config.cookies !== undefined) {
    if (typeof config.cookies !== 'object') {
      console.warn('[CONFIG] Invalid configuration: cookies must be an object');
    } else if (config.cookies.keys !== undefined && !Array.isArray(config.cookies.keys)) {
      console.warn('[CONFIG] Invalid configuration: cookies.keys must be an array');
    }
  }

  // Validate claims object if present
  if (config.claims !== undefined && typeof config.claims !== 'object') {
    console.warn('[CONFIG] Invalid configuration: claims must be an object');
  }

  // Validate features object if present
  if (config.features !== undefined && typeof config.features !== 'object') {
    console.warn('[CONFIG] Invalid configuration: features must be an object');
  }
}

// Load configuration from config file (if present)
let fileConfig: Partial<Configuration> = {};
if (fs.existsSync(configFilePath)) {
  try {
    const raw = fs.readFileSync(configFilePath, 'utf-8');
    fileConfig = JSON.parse(raw);
    validateConfig(fileConfig);
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
  validateConfig(envConfigFull);
}

// Apply precedence: defaults -> file -> process.env.CONFIG -> explicit env vars
// Start with defaults (using JSON clone for compatibility)
let configuration: Configuration = JSON.parse(JSON.stringify(defaultConfig)) as Configuration;

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
      post_logout_redirect_uris: process.env.POST_LOGOUT_REDIRECT_URIS ? process.env.POST_LOGOUT_REDIRECT_URIS.split(',').map(u => u.trim()) : undefined,
      grant_types: (process.env.GRANT_TYPES ? process.env.GRANT_TYPES.split(',').map(g => g.trim()) : ['authorization_code', 'refresh_token']) as any,
      response_types: (process.env.RESPONSE_TYPES ? process.env.RESPONSE_TYPES.split(',').map(r => r.trim()) : ['code']) as any,
      token_endpoint_auth_method: (process.env.TOKEN_ENDPOINT_AUTH_METHOD || 'client_secret_basic') as any,
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
  const scopesArray = process.env.SCOPES.split(',').map(s => s.trim()).filter(s => s);
  if (scopesArray.length > 0) {
    envOverrides.scopes = scopesArray;
    console.log('[CONFIG] Override scopes from SCOPES env var');
  }
}

// FEATURES_DEV_INTERACTIONS override
if (process.env.FEATURES_DEV_INTERACTIONS !== undefined) {
  if (!envOverrides.features) envOverrides.features = {};
  if (!envOverrides.features.devInteractions) envOverrides.features.devInteractions = {};
  envOverrides.features.devInteractions.enabled = process.env.FEATURES_DEV_INTERACTIONS === 'true';
  console.log('[CONFIG] Override features.devInteractions.enabled from FEATURES_DEV_INTERACTIONS env var');
}

// JWKS override
const jwksEnv = safeJSONParse<any>(process.env.JWKS);
if (jwksEnv) {
  envOverrides.jwks = jwksEnv;
  console.log('[CONFIG] Override jwks from JWKS env var');
}

// Apply env overrides
if (Object.keys(envOverrides).length > 0) {
  configuration = mergeDeep(configuration, envOverrides);
  console.log('[CONFIG] Applied explicit environment variable overrides');
}

// If jwks.keys is provided but empty, remove jwks so oidc-provider can auto-generate keys
if (configuration.jwks && Array.isArray(configuration.jwks.keys) && configuration.jwks.keys.length === 0) {
  console.warn('[CONFIG] jwks.keys is empty; removing jwks to allow automatic key generation');
  delete (configuration as any).jwks;
}

console.log('[CONFIG] Final merged configuration:', configuration);

// Apply preset if enabled (but only if OIDC_PRESET is explicitly set or in development mode)
const presetName = process.env.OIDC_PRESET;
const applyAutoPreset = process.env.OIDC_AUTO_PRESET !== 'false'; // Default to true

if (presetName) {
  console.log(`[CONFIG] Applying explicit preset: ${presetName}`);
  configuration = applyPreset(configuration, presetName) as Configuration;
} else if (applyAutoPreset) {
  const detectedPreset = detectEnvironmentPreset();
  // Only auto-apply for local and testing presets to avoid unexpected production changes
  if (detectedPreset === 'local' || detectedPreset === 'testing') {
    console.log(`[CONFIG] Auto-applying detected preset: ${detectedPreset}`);
    console.log('[CONFIG] To disable auto-presets, set OIDC_AUTO_PRESET=false');
    configuration = applyPreset(configuration, detectedPreset) as Configuration;
  } else {
    console.log(`[CONFIG] Detected preset "${detectedPreset}" but not auto-applying (set OIDC_PRESET to apply explicitly)`);
  }
}

// Ensure cookie signing keys are present; generate a dev-safe key if missing/empty
try {
  const hasCookies = configuration.cookies && typeof configuration.cookies === 'object';
  const keys = hasCookies ? (configuration.cookies as any).keys : undefined;
  const keysMissing = !Array.isArray(keys) || keys.length === 0 || keys.some(k => typeof k !== 'string' || k.length === 0);
  if (keysMissing && process.env.NODE_ENV !== 'production') {
    const fallbackKey = process.env.COOKIES_DEFAULT_KEY || crypto.randomBytes(32).toString('hex');
    configuration.cookies = { ...(configuration.cookies || {}), keys: [fallbackKey] } as any;
    console.warn('[CONFIG] cookies.keys was missing/empty; generated a temporary signing key for development.');
  }
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[CONFIG] Failed to ensure cookies.keys; using in-memory default may affect sessions.', e);
  }
  else {
    throw new Error(`Critical error with cookies.keys in production: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export { configuration };