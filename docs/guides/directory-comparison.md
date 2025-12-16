# Directory Service Comparison Guide

This guide helps you choose the right directory service for your OIDC provider deployment.

## Quick Decision Matrix

| Scenario | Recommended Option | Reason |
|----------|-------------------|---------|
| Local development | **JSON File** | Simplest setup, no dependencies |
| Self-hosted (< 100 users) | **JSON File** | Easy to manage, version control friendly |
| Self-hosted (100+ users) | **SQLite Database** | Better performance, structured data |
| Need roles/groups | **SQLite Database** | Built-in support for RBAC |
| Need audit logs | **SQLite Database** | Automatic change tracking |
| Need management UI | **SQLite Database** + Remote Directory Service | Web-based user management |
| Enterprise integration | **Remote Directory** | Connect to existing identity systems |
| Microservices architecture | **Remote Directory** | Separate service, scalable |
| Active Directory/LDAP | **Remote Directory** | Proxy to enterprise directory |
| Multi-region deployment | **Remote Directory** | Centralized user management |

## Detailed Comparison

### JSON File Directory (`DIRECTORY_TYPE=local`)

**Best For:**
- Development and testing
- Small deployments (< 100 users)
- Simple user lists without complex relationships
- Version-controlled user data

**Pros:**
- ✅ Simplest to set up
- ✅ No dependencies
- ✅ Version control friendly (Git)
- ✅ Easy backup (copy file)
- ✅ Human-readable format
- ✅ Direct file editing

**Cons:**
- ❌ No relational data (roles, groups limited)
- ❌ Single email per user only
- ❌ No audit logging
- ❌ Poor performance with many users
- ❌ No management UI
- ❌ Manual password hashing required
- ❌ Limited concurrent access

**Configuration:**
```yaml
environment:
  DIRECTORY_TYPE: local
  DIRECTORY_USERS_FILE: /app/config/users.json
volumes:
  - ./users.json:/app/config/users.json:ro
```

**Data Structure:**
```json
[
  {
    "id": "user-1",
    "email": "admin@localhost",
    "password": "$2a$10$hash...",
    "name": "Admin User",
    "groups": ["admin"]
  }
]
```

---

### SQLite Database Directory (`DIRECTORY_TYPE=sqlite`)

**Best For:**
- Self-hosted deployments
- Structured user data with roles and groups
- Need for audit logging
- 100-10,000+ users
- Single-server deployments

**Pros:**
- ✅ Relational data model
- ✅ Multiple emails per user
- ✅ Roles and groups support
- ✅ Custom properties (unlimited)
- ✅ Audit logging
- ✅ Good performance (B-tree indexes)
- ✅ No external database server
- ✅ Optional management UI
- ✅ Concurrent access safe (WAL mode)
- ✅ ACID compliance

**Cons:**
- ❌ Slightly more complex setup
- ❌ Not human-readable
- ❌ Requires tools for direct editing
- ❌ Single-server only (no replication)

**Configuration:**
```yaml
environment:
  DIRECTORY_TYPE: sqlite
  DIRECTORY_DATABASE_FILE: /data/users.db
volumes:
  - ./data:/data
```

**Data Structure:**
- Normalized tables (users, emails, roles, groups, etc.)
- Foreign key relationships
- Constraints and indexes
- Audit log tables

---

### Remote Directory Service (`DIRECTORY_TYPE=remote`)

**Best For:**
- Enterprise deployments
- Integration with existing identity systems
- Microservices architecture
- Multi-region deployments
- Need for centralized user management
- High availability requirements

**Pros:**
- ✅ Separate service (independent scaling)
- ✅ Web management UI included
- ✅ REST API for integrations
- ✅ Can proxy to AD/LDAP
- ✅ Supports any backend (PostgreSQL, MongoDB, etc.)
- ✅ Horizontal scaling possible
- ✅ Multi-region support
- ✅ Real-time updates
- ✅ Centralized audit logs

**Cons:**
- ❌ More complex deployment
- ❌ Network dependency
- ❌ Requires API authentication
- ❌ Additional service to maintain

**Configuration:**
```yaml
environment:
  DIRECTORY_TYPE: remote
  DIRECTORY_BASE_URL: http://directory:8080
  DIRECTORY_HEADERS: '{"Authorization":"Bearer token"}'
```

**Architecture:**
```
Provider → HTTP → Directory Service → Database
                                    → AD/LDAP
                                    → Custom Backend
```

## Feature Comparison Matrix

| Feature | JSON File | SQLite | Remote |
|---------|-----------|--------|--------|
| Setup Complexity | ⭐ Simple | ⭐⭐ Moderate | ⭐⭐⭐ Complex |
| Performance (small) | ⭐⭐⭐ Good | ⭐⭐⭐ Good | ⭐⭐ Fair |
| Performance (large) | ⭐ Poor | ⭐⭐⭐ Good | ⭐⭐⭐ Excellent |
| Scalability | ⭐ Limited | ⭐⭐ Good | ⭐⭐⭐ Excellent |
| Multiple Emails | ❌ No | ✅ Yes | ✅ Yes |
| Roles & Groups | ⚠️ Limited | ✅ Full | ✅ Full |
| Custom Properties | ⚠️ Limited | ✅ Unlimited | ✅ Unlimited |
| Audit Logging | ❌ No | ✅ Yes | ✅ Yes |
| Management UI | ❌ No | ✅ Optional | ✅ Built-in |
| Concurrent Access | ⚠️ Read-only | ✅ Yes | ✅ Yes |
| Backup Strategy | ⭐⭐⭐ Simple | ⭐⭐ Moderate | ⭐⭐⭐ Standard |
| Version Control | ✅ Yes | ❌ No | ❌ No |
| Bcrypt Passwords | ⚠️ Manual | ✅ Auto | ✅ Auto |
| External Dependencies | ✅ None | ✅ None | ⚠️ Service |
| High Availability | ❌ No | ❌ No | ✅ Yes |
| Multi-Region | ❌ No | ❌ No | ✅ Yes |

## Migration Paths

### JSON → SQLite

1. Start directory service with SQLite database
2. Import users via API or UI
3. Update provider to use `DIRECTORY_TYPE=sqlite`
4. Test authentication
5. Remove JSON file

**Tools:**
- Directory service web UI (import feature)
- Migration script (can be provided)
- Manual API calls

### JSON → Remote

1. Deploy directory service
2. Import users to directory database
3. Update provider to use `DIRECTORY_TYPE=remote`
4. Configure authentication headers
5. Test connectivity

### SQLite → Remote

1. Deploy directory service
2. Point directory service to existing SQLite database
3. Update provider to use `DIRECTORY_TYPE=remote`
4. No data migration needed!

**Advantage:** SQLite and Remote use the same database schema.

### Remote → SQLite

1. Export database from directory service
2. Copy database file to provider volume
3. Update provider to use `DIRECTORY_TYPE=sqlite`
4. Optionally stop directory service

## Hybrid Approaches

### SQLite + Directory Service (Recommended)

Use SQLite directory in provider + Directory service for management:

```yaml
services:
  directory:
    environment:
      DATABASE_FILE: /data/users.db
    volumes:
      - shared-data:/data

  provider:
    environment:
      DIRECTORY_TYPE: sqlite
      DIRECTORY_DATABASE_FILE: /data/users.db
    volumes:
      - shared-data:/data

volumes:
  shared-data:
```

**Benefits:**
- Single database file
- Provider has direct access (fast)
- Management UI available
- Best of both worlds

### Remote with Multiple Providers

Multiple providers connecting to one directory:

```yaml
services:
  directory:
    # Single directory service
    
  provider-region-1:
    environment:
      DIRECTORY_TYPE: remote
      DIRECTORY_BASE_URL: http://directory:8080
      
  provider-region-2:
    environment:
      DIRECTORY_TYPE: remote
      DIRECTORY_BASE_URL: http://directory:8080
```

**Benefits:**
- Centralized user management
- Consistent authentication
- Easy user updates
- Scale providers independently

## Performance Considerations

### JSON File
- **Read Performance:** O(n) - scans entire file
- **Write Performance:** N/A - read-only in production
- **Suitable For:** < 100 users
- **Memory:** Loads entire file into memory

### SQLite
- **Read Performance:** O(log n) - B-tree index
- **Write Performance:** O(log n) - transaction-based
- **Suitable For:** 100-100,000+ users (single server)
- **Memory:** Pages loaded on-demand
- **Concurrency:** WAL mode enables concurrent reads

### Remote
- **Read Performance:** Network latency + database query
- **Write Performance:** Network latency + database transaction
- **Suitable For:** Any number of users
- **Memory:** Depends on backend
- **Concurrency:** Depends on backend (can be very high)
- **Caching:** Can implement Redis/Memcached

## Security Considerations

| Aspect | JSON File | SQLite | Remote |
|--------|-----------|--------|--------|
| Password Storage | Manual bcrypt | Enforced bcrypt | Enforced bcrypt |
| File Permissions | Important | Important | N/A |
| Network Security | N/A | N/A | TLS + Bearer Token |
| SQL Injection | N/A | Protected | Protected |
| Audit Trail | No | Yes | Yes |
| Access Control | File system | File system | API + RBAC |

## Recommendations by Deployment Size

### Tiny (1-10 users)
**→ JSON File**
- Simple and sufficient
- Easy to manage manually
- No complexity overhead

### Small (10-100 users)
**→ JSON File or SQLite**
- JSON if rarely changes
- SQLite if need roles/groups

### Medium (100-1,000 users)
**→ SQLite + Directory Service**
- Need management UI
- Better performance
- Audit logging valuable

### Large (1,000-10,000 users)
**→ SQLite or Remote**
- SQLite if single server
- Remote if need HA/scaling

### Enterprise (10,000+ users)
**→ Remote with External Backend**
- PostgreSQL/MongoDB backend
- High availability setup
- Multi-region support
- Integration with AD/LDAP

## Getting Started

1. **Choose your directory type** based on needs
2. **Review the configuration guide** for your choice
3. **Test with sample data** in development
4. **Plan your backup strategy**
5. **Deploy to production**

## Further Reading

- [User Management Guide](../configuration/user-management.md)
- [SQLite Directory Quick Start](sqlite-directory.md)
- [Remote Directory Configuration](../configuration/remote-directory.md)
- [Environment Variables Reference](../configuration/environment-variables.md)
