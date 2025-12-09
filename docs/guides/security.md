# Security Considerations and Best Practices

Critical security guidelines for deploying and maintaining the OIDC provider.

## Table of Contents

- [Client Credential Security](#client-credential-security)
- [HTTPS/TLS Configuration](#httpstls-configuration)
- [User Authentication Security](#user-authentication-security)
- [Cookie Security](#cookie-security)
- [CORS Configuration](#cors-configuration)
- [Token Security](#token-security)
- [Rate Limiting](#rate-limiting)
- [Account Lockout](#account-lockout)
- [Audit Logging](#audit-logging)
- [Database and Configuration Security](#database-and-configuration-security)
- [Network Security](#network-security)
- [Security Scanning](#security-scanning)
- [Compliance Considerations](#compliance-considerations)
- [Security Incident Response](#security-incident-response)
- [Production Security Checklist](#checklist-for-production)

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

## Additional Security Best Practices

### Input Validation

The provider implements input validation and sanitization to prevent injection attacks:

```typescript
// Email validation using validator.js
import validator from 'validator';

if (!validator.isEmail(email)) {
  return res.status(400).render('login', {
    error: 'Invalid email format'
  });
}

// Input sanitization using validator.js
const sanitizedEmail = validator.escape(validator.trim(email));
```

**Libraries Used:**
- **validator.js** (v13.15.22+): Comprehensive validation and sanitization (already included)

**Alternative Libraries:**
- **DOMPurify**: Client-side HTML/XSS sanitization
- **express-validator**: Express middleware for validation

Example with validator.js (already implemented):

```bash
npm install validator
```

```typescript
import validator from 'validator';

// Validate and sanitize email
const email = validator.normalizeEmail(req.body.email);
if (!validator.isEmail(email)) {
  return res.status(400).json({ error: 'Invalid email' });
}

// Sanitize input
const sanitized = validator.escape(req.body.input);
```

### Timing Attack Prevention

Login endpoints implement constant-time comparison to prevent timing attacks:

```typescript
// Minimum response time to prevent timing analysis
const minResponseTime = 100; // 100ms
const elapsedTime = Date.now() - startTime;
if (elapsedTime < minResponseTime) {
  await new Promise(resolve => setTimeout(resolve, minResponseTime - elapsedTime));
}
```

### Security Headers

The provider automatically sets comprehensive security headers:

- **X-Frame-Options**: Prevents clickjacking attacks
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **X-XSS-Protection**: Enables browser XSS filter
- **Content-Security-Policy**: Controls resource loading
- **Strict-Transport-Security**: Forces HTTPS (production only)
- **Referrer-Policy**: Controls referrer information
- **Permissions-Policy**: Restricts browser features

### Environment Variable Security

Environment variables are validated on startup:

```bash
# Required validations:
# - PORT must be 1-65535
# - ISSUER must be valid URL
# - HTTPS required in production
# - Cookie keys must be 32+ characters
```

If validation fails, the server will not start and will log specific errors.

### Password Security Recommendations

While the demo uses plain-text passwords for simplicity, production deployments should:

1. **Hash passwords** using bcrypt, scrypt, or Argon2
2. **Use unique salts** per password
3. **Implement minimum password requirements**:
   - At least 12 characters
   - Mix of uppercase, lowercase, numbers, symbols
   - No common dictionary words

Example bcrypt implementation:

```typescript
import bcrypt from 'bcrypt';

// Hash password
const hashedPassword = await bcrypt.hash(password, 12);

// Verify password
const isValid = await bcrypt.compare(password, hashedPassword);
```

### SQL Injection Prevention

The SQLite adapter uses parameterized queries and prepared statements:

```typescript
// Safe parameterized query
statements.find!.get(id, now);

// NOT vulnerable to SQL injection
```

### Session Security

Configure secure session cookies:

```bash
# Strong cookie keys (32+ hex characters)
COOKIES_KEYS='["$(openssl rand -hex 32)","$(openssl rand -hex 32)"]'
```

The provider enforces:
- `httpOnly`: Prevents JavaScript access
- `secure`: HTTPS-only (production)
- `sameSite`: CSRF protection

### Dependency Management

Regular dependency updates are critical:

```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# Fix vulnerabilities automatically
npm audit fix
```

### Container Security

Production containers should:

1. **Run as non-root user** (already implemented)
2. **Use read-only filesystem** where possible
3. **Drop unnecessary capabilities**
4. **Scan images regularly**

```bash
# Scan with Trivy
trivy image docker.io/plainscope/simple-oidc-provider:latest

# Scan with Snyk
snyk container test docker.io/plainscope/simple-oidc-provider:latest
```

## Common Security Vulnerabilities to Avoid

### 1. Information Disclosure

**Problem**: Error messages revealing system details

**Solution**: Generic error messages in production

```typescript
// Good: Generic error
error: 'Invalid email or password'

// Bad: Specific error
error: 'Email not found in database'
```

### 2. Session Fixation

**Problem**: Attacker fixes user's session ID

**Solution**: Regenerate session ID after login (handled by oidc-provider)

### 3. Cross-Site Request Forgery (CSRF)

**Problem**: Unauthorized commands from trusted user

**Solution**: 
- State parameter in OAuth flows (implemented)
- SameSite cookie attribute (implemented)
- Additional CSRF tokens for sensitive operations

### 4. Open Redirect

**Problem**: Redirect to malicious site after login

**Solution**: Validate redirect URIs strictly

```bash
# Only allow registered redirect URIs
REDIRECT_URIS=https://app.example.com/callback,https://app.example.com/auth/callback
```

### 5. Insufficient Logging

**Problem**: Security incidents go undetected

**Solution**: Comprehensive audit logging

```typescript
// Log security events
console.log('[AUDIT] Login attempt:', { email, ip, timestamp });
console.log('[AUDIT] Login success:', { userId, ip, timestamp });
console.log('[AUDIT] Login failure:', { email, ip, timestamp });
```

## Security Monitoring

### Metrics to Track

1. **Failed login attempts** per user/IP
2. **Token issuance rates**
3. **Unusual access patterns**
4. **Error rates**
5. **Response times** (detect DoS)

### Alerting Rules

Set up alerts for:

```bash
# Example alert conditions
- Failed login attempts > 10 in 5 minutes
- Token revocations > 100 in 1 hour
- Error rate > 5% of requests
- Response time > 2 seconds (99th percentile)
```

### Log Analysis

Use centralized logging for security analysis:

```bash
# Example queries
# Failed logins by IP
grep "Invalid credentials" /var/log/oidc/*.log | awk '{print $5}' | sort | uniq -c | sort -rn

# Successful logins by user
grep "Login successful" /var/log/oidc/*.log | awk '{print $7}' | sort | uniq -c

# Token operations
grep "TOKEN" /var/log/oidc/*.log | tail -100
```

## Security Testing

### Automated Security Tests

1. **OWASP ZAP** for web application scanning
2. **Burp Suite** for manual testing
3. **dependency-check** for known vulnerabilities
4. **Container scanning** with Trivy/Snyk

Example ZAP scan:

```bash
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://oidc.example.com \
  -r zap-report.html
```

### Penetration Testing Checklist

- [ ] SQL injection attempts
- [ ] XSS attacks
- [ ] CSRF attacks
- [ ] Session hijacking
- [ ] Brute force attacks
- [ ] OAuth flow manipulation
- [ ] Token theft/replay
- [ ] Open redirect vulnerabilities
- [ ] Information disclosure
- [ ] Timing attacks

## Security Resources

### Standards and Specifications

- [OAuth 2.0 Security Best Practices (RFC 6819)](https://tools.ietf.org/html/rfc6819)
- [OAuth 2.0 for Browser-Based Apps](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps)
- [OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

### Tools

- [OWASP ZAP](https://www.zaproxy.org/) - Web application scanner
- [Burp Suite](https://portswigger.net/burp) - Security testing
- [Trivy](https://github.com/aquasecurity/trivy) - Container scanning
- [Snyk](https://snyk.io/) - Dependency scanning
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit) - Node.js security

### Learning Resources

- [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [PortSwigger Web Security Academy](https://portswigger.net/web-security)
- [OAuth 2.0 Simplified](https://oauth.com/)
- [OpenID Connect Explained](https://connect2id.com/learn/openid-connect)

## Getting Security Help

If you discover a security vulnerability:

1. **DO NOT** open a public GitHub issue
2. Email security concerns to the maintainers privately
3. Include detailed information about the vulnerability
4. Allow reasonable time for a patch before disclosure
5. Follow responsible disclosure practices

For security questions:
- Check [Security FAQ](../troubleshooting.md#security-questions)
- Review [GitHub Discussions](https://github.com/Plainscope/oidc-provider/discussions)
- Consult OAuth/OIDC specifications
