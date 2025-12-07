# Troubleshooting Guide

Solutions for common issues encountered when using the OIDC provider.

## Container Issues

### Container Won't Start

**Symptom**: Docker container exits immediately or fails to start.

**Solutions**:

```bash
# Check container logs
docker logs oidc-provider

# Check exit code
docker inspect oidc-provider | grep ExitCode

# Verify image exists
docker images | grep simple-oidc-provider
```

**Common Causes**:

1. **Missing environment variables**

   ```bash
   # Add required variables
   docker run -e PORT=8080 -e ISSUER=http://localhost:8080 ...
   ```

2. **Port already in use**

   ```bash
   # Find process using port 8080
   lsof -i :8080
   
   # Use different port
   docker run -p 9090:8080 ...
   ```

3. **Invalid configuration**

   ```bash
   # Validate JSON files
   jq . users.json
   jq . config.json
   ```

### Container Running but Not Responding

**Symptom**: Container is running but health check fails.

```bash
# Check health status
docker inspect --format='{{.State.Health.Status}}' oidc-provider

# Manually test endpoint
curl -v http://localhost:8080/.well-known/openid-configuration

# Check container network
docker inspect oidc-provider | grep -A 20 NetworkSettings
```

## Connection Issues

### Cannot Connect to Provider

**Symptom**: Connection refused when accessing `http://localhost:8080`

**Solutions**:

```bash
# Verify container is running
docker ps | grep oidc-provider

# Check if port is forwarded correctly
docker port oidc-provider

# Test from inside container
docker exec oidc-provider curl http://localhost:8080

# Check firewall
sudo ufw status
sudo iptables -L | grep 8080
```

### DNS Resolution Issues

**Symptom**: Cannot resolve provider hostname from other containers.

```bash
# Verify container is on correct network
docker network inspect oidc-net | grep oidc-provider

# Test DNS from another container
docker run --network oidc-net alpine nslookup oidc-provider

# Check Docker daemon
docker ps --filter "label=network=oidc-net"
```

## Configuration Issues

### Invalid Environment Variables

**Symptom**: Configuration errors in logs, provider not behaving as expected.

```bash
# Print all environment variables
docker exec oidc-provider env | sort

# Check specific variable
docker exec oidc-provider printenv ISSUER

# Validate format
echo $CLIENT_SECRET | wc -c  # Should be 65+ characters
```

### Users Not Loading

**Symptom**: Login fails, users don't appear to be loaded.

```bash
# Verify users.json is mounted
docker inspect oidc-provider | grep -A 10 Mounts

# Check users.json format
jq . users.json | head -20

# Verify file permissions
ls -la users.json
stat users.json

# Check logs for errors
docker logs oidc-provider | grep -i user
```

### Client Configuration Not Applied

**Symptom**: Client ID/secret not working, redirects rejected.

```bash
# Check configuration in logs
docker logs oidc-provider | grep -i client

# Verify environment variables
docker exec oidc-provider printenv | grep CLIENT

# Test token endpoint
curl -X POST http://localhost:8080/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=xxx&client_secret=xxx"
```

## Authorization and Authentication Issues

### Login Page Appears Blank

**Symptom**: Login page shows but is empty or has rendering errors.

```bash
# Check if Pug views are present
docker exec oidc-provider ls -la dist/views/

# Verify view files
docker exec oidc-provider cat dist/views/login.pug | head -10

# Check browser console for errors
# Open browser DevTools (F12) and check Console tab
```

### Redirect URI Mismatch Error

**Symptom**: "Invalid Redirect URI" error during authorization.

```bash
# Check configured redirect URIs
docker exec oidc-provider printenv REDIRECT_URIS

# Verify exact match
echo "Configured: http://localhost:3000/callback"
echo "Requested:  http://localhost:3000/callback"

# Common issues:
# - www prefix mismatch (www.example.com vs example.com)
# - Protocol mismatch (http vs https)
# - Port mismatch (3000 vs 3001)
# - Trailing slash (callback vs callback/)
```

### Token Not Being Issued

**Symptom**: Authorization succeeds but token endpoint returns error.

```bash
# Check logs for token errors
docker logs oidc-provider | grep -i token

# Test token endpoint manually
curl -v -X POST http://localhost:8080/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=AUTH_CODE&client_id=CLIENT_ID&client_secret=CLIENT_SECRET&redirect_uri=REDIRECT_URI"

# Verify client authentication
echo -n "CLIENT_ID:CLIENT_SECRET" | base64
# Use in header: Authorization: Basic <base64-value>
```

### Logout Not Working

**Symptom**: Logout redirects but session persists or redirect fails.

```bash
# Check post logout redirect URI
docker exec oidc-provider printenv POST_LOGOUT_REDIRECT_URIS

# Verify URL matches exactly
# Check browser cookies are cleared
# Monitor logs during logout
docker logs oidc-provider -f
```

## Performance Issues

### High Memory Usage

**Symptom**: Container consuming excessive memory.

```bash
# Check memory usage
docker stats oidc-provider

# Check for memory leaks in logs
docker logs oidc-provider | grep -i leak

# Limit memory
docker update --memory 512m oidc-provider

# Restart to clear memory
docker restart oidc-provider
```

### Slow Response Times

**Symptom**: Authentication requests taking a long time.

```bash
# Measure response time
time curl http://localhost:8080/.well-known/openid-configuration

# Check CPU usage
docker stats oidc-provider

# Monitor network
docker exec oidc-provider netstat -an | grep ESTABLISHED

# Enable debug logging
docker exec oidc-provider LOG_LEVEL=debug node dist/index.js
```

### High CPU Usage

**Symptom**: CPU constantly at high utilization.

```bash
# Check CPU usage
docker stats oidc-provider

# Look for infinite loops
docker logs oidc-provider | tail -100

# Check if legitimate high load
# Count requests per second
docker logs oidc-provider | grep PROVIDER | wc -l
```

## Logging and Debugging

### Enable Debug Logging

```bash
docker run -e LOG_LEVEL=debug \
  -e DEBUG=oidc-provider:* \
  docker.io/plainscope/simple-oidc-provider
```

### Inspect Logs

```bash
# Last 100 lines
docker logs --tail 100 oidc-provider

# Follow logs in real-time
docker logs -f oidc-provider

# Logs with timestamps
docker logs --timestamps oidc-provider

# Specific time range
docker logs --since 2024-01-01T00:00:00 oidc-provider
```

### Accessing Provider Shell

```bash
# Interactive bash
docker exec -it oidc-provider /bin/sh

# Check files
docker exec oidc-provider ls -la /app/dist/

# View configuration
docker exec oidc-provider cat /app/dist/config.json
```

## Database/File Issues

### Cannot Access users.json

**Symptom**: Permission denied errors for users.json.

```bash
# Check file ownership
ls -la users.json

# Check inside container
docker exec oidc-provider ls -la /app/dist/users.json

# Fix permissions
chmod 644 users.json
sudo chown 1000:1000 users.json  # node user in container
```

### Corrupt Configuration Files

**Symptom**: JSON parsing errors in logs.

```bash
# Validate JSON
jq empty users.json && echo "Valid" || echo "Invalid"
jq empty config.json && echo "Valid" || echo "Invalid"

# Pretty print to diagnose
jq . users.json | less

# Repair if possible
jq . users.json > users.json.fixed
mv users.json.fixed users.json
```

## Docker Compose Issues

### Service Dependencies Not Ready

**Symptom**: Demo app cannot connect to provider, timeout errors.

```bash
# Check service status
docker-compose ps

# View service logs
docker-compose logs provider
docker-compose logs demo

# Manually wait for provider to be ready
docker-compose up -d provider
docker-compose exec provider curl http://localhost:8080/.well-known/openid-configuration
docker-compose up -d demo
```

### Network Issues Between Services

**Symptom**: Services cannot communicate, connection refused.

```bash
# Check network
docker network inspect oidc-net

# Verify services on network
docker network inspect oidc-net | grep -A 20 Containers

# Test connectivity between services
docker-compose exec demo curl http://provider:8080

# Check DNS
docker-compose exec demo nslookup provider
```

## HTTPS/SSL Issues

### Certificate Errors

**Symptom**: "SSL certificate problem" or certificate validation errors.

```bash
# Check certificate validity
openssl x509 -in /etc/ssl/cert.pem -text -noout | grep -A 2 "Validity"

# Verify certificate matches key
openssl x509 -in cert.pem -noout -modulus | md5sum
openssl rsa -in key.pem -noout -modulus | md5sum
# Should produce same hash

# Test with curl
curl -v https://oidc.example.com
curl -k https://oidc.example.com  # Ignore cert errors
```

### Mixed Content Warnings

**Symptom**: Browser console shows "mixed content" or "insecure content" warnings.

```bash
# Ensure all resources use https
# Check configuration
docker exec oidc-provider grep -r "http://" /app/dist/views/
docker exec oidc-provider grep -r "http://" /app/dist/public/

# Update ISSUER to https
docker run -e ISSUER=https://oidc.example.com ...
```

## Getting Help

If you encounter an issue not covered here:

1. **Collect Information**:

   ```bash
   docker logs oidc-provider > provider.log
   docker inspect oidc-provider > provider-inspect.json
   env | grep -i oidc > environment.txt
   ```

2. **Check Logs for Errors**: Look for stack traces and error messages

3. **Verify Configuration**: Double-check all environment variables

4. **Test Endpoints Manually**: Use curl to test API endpoints

5. **File an Issue**: Report to [GitHub Issues](https://github.com/Plainscope/oidc-provider/issues) with logs and configuration

## Common Error Messages

### "Invalid Redirect URI"

- Ensure redirect URI in configuration matches exactly (including protocol, domain, port)

### "Invalid Client"

- Verify CLIENT_ID is correct
- Ensure client is properly registered

### "Invalid Grant"

- Authorization code may have expired (typically 10 minutes)
- Code may have been used already
- Redirect URI must match original authorization request

### "Invalid Scope"

- Requested scope not configured in SCOPES
- Check SCOPES environment variable

### "Connection Refused"

- Provider container not running
- Port not mapped correctly
- Firewall blocking connection
