# Advanced Configuration

Advanced configuration options and customization for the OIDC provider.

## Configuration File (config.json)

The provider can be configured via a JSON configuration file for complex setups.

### Complete Configuration Example

```json
{
  "clients": [
    {
      "client_id": "my-app",
      "client_secret": "secret",
      "redirect_uris": ["https://app.example.com/callback"],
      "post_logout_redirect_uris": ["https://app.example.com/logout"],
      "response_types": ["code"],
      "grant_types": ["authorization_code", "refresh_token"],
      "token_endpoint_auth_method": "client_secret_basic"
    }
  ],
  "scopes": [
    "openid",
    "profile",
    "email",
    "phone",
    "address",
    "offline_access"
  ],
  "claims": {
    "openid": ["sub", "sid"],
    "profile": ["name", "given_name", "family_name", "picture", "gender", "birthdate", "zoneinfo", "locale"],
    "email": ["email", "email_verified"],
    "phone": ["phone_number", "phone_number_verified"],
    "address": ["address"]
  },
  "cookies": {
    "keys": ["key1", "key2"],
    "secure": true,
    "httpOnly": true,
    "sameSite": "lax",
    "maxAge": 3600000
  },
  "features": {
    "devInteractions": {
      "enabled": false
    }
  }
}
```

## Token Lifetimes

### Access Token

```bash
# 15 minutes (in milliseconds)
export ACCESS_TOKEN_LIFETIME=900000
```

### Refresh Token

```bash
# 7 days
export REFRESH_TOKEN_LIFETIME=604800000
```

### Authorization Code

```bash
# 10 minutes
export AUTHORIZATION_CODE_LIFETIME=600000
```

### ID Token

```bash
# 1 hour
export ID_TOKEN_LIFETIME=3600000
```

## Token Signing and Encryption

### Signing Algorithm

Configure token signing (default: RS256):

```bash
export TOKEN_SIGNING_ALG=RS256
```

Supported algorithms:

- RS256, RS384, RS512 (RSA)
- ES256, ES384, ES512 (ECDSA)
- PS256, PS384, PS512 (RSA-PSS)

### Token Encryption

Enable token encryption:

```bash
export TOKEN_ENCRYPTION_ALG=dir
export TOKEN_ENCRYPTION_ENC=A128CBC-HS256
```

## Advanced Scopes

### Custom Scopes

Define custom scopes:

```bash
SCOPES=openid,profile,email,custom_api,custom_admin

CLAIMS='{
  "custom_api": ["api_key", "api_version"],
  "custom_admin": ["admin_level", "department"]
}'
```

### Scope Descriptions

```json
{
  "scopes": {
    "openid": "Access to user identity",
    "profile": "Access to user profile information",
    "email": "Access to user email",
    "custom_api": "Access to custom API endpoints"
  }
}
```

## Session Management

### Session Timeout

```bash
# Session expires after 1 hour of inactivity
export SESSION_TIMEOUT=3600000

# Session expires 24 hours after creation (absolute)
export SESSION_ABSOLUTE_TIMEOUT=86400000
```

### Remember Me

```bash
# Extended session timeout (30 days)
export REMEMBER_ME_TIMEOUT=2592000000
```

## CORS Configuration

### Enable CORS

```bash
export CORS_ENABLED=true
export CORS_ORIGINS=https://app1.example.com,https://app2.example.com
export CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
export CORS_HEADERS=Content-Type,Authorization,X-Requested-With
export CORS_CREDENTIALS=true
export CORS_MAX_AGE=3600
```

## Rate Limiting

### Configure Rate Limiting

```bash
# Login endpoint: 5 requests per minute
export LOGIN_RATE_LIMIT=5
export LOGIN_RATE_LIMIT_WINDOW=60000

# Token endpoint: 20 requests per minute
export TOKEN_RATE_LIMIT=20
export TOKEN_RATE_LIMIT_WINDOW=60000

# General API: 100 requests per minute
export API_RATE_LIMIT=100
export API_RATE_LIMIT_WINDOW=60000
```

### Rate Limit by IP

```bash
# Whitelist IPs from rate limiting
export RATE_LIMIT_WHITELIST=127.0.0.1,192.168.1.0/24
```

## Email Configuration

### SMTP Settings

```bash
export SMTP_HOST=smtp.example.com
export SMTP_PORT=587
export SMTP_USER=username@example.com
export SMTP_PASS=password
export SMTP_FROM=noreply@example.com
export SMTP_SECURE=true
```

### Email Notifications

```bash
# Send email on login
export EMAIL_ON_LOGIN=true

# Send email on password change
export EMAIL_ON_PASSWORD_CHANGE=true

# Send email on failed login attempts
export EMAIL_ON_FAILED_LOGIN=true
```

## Multi-Tenancy

### Tenant Configuration

```bash
export TENANTS='{
  "tenant1": {
    "issuer": "https://oidc-tenant1.example.com",
    "clients": [{"client_id": "app1", "client_secret": "secret1"}]
  },
  "tenant2": {
    "issuer": "https://oidc-tenant2.example.com",
    "clients": [{"client_id": "app2", "client_secret": "secret2"}]
  }
}'
```

### Tenant Routing

```bash
# Route by subdomain
export TENANT_ROUTING=subdomain

# Route by path
export TENANT_ROUTING=path
```

## Database Integration

### PostgreSQL

```bash
export DATABASE_URL=postgresql://user:password@localhost:5432/oidc
export DATABASE_POOL_SIZE=10
export DATABASE_IDLE_TIMEOUT=30000
```

### MongoDB

```bash
export MONGODB_URI=mongodb://localhost:27017/oidc
export MONGODB_USER_COLLECTION=users
export MONGODB_SESSION_COLLECTION=sessions
```

### Custom Database

Implement custom user store by modifying `profile.ts`:

```typescript
// Custom database query
async findAccount(ctx, id) {
  const user = await customDatabase.getUser(id);
  return user;
}
```

## LDAP/Active Directory Integration

### LDAP Configuration

```bash
export LDAP_ENABLED=true
export LDAP_URL=ldap://ldap.example.com:389
export LDAP_BIND_DN=cn=admin,dc=example,dc=com
export LDAP_BIND_PASSWORD=password
export LDAP_USER_SEARCH_BASE=ou=users,dc=example,dc=com
export LDAP_USER_SEARCH_FILTER=(uid={{username}})
export LDAP_EMAIL_ATTRIBUTE=mail
export LDAP_NAME_ATTRIBUTE=cn
```

## Social Login Integration

### Google OAuth

```bash
export GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
export GOOGLE_CLIENT_SECRET=xxx
export GOOGLE_CALLBACK_URL=https://oidc.example.com/auth/google/callback
```

### GitHub OAuth

```bash
export GITHUB_CLIENT_ID=xxx
export GITHUB_CLIENT_SECRET=xxx
export GITHUB_CALLBACK_URL=https://oidc.example.com/auth/github/callback
```

### Microsoft Azure AD

```bash
export AZURE_TENANT_ID=xxx
export AZURE_CLIENT_ID=xxx
export AZURE_CLIENT_SECRET=xxx
export AZURE_CALLBACK_URL=https://oidc.example.com/auth/azure/callback
```

## Two-Factor Authentication (2FA)

### Enable 2FA

```bash
export MFA_ENABLED=true
export MFA_REQUIRED=false  # Make it optional

# TOTP configuration
export TOTP_ISSUER="My Organization"
export TOTP_WINDOW=1

# SMS configuration
export SMS_ENABLED=true
export SMS_PROVIDER=twilio
export TWILIO_ACCOUNT_SID=xxx
export TWILIO_AUTH_TOKEN=xxx
export TWILIO_FROM_PHONE=+1234567890
```

## Account Recovery

### Password Reset

```bash
export PASSWORD_RESET_ENABLED=true
export PASSWORD_RESET_TOKEN_EXPIRY=3600  # 1 hour
export PASSWORD_RESET_EMAIL_SUBJECT="Reset your password"
```

### Account Lockout

```bash
export ACCOUNT_LOCKOUT_ENABLED=true
export MAX_LOGIN_ATTEMPTS=5
export LOCKOUT_DURATION=900  # 15 minutes
export LOCKOUT_INCREMENT=true  # Increase lockout duration
```

## Audit Logging

### Enable Comprehensive Audit Logging

```bash
export AUDIT_LOG_ENABLED=true
export AUDIT_LOG_LEVEL=info
export AUDIT_LOG_FILE=/var/log/oidc-audit.log
export AUDIT_LOG_MAX_SIZE=104857600  # 100MB
export AUDIT_LOG_MAX_FILES=10

# Log types
export AUDIT_LOG_AUTH_EVENTS=true
export AUDIT_LOG_TOKEN_EVENTS=true
export AUDIT_LOG_CONSENT_EVENTS=true
export AUDIT_LOG_ADMIN_EVENTS=true
```

### Log Destinations

```bash
# Console
export LOG_DESTINATION=console

# File
export LOG_DESTINATION=file
export LOG_FILE_PATH=/var/log/oidc-provider.log

# Syslog
export LOG_DESTINATION=syslog
export SYSLOG_HOST=localhost
export SYSLOG_PORT=514

# Cloud logging (CloudWatch, Stackdriver, etc.)
export LOG_DESTINATION=cloudwatch
export AWS_LOG_GROUP=/oidc/provider
```

## Metrics and Monitoring

### Enable Prometheus Metrics

```bash
export METRICS_ENABLED=true
export METRICS_PORT=9090
export METRICS_PATH=/metrics
```

### Tracked Metrics

```
# Authentication
oidc_authentication_total
oidc_authentication_failures_total
oidc_authentication_duration_seconds

# Token
oidc_token_issued_total
oidc_token_refresh_total
oidc_token_revoked_total

# Requests
oidc_http_requests_total
oidc_http_request_duration_seconds
```

## Custom Claims

### Add Custom Claims

Map user attributes to custom claims:

```bash
CLAIMS='{
  "openid": ["sub"],
  "profile": ["name", "email"],
  "custom": ["department", "employee_id", "cost_center"]
}'
```

Return in profile:

```typescript
// profile.ts
return {
  sub: user.id,
  name: user.name,
  email: user.email,
  department: user.department,
  employee_id: user.employeeId,
  cost_center: user.costCenter
}
```

## Token Introspection

### Enable Token Introspection

```bash
export INTROSPECTION_ENABLED=true
export INTROSPECTION_ENDPOINT_AUTH_METHOD=client_secret_basic
```

### Call Introspection Endpoint

```bash
curl -X POST https://oidc.example.com/introspect \
  -u "client_id:client_secret" \
  -d "token=ACCESS_TOKEN"
```

## Token Revocation

### Enable Token Revocation

```bash
export REVOCATION_ENABLED=true
export REVOCATION_ENDPOINT_AUTH_METHOD=client_secret_basic
```

### Revoke Token

```bash
curl -X POST https://oidc.example.com/revoke \
  -u "client_id:client_secret" \
  -d "token=ACCESS_TOKEN&token_type_hint=access_token"
```

## Device Flow

### Enable Device Authorization Flow

```bash
export DEVICE_FLOW_ENABLED=true
export DEVICE_CODE_LIFETIME=600
export USER_CODE_LIFETIME=600
```

## Dynamic Client Registration

### Enable Dynamic Registration

```bash
export DYNAMIC_REGISTRATION_ENABLED=true
export DYNAMIC_REGISTRATION_REQUIRES_AUTH=false
```

### Register Client Dynamically

```bash
curl -X POST https://oidc.example.com/register \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "My App",
    "redirect_uris": ["https://app.example.com/callback"]
  }'
```

## WebAuthn Support

### Enable WebAuthn

```bash
export WEBAUTHN_ENABLED=true
export WEBAUTHN_RP_ID=example.com
export WEBAUTHN_RP_NAME="My Organization"
export WEBAUTHN_ORIGIN=https://oidc.example.com
```

## OpenTelemetry Integration

### Enable Tracing

```bash
export OTEL_ENABLED=true
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
export OTEL_SERVICE_NAME=oidc-provider
export OTEL_TRACES_SAMPLER=always_on
```

## Custom Policies

### Implement Custom Password Policy

```bash
export PASSWORD_MIN_LENGTH=12
export PASSWORD_REQUIRE_UPPERCASE=true
export PASSWORD_REQUIRE_LOWERCASE=true
export PASSWORD_REQUIRE_NUMBERS=true
export PASSWORD_REQUIRE_SPECIAL_CHARS=true
export PASSWORD_EXPIRY_DAYS=90
```

## Troubleshooting Configuration

### Validate Configuration

```bash
# Check if config.json is valid JSON
jq . config.json

# Check environment variables
docker exec container_name env | grep -i oidc

# View provider logs
docker logs container_name | grep CONFIG
```

### Enable Debug Configuration

```bash
export LOG_LEVEL=debug
export DEBUG=oidc-provider:*
```
