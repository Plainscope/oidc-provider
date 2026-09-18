import { ClientMetadata, Configuration } from 'oidc-provider';
import path from 'node:path';
import fs from 'node:fs';
import { applyPreset, detectEnvironmentPreset } from './presets';
import { generateDevelopmentSecret } from './security-defaults';

console.log('[CONFIG] Loading OIDC configuration...');
console.log('[CONFIG] Environment preset detection:', detectEnvironmentPreset());

const configFilePath = process.env.CONFIG_FILE || path.join(__dirname, 'config.json');
console.log(`[CONFIG] Using config file path: ${configFilePath}`);

function safeJSONParse<T>(input?: string): T | undefined {
  if (!input) return undefined;
  try { return JSON.parse(input) as T; }
  catch (err) { console.warn('[CONFIG] Failed to parse JSON from environment variable:', err); return undefined; }
}

function mergeDeep(target: any, ...sources: any[]): any {
  if (!sources.length) return target;
  const src = sources.shift();
  if (src === undefined) return mergeDeep(target, ...sources);
  let result: any;
  if (isObject(target) && isObject(src)) {
    result = { ...target };
    for (const key of Object.keys(src)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      const srcVal = src[key];
      const tgtVal = result[key];
      if (Array.isArray(srcVal)) result[key] = srcVal;
      else if (isObject(srcVal)) result[key] = isObject(tgtVal) ? mergeDeep(tgtVal, srcVal) : mergeDeep({}, srcVal);
      else result[key] = srcVal;
    }
  } else result = src;
  return mergeDeep(result, ...sources);
}
function isObject(item: any) { return item && typeof item === 'object' && !Array.isArray(item); }

const development = process.env.NODE_ENV !== 'production';
const defaultClientSecret = development ? generateDevelopmentSecret() : undefined;
const defaultCookieKey = development ? generateDevelopmentSecret() : undefined;

const defaultConfig: Partial<Configuration> = {
  clients: [{
    client_name: 'Demo',
    client_id: '325c2ce7-7390-411b-af3a-2bdf5a260f9d',
    ...(defaultClientSecret ? { client_secret: defaultClientSecret } : {}),
    redirect_uris: [],
    post_logout_redirect_uris: [],
    response_types: ['code'],
    grant_types: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_method: 'client_secret_basic',
    introspection_endpoint_auth_method: 'client_secret_basic',
    application_type: 'web',
  } as ClientMetadata],
  ...(defaultCookieKey ? { cookies: { keys: [defaultCookieKey] } } : {}),
  claims: {
    openid: ['sub', 'sid'],
    email: ['email', 'email_verified'],
    profile: ['name', 'nickname', 'given_name', 'family_name', 'groups', 'picture'],
  },
  scopes: ['openid', 'profile', 'email', 'offline_access'],
  features: { devInteractions: { enabled: false } },
};

function validateConfig(config: any): void {
  if (!config || typeof config !== 'object') { console.warn('[CONFIG] Invalid configuration: not an object'); return; }
  if (config.clients !== undefined) {
    if (!Array.isArray(config.clients)) console.warn('[CONFIG] Invalid configuration: clients must be an array');
    else for (const [i, client] of config.clients.entries()) {
      if (!client || typeof client !== 'object') console.warn(`[CONFIG] Invalid client at index ${i}: not an object`);
      else if (!client.client_id) console.warn(`[CONFIG] Invalid client at index ${i}: missing client_id`);
    }
  }
}

let fileConfig: Partial<Configuration> = {};
if (fs.existsSync(configFilePath)) {
  try {
    const raw = fs.readFileSync(configFilePath, 'utf8');
    fileConfig = JSON.parse(raw);
    validateConfig(fileConfig);
    console.log('[CONFIG] Loaded configuration from file');
  } catch (err) {
    console.warn('[CONFIG] Failed to read/parse config file:', err);
  }
}

const envConfigFull = safeJSONParse<Partial<Configuration>>(process.env.CONFIG);
if (envConfigFull) validateConfig(envConfigFull);

let configuration: Configuration = mergeDeep({}, defaultConfig, fileConfig) as Configuration;
if (envConfigFull) configuration = mergeDeep(configuration, envConfigFull);

const envOverrides: Partial<Configuration> = {};
const clientsEnv = safeJSONParse<ClientMetadata[]>(process.env.CLIENTS);
if (clientsEnv) envOverrides.clients = clientsEnv;
else if (process.env.CLIENT_ID) {
  envOverrides.clients = [{
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    client_name: process.env.CLIENT_NAME,
    redirect_uris: process.env.REDIRECT_URIS ? process.env.REDIRECT_URIS.split(',').map(u => u.trim()) : undefined,
    post_logout_redirect_uris: process.env.POST_LOGOUT_REDIRECT_URIS ? process.env.POST_LOGOUT_REDIRECT_URIS.split(',').map(u => u.trim()) : undefined,
    grant_types: (process.env.GRANT_TYPES ? process.env.GRANT_TYPES.split(',').map(g => g.trim()) : ['authorization_code', 'refresh_token']) as any,
    response_types: (process.env.RESPONSE_TYPES ? process.env.RESPONSE_TYPES.split(',').map(r => r.trim()) : ['code']) as any,
    token_endpoint_auth_method: (process.env.TOKEN_ENDPOINT_AUTH_METHOD || 'client_secret_basic') as any,
  }];
}
const cookiesEnv = safeJSONParse<any>(process.env.COOKIES);
if (cookiesEnv) envOverrides.cookies = cookiesEnv;
else if (process.env.COOKIES_KEYS) {
  try { envOverrides.cookies = { keys: JSON.parse(process.env.COOKIES_KEYS) }; }
  catch { envOverrides.cookies = { keys: process.env.COOKIES_KEYS.split(',').map(k => k.trim()) }; }
}
const claimsEnv = safeJSONParse<any>(process.env.CLAIMS);
if (claimsEnv) envOverrides.claims = claimsEnv;
if (process.env.SCOPES) {
  const scopes = process.env.SCOPES.split(',').map(s => s.trim()).filter(Boolean);
  if (scopes.length) (envOverrides as any).scopes = scopes;
}
if (process.env.FEATURES_DEV_INTERACTIONS !== undefined) {
  envOverrides.features = { ...(configuration as any).features, devInteractions: { enabled: process.env.FEATURES_DEV_INTERACTIONS === 'true' } } as any;
}
const jwksEnv = safeJSONParse<any>(process.env.JWKS);
if (jwksEnv) envOverrides.jwks = jwksEnv;
if (Object.keys(envOverrides).length > 0) configuration = mergeDeep(configuration, envOverrides);

if (configuration.jwks && Array.isArray(configuration.jwks.keys) && configuration.jwks.keys.length === 0) delete (configuration as any).jwks;

const presetName = process.env.OIDC_PRESET;
const applyAutoPreset = process.env.OIDC_AUTO_PRESET !== 'false';
if (presetName) configuration = applyPreset(configuration, presetName) as Configuration;
else if (applyAutoPreset) {
  const detectedPreset = detectEnvironmentPreset();
  if (detectedPreset) configuration = applyPreset(configuration, detectedPreset) as Configuration;
}

// A missing cookie key is safe to recover from only during non-production local development.
if (process.env.NODE_ENV !== 'production') {
  const keys = (configuration.cookies as any)?.keys;
  if (!Array.isArray(keys) || keys.length === 0 || keys.some((k: any) => typeof k !== 'string' || k.length === 0)) {
    configuration.cookies = { ...(configuration.cookies || {}), keys: [generateDevelopmentSecret()] } as any;
  }
}

if (process.env.NODE_ENV === 'production') {
  // Presets must never synthesize credential material in production; credentials
  // must come from explicit env/config (CLIENT_SECRET, COOKIES_KEYS, CLIENTS, etc.).
  const clients = (configuration.clients as any[]) || [];
  if (clients.length === 0) {
    throw new Error('At least one OAuth client must be explicitly configured in production (e.g. CLIENTS or CLIENT_ID/CLIENT_SECRET).');
  }
  if (clients.some(client => typeof client?.client_secret !== 'string' || client.client_secret.length < 32)) {
    throw new Error('Every production OAuth client must have an explicit client_secret of at least 32 characters (set CLIENT_SECRET or CLIENTS; presets will not generate one).');
  }
  const keys = (configuration.cookies as any)?.keys;
  if (!Array.isArray(keys) || keys.length === 0 || keys.some((key: any) => typeof key !== 'string' || key.length < 64)) {
    throw new Error('Production cookie signing keys must be explicitly configured and at least 64 characters long (set COOKIES_KEYS; presets will not generate them).');
  }
}

console.log('[CONFIG] Final merged configuration:', {
  clients: (configuration.clients || []).map((c: any) => ({ client_id: c.client_id, client_name: c.client_name, redirect_uris: c.redirect_uris, grant_types: c.grant_types, response_types: c.response_types })),
  scopes: (configuration as any).scopes,
  claims: Object.keys((configuration as any).claims || {}),
  features: (configuration as any).features,
  cookiesConfigured: Boolean((configuration as any).cookies?.keys?.length),
  jwksConfigured: Boolean((configuration as any).jwks?.keys?.length),
});

export { configuration };
