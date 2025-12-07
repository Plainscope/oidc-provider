# Security Considerations and Best Practices

Critical security guidelines for deploying and maintaining the OIDC provider.

## Client Credential Security

### Generating Strong Credentials

```bash
# Generate strong client ID (32 hex characters)
openssl rand -hex 16

# Generate strong client secret (64 hex characters)
openssl rand -hex 32
```

### Credential Management

- **Never** commit credentials to version control
- Use environment variables or secret management systems
- Rotate credentials regularly (at least annually)
- Store credentials in secure vaults (HashiCorp Vault, AWS Secrets Manager, etc.)
- Use unique credentials per environment (dev, staging, prod)

### Example with Docker Secrets

```bash
# Create secret
echo "your-client-secret" | docker secret create oidc_client_secret -

# Use in compose
secrets:
  oidc_client_secret:
    external: true

services:
  oidc-provider:
    environment:
      CLIENT_SECRET_FILE: /run/secrets/oidc_client_secret
```

## HTTPS/TLS Configuration

### Enforced HTTPS

Always use HTTPS in production:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    return 301 https://$host$request_uri;
}
```

### SSL/TLS Best Practices

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
ssl_prefer_server_ciphers on;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;

# HSTS header
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

## User Authentication Security

### Password Requirements

Users should have:

- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, and special characters
- No common dictionary words

### User Data Protection

- Store passwords securely (bcrypt, scrypt, or similar)
- Use unique salts per password
- Implement account lockout after failed login attempts
- Implement CAPTCHA for brute force protection

### Multi-Factor Authentication (Future)

Plan for MFA implementation:

- TOTP (Time-based One-Time Password)
- WebAuthn/FIDO2
- SMS-based (less secure)

## Cookie Security

### Session Cookies

```typescript
// Configure secure cookies
cookies: {
  keys: [
    'long-random-secret-key-1',
    'long-random-secret-key-2'  // Support key rotation
  ],
  secure: true,           // HTTPS only
  httpOnly: true,         // JavaScript cannot access
  sameSite: 'lax',        // CSRF protection
  maxAge: 3600000         // 1 hour
}
```

### Cookie Key Rotation

Generate and rotate keys:

```bash
# Generate new key
openssl rand -hex 32

# Update COOKIES_KEYS environment variable
export COOKIES_KEYS='["new-key","old-key"]'

# Restart application
docker restart oidc-provider
```

## CORS Configuration

### Allowed Origins

Only allow trusted domains:

```typescript
// Configure in code or environment
ALLOWED_ORIGINS=https://app1.example.com,https://app2.example.com
```

### CORS Headers

```nginx
add_header Access-Control-Allow-Origin "https://app.example.com" always;
add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
add_header Access-Control-Max-Age "3600" always;
```

## Token Security

### Token Endpoint Security

- Require authentication for all token requests
- Use `client_secret_basic` or `client_secret_post` authentication
- Implement rate limiting to prevent token brute-forcing
- Set appropriate token lifetimes

### Token Lifetime Configuration

```bash
# Short-lived access tokens
ACCESS_TOKEN_LIFETIME=900  # 15 minutes

# Longer-lived refresh tokens
REFRESH_TOKEN_LIFETIME=604800  # 7 days

# ID token lifetime
ID_TOKEN_LIFETIME=3600  # 1 hour
```

## Rate Limiting

### Implement Rate Limiting

```nginx
# Define rate limit zones
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=token_limit:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/m;

# Apply to sensitive endpoints
location /interaction/login {
    limit_req zone=login_limit burst=2 nodelay;
    proxy_pass http://oidc-provider:8080;
}

location /token {
    limit_req zone=token_limit burst=5 nodelay;
    proxy_pass http://oidc-provider:8080;
}
```

## Account Lockout

### Implement Lockout Policy

```bash
# Failed login attempts before lockout
MAX_FAILED_ATTEMPTS=5

# Lockout duration (minutes)
LOCKOUT_DURATION=15

# Reset failed attempts after (minutes)
FAILED_ATTEMPTS_RESET=30
```

## Audit Logging

### Enable Comprehensive Logging

```bash
# Log level
LOG_LEVEL=info

# Log all auth events
AUDIT_LOG_ENABLED=true
AUDIT_LOG_PATH=/var/log/oidc-audit.log
```

### Log Examples

```
[AUDIT] User login attempt: admin@localhost from 192.168.1.1
[AUDIT] Successful authentication: admin@localhost
[AUDIT] Client authorization granted: client-id to admin@localhost
[AUDIT] Token issued: client-id to admin@localhost
[AUDIT] Token revoked: user-id
```

### Centralized Logging

```yaml
services:
  oidc-provider:
    logging:
      driver: "awslogs"
      options:
        awslogs-group: "/oidc-provider/logs"
        awslogs-region: "us-east-1"
        awslogs-stream-prefix: "oidc"
```

## Database and Configuration Security

### Secure File Permissions

```bash
# Restrict users.json access
chmod 400 users.json
chown oidc:oidc users.json

# Restrict config.json access
chmod 400 config.json
chown oidc:oidc config.json
```

### Docker Secrets for Configuration

```bash
# Store sensitive config
docker secret create oidc_config - < config.json

# Reference in compose
services:
  oidc-provider:
    secrets:
      - oidc_config
```

## Network Security

### Firewall Rules

```bash
# Allow HTTPS
ufw allow 443/tcp

# Allow HTTP (redirect only)
ufw allow 80/tcp

# Restrict database access to localhost
ufw allow from 127.0.0.1 to any port 5432

# Deny all else
ufw default deny incoming
ufw default allow outgoing
```

### Docker Network Isolation

```yaml
services:
  oidc-provider:
    networks:
      - backend

  reverse-proxy:
    networks:
      - backend
      - frontend

networks:
  backend:
    internal: true  # No external access
  frontend:
    driver: bridge
```

## Security Scanning

### Container Image Scanning

```bash
# Scan for vulnerabilities
docker scan docker.io/plainscope/simple-oidc-provider

# Using Trivy
trivy image docker.io/plainscope/simple-oidc-provider
```

### Dependency Scanning

```bash
# Check npm dependencies
npm audit

# Fix vulnerabilities
npm audit fix
```

## Compliance Considerations

### OAuth 2.0 Security Best Practices (RFC 6819)

- Use HTTPS exclusively
- Validate redirect URIs strictly
- Implement CSRF protection
- Use short-lived access tokens
- Implement rate limiting
- Log all security events

### OpenID Connect Security (OpenID.net)

- Validate ID tokens
- Use appropriate token lifetimes
- Implement proper logout
- Secure all communication channels

### GDPR Compliance

- Implement data retention policies
- Allow users to export their data
- Implement right to be forgotten
- Log user consents
- Document data processing activities

## Security Incident Response

### Compromised Credentials

1. Revoke the exposed credentials immediately
2. Generate new credentials
3. Rotate session keys
4. Review audit logs for unauthorized access
5. Notify affected users
6. Force re-authentication of all active sessions

### Suspicious Activity

1. Enable detailed logging
2. Collect forensic data
3. Block suspicious IP addresses
4. Review token issuance records
5. Check for token replays
6. Verify integrity of user data

## Checklist for Production

- [ ] HTTPS/TLS enabled with strong ciphers
- [ ] Credentials stored in secure vault
- [ ] Rate limiting configured
- [ ] Audit logging enabled and centralized
- [ ] Regular security updates scheduled
- [ ] CORS properly configured
- [ ] Session cookies secure (httpOnly, Secure, SameSite)
- [ ] Password requirements enforced
- [ ] Account lockout policy implemented
- [ ] Firewall rules configured
- [ ] Docker security best practices applied
- [ ] Container images scanned for vulnerabilities
- [ ] Dependency vulnerabilities remediated
- [ ] Backup and recovery procedures tested
- [ ] Incident response plan documented
- [ ] Security team training completed
