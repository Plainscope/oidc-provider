# Configuration Guide

This OIDC Provider supports flexible configuration through multiple sources with a well-defined precedence order.

## Configuration Precedence

Configuration is loaded and merged in the following order (highest priority last):

1. **Default values** - Built-in defaults in `configuration.ts`
2. **Config file** - `config.json` (or path specified in `CONFIG_FILE` env var)
3. **Full configuration** - `process.env.CONFIG` (JSON string containing full config)
4. **Explicit environment variables** - Individual env vars (highest priority)

### Key Points

- **Environment variables always win** - Individual env vars like `CLIENTS`, `COOKIES_KEYS`, `SCOPES`, etc. override all other sources
- **Arrays are replaced, not merged** - When an array is provided at a higher priority level, it completely replaces the lower priority array (not concatenated)
- **Deep merge for objects** - Nested objects are merged recursively, allowing partial overrides
- **Prototype pollution protection** - Dangerous keys (`__proto__`, `constructor`, `prototype`) are automatically filtered out

## Environment Variables

### Full Configuration

- `CONFIG` - JSON string containing the entire configuration object
- `CONFIG_FILE` - Path to the config.json file (default: `./config.json`)

### Individual Overrides (Highest Priority)

- `CLIENTS` - JSON array of client configurations
- `COOKIES` - JSON object with full cookies configuration
- `COOKIES_KEYS` - JSON array of cookie signing keys (overrides `COOKIES.keys` if both are set)
- `CLAIMS` - JSON object mapping scope names to claim arrays
- `SCOPES` - Comma-separated list of supported scopes
- `FEATURES_DEV_INTERACTIONS` - Boolean (`'true'` or `'false'`) to enable/disable dev interactions

## Security Best Practices

### Production Deployment

**NEVER** commit secrets to the config.json file. Instead:

1. Use environment variables for all secrets:
   ```bash
   COOKIES_KEYS='["your-secret-key-here-at-least-64-chars-long"]'
   CLIENTS='[{"client_id":"...","client_secret":"...","redirect_uris":[...]}]'
   ```

2. The provided `config.json` contains:
   - Empty clients array (populate via `CLIENTS` env var)
   - Placeholder cookie keys (replace via `COOKIES_KEYS` env var)
   - Non-sensitive defaults only

3. Generate strong secrets:
   ```bash
   # Generate a 64-character hex string for cookie keys
   openssl rand -hex 32
   ```

### Configuration Examples

#### Example 1: Using config file with env var overrides

config.json:
```json
{
  "scopes": ["openid", "profile", "email"],
  "features": {
    "devInteractions": {
      "enabled": false
    }
  }
}
```

Environment variables:
```bash
COOKIES_KEYS='["abc123...64chars", "def456...64chars"]'
CLIENTS='[{"client_id":"my-app","client_secret":"secret123","redirect_uris":["http://localhost:3000/callback"]}]'
```

#### Example 2: Full configuration via environment

```bash
CONFIG='{
  "clients": [{"client_id":"app1","client_secret":"secret","redirect_uris":["http://localhost:3000/callback"]}],
  "cookies": {"keys": ["key1-64chars", "key2-64chars"]},
  "scopes": ["openid", "profile", "email"],
  "features": {"devInteractions": {"enabled": false}}
}'
```

#### Example 3: Override specific values

With config.json providing base settings:
```bash
# Override just the scopes
SCOPES="openid,profile,email,custom_scope"

# Override just dev interactions
FEATURES_DEV_INTERACTIONS="true"
```

## Default Configuration

The `config.json` file provides production-safe defaults:

- **Empty clients array** - Clients should be added via environment variables
- **Placeholder cookie keys** - Must be replaced in production via `COOKIES_KEYS`
- **Standard claims** - OpenID, email, and profile claims
- **Standard scopes** - openid, profile, email, offline_access
- **Disabled dev interactions** - For production safety
- **Sensible TTL values** - Access tokens (1 hour), Refresh tokens (14 days)

## Troubleshooting

Enable debug logging by checking the console output:
- `[CONFIG]` prefix shows configuration loading steps
- Look for "Loaded configuration file" to confirm file loading
- Look for "Overriding ... from ... env var" to see which env vars are active
- Final configuration is logged as JSON for verification
