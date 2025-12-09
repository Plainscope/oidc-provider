# Performance Tuning Guide

Optimize the OIDC provider for high-performance production deployments.

## Table of Contents

- [Database Performance](#database-performance)
- [Application Performance](#application-performance)
- [Docker & Container Performance](#docker--container-performance)
- [Network Performance](#network-performance)
- [Monitoring & Metrics](#monitoring--metrics)
- [Load Testing](#load-testing)
- [Scaling Strategies](#scaling-strategies)

## Database Performance

### SQLite Optimization

The provider uses SQLite with the following optimizations:

#### WAL Mode

Write-Ahead Logging (WAL) mode is enabled for better concurrency:

```sql
PRAGMA journal_mode = WAL;
```

**Benefits**:
- Readers don't block writers
- Writers don't block readers
- Better performance for concurrent access

#### Prepared Statements

All database queries use prepared statements for performance:

```typescript
// Statements are prepared once and reused
statements.find!.get(id, now);
statements.upsert!.run(payload, expiresAt, id);
```

**Benefits**:
- No re-parsing of SQL
- Better query plan caching
- 2-3x faster than dynamic queries

#### Pragma Settings

Optimized pragma settings for production:

```sql
PRAGMA synchronous = NORMAL;     -- Balance safety and performance
PRAGMA cache_size = -64000;      -- 64MB cache
PRAGMA busy_timeout = 5000;      -- 5 second timeout
PRAGMA foreign_keys = ON;        -- Enforce referential integrity
```

#### Indexing

Optimized indexes for common queries:

```sql
CREATE INDEX idx_model_name ON oidc_models(model_name);
CREATE INDEX idx_expires_at ON oidc_models(expires_at);
CREATE INDEX idx_model_expires ON oidc_models(model_name, expires_at);
```

### Database Cleanup

Regularly clean up expired tokens:

```bash
# Example cleanup script
sqlite3 /data/oidc.db "DELETE FROM oidc_models WHERE expires_at < unixepoch() AND expires_at IS NOT NULL;"
sqlite3 /data/oidc.db "VACUUM;"
```

Schedule via cron:

```bash
# Daily at 3 AM
0 3 * * * /opt/scripts/cleanup-tokens.sh
```

### Database Backup Strategy

For high-performance backups:

```bash
# Use WAL checkpoint for consistent backup
sqlite3 /data/oidc.db "PRAGMA wal_checkpoint(FULL);"
cp /data/oidc.db /backup/oidc-$(date +%Y%m%d).db
```

## Application Performance

### Node.js Optimization

#### Memory Management

Configure V8 heap size for your workload:

```bash
# For 2GB RAM available
NODE_OPTIONS="--max-old-space-size=1536"

# For 4GB RAM available
NODE_OPTIONS="--max-old-space-size=3072"
```

#### CPU Optimization

Enable V8 optimizations:

```bash
NODE_OPTIONS="--max-old-space-size=2048 --optimize-for-size"
```

### Logging Performance

Reduce logging overhead in production:

```bash
# Only log warnings and errors
LOG_LEVEL=warn

# Disable debug logging
DEBUG=

# Structured logging for better performance
LOG_FORMAT=json
```

### Connection Pooling

For remote directory service:

```bash
# HTTP connection pooling
HTTP_AGENT_KEEPALIVE=true
HTTP_AGENT_MAXSOCKETS=50
```

### Caching

#### Response Caching

Add caching headers for static resources:

```typescript
// Cache static assets for 1 year
app.use('/public', express.static('./public', {
  maxAge: '1y',
  immutable: true
}));
```

#### OIDC Discovery Caching

Cache OIDC discovery documents:

```nginx
location /.well-known/openid-configuration {
    proxy_pass http://oidc-provider:8080;
    proxy_cache_valid 200 1h;
    proxy_cache_use_stale error timeout updating;
}
```

## Docker & Container Performance

### Resource Limits

Set appropriate resource limits:

```yaml
services:
  oidc-provider:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
```

### Volume Performance

Use volumes instead of bind mounts for better I/O:

```yaml
services:
  oidc-provider:
    volumes:
      - provider-data:/data  # Named volume (faster)
      # Not: ./data:/data    # Bind mount (slower on some systems)

volumes:
  provider-data:
    driver: local
```

### Multi-Stage Build Optimization

The Dockerfile is optimized for size and performance:

```dockerfile
# Separate build and runtime stages
FROM node:25-alpine AS build
# Build dependencies and compile

FROM node:25-alpine AS runtime
# Only production dependencies
RUN npm ci --omit=dev
```

**Benefits**:
- Smaller image size (~180MB)
- Faster container startup
- Reduced attack surface

### Image Layers

Optimize layer caching:

```dockerfile
# Copy dependency files first (changes less often)
COPY package*.json ./
RUN npm ci

# Copy source code last (changes more often)
COPY src ./src
```

## Network Performance

### Compression

Enable gzip compression via reverse proxy:

```nginx
server {
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss;
    
    location / {
        proxy_pass http://oidc-provider:8080;
    }
}
```

### HTTP/2

Enable HTTP/2 for better performance:

```nginx
server {
    listen 443 ssl http2;
    # ... rest of config
}
```

**Benefits**:
- Multiplexing
- Header compression
- Server push capability

### Connection Pooling

Configure Nginx connection pooling:

```nginx
upstream oidc_providers {
    least_conn;
    keepalive 32;
    
    server provider-1:8080;
    server provider-2:8080;
    server provider-3:8080;
}

server {
    location / {
        proxy_pass http://oidc_providers;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}
```

### DNS Caching

Cache DNS lookups:

```nginx
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;
```

## Monitoring & Metrics

### Health Check Optimization

The provider includes a lightweight health check:

```typescript
app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});
```

Configure appropriately:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8080/healthz"]
  interval: 30s      # Check every 30 seconds
  timeout: 10s       # Timeout after 10 seconds
  retries: 3         # Retry 3 times before marking unhealthy
  start_period: 40s  # Give app 40 seconds to start
```

### Performance Metrics

Key metrics to monitor:

1. **Request Rate**: Requests per second
2. **Response Time**: 
   - Average response time
   - 95th percentile
   - 99th percentile
3. **Error Rate**: Percentage of 4xx/5xx responses
4. **Database Performance**:
   - Query time
   - Connection pool usage
   - Lock wait time
5. **Memory Usage**: Heap usage and GC frequency
6. **CPU Usage**: Percentage utilization

### Prometheus Integration (Future)

Example metrics endpoint:

```typescript
// Future implementation
app.get('/metrics', async (req, res) => {
  const metrics = {
    requests_total: requestCounter,
    request_duration_seconds: histogram,
    database_queries_total: dbQueryCounter,
    active_sessions: sessionGauge
  };
  res.set('Content-Type', 'text/plain');
  res.send(formatPrometheusMetrics(metrics));
});
```

### Application Performance Monitoring

Recommended APM solutions:

- **New Relic**: Full-stack monitoring
- **Datadog**: Infrastructure and application monitoring
- **Prometheus + Grafana**: Open-source metrics
- **Elastic APM**: Part of ELK stack

## Load Testing

### Testing Tools

#### Apache Bench (ab)

Simple load testing:

```bash
# 1000 requests, 10 concurrent
ab -n 1000 -c 10 https://oidc.example.com/healthz

# With authentication
ab -n 100 -c 5 -p post.json -T application/json \
  https://oidc.example.com/token
```

#### k6

Advanced load testing:

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
  },
};

export default function () {
  let response = http.get('https://oidc.example.com/.well-known/openid-configuration');
  check(response, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(1);
}
```

Run:

```bash
k6 run load-test.js
```

#### Artillery

OAuth flow testing:

```yaml
# artillery-test.yml
config:
  target: 'https://oidc.example.com'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"

scenarios:
  - name: "OAuth Authorization Flow"
    flow:
      - get:
          url: "/.well-known/openid-configuration"
      - post:
          url: "/token"
          json:
            grant_type: "client_credentials"
            client_id: "{{ $randomString() }}"
            client_secret: "{{ $randomString() }}"
```

Run:

```bash
artillery run artillery-test.yml
```

### Load Testing Best Practices

1. **Start Small**: Begin with low load and gradually increase
2. **Monitor Resources**: Watch CPU, memory, and database metrics
3. **Test Realistic Scenarios**: Simulate actual OAuth flows
4. **Test at Scale**: Test with production-level traffic
5. **Measure Baseline**: Establish baseline performance before optimization
6. **Test Edge Cases**: Expired tokens, invalid credentials, etc.

### Performance Targets

Recommended targets for production:

| Metric | Target | Acceptable |
|--------|--------|------------|
| Response Time (p95) | < 200ms | < 500ms |
| Response Time (p99) | < 500ms | < 1000ms |
| Error Rate | < 0.1% | < 1% |
| Throughput | 100 req/s | 50 req/s |
| Availability | 99.9% | 99.5% |

## Scaling Strategies

### Vertical Scaling

Increase container resources:

```yaml
services:
  oidc-provider:
    deploy:
      resources:
        limits:
          cpus: '4.0'      # Increased from 2.0
          memory: 4G       # Increased from 2G
```

**When to use**:
- Simple to implement
- Good for initial growth
- Limited by hardware

### Horizontal Scaling

Run multiple instances:

```yaml
services:
  oidc-provider:
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
```

**Benefits**:
- Better availability
- Increased capacity
- No single point of failure

**Requirements**:
- Stateless application (✅ implemented)
- Shared database/storage
- Load balancer

### Database Scaling

For very high load, consider:

1. **Connection Pooling**: Reuse database connections
2. **Read Replicas**: Separate read and write operations
3. **Database Migration**: Move to PostgreSQL/MySQL for better concurrency
4. **Caching Layer**: Redis for session storage

### Auto-Scaling

Kubernetes HPA example:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: oidc-provider-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: oidc-provider
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### CDN for Static Assets

Use CDN for static resources:

```nginx
location /public/ {
    # Serve from CDN
    proxy_pass https://cdn.example.com/oidc-provider/;
    proxy_cache_valid 200 1y;
}
```

## Performance Checklist

- [ ] SQLite WAL mode enabled
- [ ] Database indexes optimized
- [ ] Prepared statements used
- [ ] Node.js memory configured
- [ ] Logging level set to warn/error
- [ ] Compression enabled
- [ ] HTTP/2 enabled
- [ ] Static assets cached
- [ ] Health checks optimized
- [ ] Load testing completed
- [ ] Monitoring configured
- [ ] Resource limits set
- [ ] Auto-scaling configured (if needed)

## Troubleshooting Performance Issues

### High CPU Usage

**Symptoms**: CPU at 90%+ consistently

**Diagnosis**:
```bash
# Check process CPU
docker stats oidc-provider

# Profile Node.js
NODE_OPTIONS="--prof" node dist/index.js
```

**Solutions**:
- Add more CPU cores
- Optimize database queries
- Enable caching
- Scale horizontally

### High Memory Usage

**Symptoms**: Memory usage growing over time

**Diagnosis**:
```bash
# Check memory usage
docker stats oidc-provider

# Node.js heap dump
kill -USR2 <pid>
```

**Solutions**:
- Increase heap size
- Fix memory leaks
- Restart containers regularly
- Enable garbage collection logging

### Slow Database Queries

**Symptoms**: High response times

**Diagnosis**:
```bash
# Enable query logging
PRAGMA query_only = ON;

# Check slow queries in logs
grep "SqliteAdapter" /var/log/oidc/*.log | grep -v "100ms"
```

**Solutions**:
- Add indexes
- Optimize queries
- Clean up expired tokens
- Increase cache size

### Network Bottlenecks

**Symptoms**: High latency, timeouts

**Diagnosis**:
```bash
# Test network latency
ping oidc.example.com

# Check connection stats
netstat -an | grep :8080
```

**Solutions**:
- Enable compression
- Use HTTP/2
- Optimize DNS
- Use CDN

## Additional Resources

- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)
- [SQLite Performance Tuning](https://www.sqlite.org/optoverview.html)
- [Docker Performance Best Practices](https://docs.docker.com/config/containers/resource_constraints/)
- [Nginx Performance Tuning](https://www.nginx.com/blog/tuning-nginx/)
