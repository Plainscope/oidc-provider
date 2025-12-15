# Getting Started with Directory Integration

This guide provides everything you need to know about integrating user directories with the OIDC Provider, whether using local storage (JSON file or SQLite) or an external directory service.

## Table of Contents

1. [Users.json Schema Reference](#usersjson-schema-reference)
2. [Remote Directory API Contract](#remote-directory-api-contract)
3. [Quick Start Examples](#quick-start-examples)
4. [Integration Patterns](#integration-patterns)

---

## Users.json Schema Reference

The `users.json` file defines user accounts for the OIDC Provider. This schema is used for:
- **Local JSON directory** (`DIRECTORY_TYPE=local`)
- **SQLite seeding** (`DIRECTORY_TYPE=sqlite` with `DIRECTORY_USERS_FILE`)
- **Remote directory initialization**

### Complete Schema

```json
[
  {
    // Required Fields
    "id": "8276bb5b-d0b7-41e9-a805-77b62a2865f4",
    "email": "user@example.com",
    "password": "Rays-93-Accident",
    
    // Basic Profile (OpenID Connect Standard Claims)
    "name": "John Doe",
    "given_name": "John",
    "family_name": "Doe",
    "middle_name": "Michael",
    "nickname": "Johnny",
    "preferred_username": "john.doe",
    
    // Contact Information
    "email_verified": true,
    "phone_number": "+1-555-1234",
    "phone_number_verified": true,
    
    // Profile URLs
    "picture": "https://example.com/avatar.jpg",
    "profile": "https://example.com/profile",
    "website": "https://example.com",
    
    // Personal Information
    "gender": "male",
    "birthdate": "1990-01-15",
    "zoneinfo": "America/New_York",
    "locale": "en-US",
    "updated_at": 1704067200,
    
    // Address (structured object)
    "address": {
      "formatted": "123 Main Street, Anytown, ST 12345, USA",
      "street_address": "123 Main Street",
      "locality": "Anytown",
      "region": "ST",
      "postal_code": "12345",
      "country": "USA"
    }
  }
]
```

### Field Reference

#### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | String | Unique identifier (UUID recommended) | `"8276bb5b-d0b7-41e9-a805-77b62a2865f4"` |
| `email` | String | User's primary email address | `"user@example.com"` |
| `password` | String | User's password (plain text or bcrypt hash) | `"Rays-93-Accident"` or `"$2a$10$..."` |

> **Security Note**: 
> - For **local JSON directory**: Passwords can be plain text (for development only) or bcrypt hashed
> - For **SQLite directory**: Passwords MUST be bcrypt hashed (starts with `$2a$`, `$2b$`, or `$2y$`)
> - For **production**: Always use bcrypt hashed passwords

#### OpenID Connect Profile Claims

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `name` | String | Full name | `"John Doe"` |
| `given_name` | String | First name | `"John"` |
| `family_name` | String | Last name | `"Doe"` |
| `middle_name` | String | Middle name | `"Michael"` |
| `nickname` | String | Casual name | `"Johnny"` |
| `preferred_username` | String | Preferred username | `"john.doe"` |

#### Email Claims

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `email` | String | Email address | `"user@example.com"` |
| `email_verified` | Boolean | Email verification status | `true` or `false` |

#### Phone Claims

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `phone_number` | String | Phone number (E.164 format recommended) | `"+1-555-1234"` |
| `phone_number_verified` | Boolean | Phone verification status | `true` or `false` |

#### Profile URLs

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `picture` | String (URL) | Profile picture URL | `"https://example.com/avatar.jpg"` |
| `profile` | String (URL) | Profile page URL | `"https://example.com/profile"` |
| `website` | String (URL) | Personal website | `"https://example.com"` |

#### Personal Information

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `gender` | String | Gender | `"male"`, `"female"`, `"other"` |
| `birthdate` | String | Birth date (YYYY-MM-DD) | `"1990-01-15"` |
| `zoneinfo` | String | Timezone | `"America/New_York"` |
| `locale` | String | Preferred locale | `"en-US"` |
| `updated_at` | Number | Last update timestamp (Unix) | `1704067200` |

#### Address Claim

| Field | Type | Description |
|-------|------|-------------|
| `address` | Object | Full address object |
| `address.formatted` | String | Full formatted address |
| `address.street_address` | String | Street address |
| `address.locality` | String | City |
| `address.region` | String | State/Province |
| `address.postal_code` | String | ZIP/Postal code |
| `address.country` | String | Country |

### Minimal Example

The absolute minimum required for a user:

```json
[
  {
    "id": "user-1",
    "email": "user@example.com",
    "password": "SecurePassword123"
  }
]
```

### Complete Example

A fully populated user record:

```json
[
  {
    "id": "8276bb5b-d0b7-41e9-a805-77b62a2865f4",
    "email": "admin@localhost",
    "password": "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
    "name": "John Doe",
    "given_name": "John",
    "family_name": "Doe",
    "middle_name": "Michael",
    "nickname": "Johnny",
    "preferred_username": "johnny",
    "email_verified": true,
    "phone_number": "+1-555-0123",
    "phone_number_verified": true,
    "picture": "https://example.com/avatar.jpg",
    "profile": "https://example.com/profile",
    "website": "https://example.com",
    "gender": "male",
    "birthdate": "1987-10-16",
    "zoneinfo": "Europe/Berlin",
    "locale": "en-US",
    "updated_at": 1704067200,
    "address": {
      "formatted": "123 Main Street, Berlin, 10115, Germany",
      "street_address": "123 Main Street",
      "locality": "Berlin",
      "region": "Berlin",
      "postal_code": "10115",
      "country": "Germany"
    }
  }
]
```

### Password Hashing

#### Generate Bcrypt Hash

**Node.js:**
```javascript
const bcrypt = require('bcrypt');
const password = 'MySecurePassword123';
bcrypt.hash(password, 10, (err, hash) => {
  console.log(hash);
  // Output: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
});
```

**Python:**
```python
import bcrypt
password = b'MySecurePassword123'
hashed = bcrypt.hashpw(password, bcrypt.gensalt())
print(hashed.decode())
# Output: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
```

**Command Line:**
```bash
# Using Python
python3 -c "import bcrypt; print(bcrypt.hashpw(b'MySecurePassword123', bcrypt.gensalt()).decode())"

# Using Node.js
node -e "require('bcrypt').hash('MySecurePassword123', 10, (e, h) => console.log(h))"
```

**Online Tool (for testing only):**
- https://bcrypt-generator.com/

---

## Remote Directory API Contract

The OIDC Provider communicates with external directory services via a simple HTTP API. Implement these endpoints to integrate your own user directory.

### API Overview

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/count` | GET | Get total user count |
| `/find/:id` | GET | Find user by ID or email |
| `/validate` | POST | Validate credentials |
| `/healthz` | GET | Health check |

### Authentication

All requests must include a bearer token in the `Authorization` header:

```http
Authorization: ******
```

Configure the token in the OIDC Provider:

```yaml
environment:
  DIRECTORY_TYPE: remote
  DIRECTORY_BASE_URL: http://directory:5000
  DIRECTORY_HEADERS: '{"Authorization":"******"}'
```

---

### Endpoint Specifications

#### 1. GET /count

Returns the total number of active users in the directory.

**Request:**
```http
GET /count HTTP/1.1
Host: directory.example.com
Authorization: ******
```

**Response (Success - 200 OK):**
```json
{
  "count": 42
}
```

**Response (Error - 401 Unauthorized):**
```json
{
  "error": "Invalid or missing authorization token"
}
```

**Response (Error - 500 Internal Server Error):**
```json
{
  "error": "Database connection failed"
}
```

**Implementation Example (Node.js/Express):**
```javascript
app.get('/count', authenticateToken, async (req, res) => {
  try {
    const count = await db.users.count({ where: { active: true } });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

#### 2. GET /find/:id

Finds and returns a user by ID or email address.

**Request:**
```http
GET /find/8276bb5b-d0b7-41e9-a805-77b62a2865f4 HTTP/1.1
Host: directory.example.com
Authorization: ******
```

Or by email:
```http
GET /find/user@example.com HTTP/1.1
Host: directory.example.com
Authorization: ******
```

**Response (Success - 200 OK):**
```json
{
  "id": "8276bb5b-d0b7-41e9-a805-77b62a2865f4",
  "email": "user@example.com",
  "email_verified": true,
  "name": "John Doe",
  "given_name": "John",
  "family_name": "Doe",
  "middle_name": "Michael",
  "nickname": "Johnny",
  "preferred_username": "johnny",
  "picture": "https://example.com/avatar.jpg",
  "profile": "https://example.com/profile",
  "website": "https://example.com",
  "gender": "male",
  "birthdate": "1987-10-16",
  "zoneinfo": "Europe/Berlin",
  "locale": "en-US",
  "phone_number": "+1-555-0123",
  "phone_number_verified": true,
  "updated_at": 1704067200,
  "address": {
    "formatted": "123 Main Street, Berlin, 10115, Germany",
    "street_address": "123 Main Street",
    "locality": "Berlin",
    "region": "Berlin",
    "postal_code": "10115",
    "country": "Germany"
  },
  "groups": ["admin", "developers"],
  "roles": ["user", "editor"]
}
```

**Response (Not Found - 404):**
```json
{
  "error": "User not found"
}
```

**Important Notes:**
- Password field MUST be excluded from the response
- Support both UUID lookup and email lookup
- Include all OpenID Connect standard claims
- Include custom claims like `groups` and `roles` if applicable

**Implementation Example (Node.js/Express):**
```javascript
app.get('/find/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try to find by ID first
    let user = await db.users.findByPk(id);
    
    // Fallback: try by email
    if (!user && id.includes('@')) {
      user = await db.users.findOne({ where: { email: id } });
    }
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Remove password from response
    const { password, ...userWithoutPassword } = user.toJSON();
    
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

#### 3. POST /validate

Validates user credentials (email and password).

**Request:**
```http
POST /validate HTTP/1.1
Host: directory.example.com
Authorization: ******
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "UserPassword123"
}
```

**Response (Valid Credentials - 200 OK):**
```json
{
  "valid": true,
  "user": {
    "id": "8276bb5b-d0b7-41e9-a805-77b62a2865f4",
    "email": "user@example.com",
    "email_verified": true,
    "name": "John Doe",
    "given_name": "John",
    "family_name": "Doe",
    "groups": ["admin"],
    "roles": ["user", "editor"]
  }
}
```

**Response (Invalid Credentials - 400 Bad Request):**
```json
{
  "valid": false
}
```

**Response (Missing Fields - 400 Bad Request):**
```json
{
  "error": "Email and password required"
}
```

**Important Notes:**
- Always use secure password comparison (e.g., bcrypt)
- Implement timing attack prevention (constant-time comparison)
- Never return passwords in the response
- Return `valid: false` without specific error details (security)

**Implementation Example (Node.js/Express):**
```javascript
const bcrypt = require('bcrypt');

app.post('/validate', authenticateToken, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Find user
    const user = await db.users.findOne({ where: { email, active: true } });
    
    if (!user) {
      return res.json({ valid: false });
    }
    
    // Verify password
    const valid = await bcrypt.compare(password, user.password_hash);
    
    if (!valid) {
      return res.status(400).json({ valid: false });
    }
    
    // Remove password from response
    const { password_hash, ...userWithoutPassword } = user.toJSON();
    
    res.json({
      valid: true,
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

#### 4. GET /healthz

Health check endpoint for monitoring and load balancers.

**Request:**
```http
GET /healthz HTTP/1.1
Host: directory.example.com
Authorization: ******
```

**Response (Healthy - 200 OK):**
```json
{
  "status": "healthy",
  "user_count": 42
}
```

**Response (Unhealthy - 500 Internal Server Error):**
```json
{
  "status": "unhealthy",
  "error": "Database connection failed"
}
```

**Implementation Example (Node.js/Express):**
```javascript
app.get('/healthz', authenticateToken, async (req, res) => {
  try {
    // Test database connection
    const count = await db.users.count();
    
    res.json({
      status: 'healthy',
      user_count: count
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

---

## Quick Start Examples

### Example 1: Local JSON Directory

**1. Create users.json:**
```json
[
  {
    "id": "user-1",
    "email": "admin@example.com",
    "password": "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
    "name": "Admin User",
    "given_name": "Admin",
    "family_name": "User"
  }
]
```

**2. Configure provider:**
```yaml
# docker-compose.yml
services:
  provider:
    image: plainscope/simple-oidc-provider
    environment:
      DIRECTORY_TYPE: local
      DIRECTORY_USERS_FILE: /app/config/users.json
    volumes:
      - ./users.json:/app/config/users.json:ro
```

**3. Start:**
```bash
docker-compose up
```

---

### Example 2: SQLite Directory with Seeding

**1. Create users.json (for seeding):**
```json
[
  {
    "id": "user-1",
    "email": "admin@localhost",
    "password": "AdminPassword123",
    "name": "Admin User"
  }
]
```

**2. Configure provider:**
```yaml
# docker-compose.yml
services:
  provider:
    image: plainscope/simple-oidc-provider
    environment:
      DIRECTORY_TYPE: sqlite
      DIRECTORY_DATABASE_FILE: /data/users.db
      DIRECTORY_USERS_FILE: /app/config/users.json
    volumes:
      - ./users.json:/app/config/users.json:ro
      - ./data:/data
```

**3. Start:**
```bash
docker-compose up
```

The database will be automatically:
- Created with complete schema
- Seeded with users from users.json
- Passwords will be bcrypt hashed
- Admin user will get admin role

**4. Access management UI:**
```
http://localhost:8080/mgmt
```

---

### Example 3: Remote Directory Service

**1. Implement directory service:**

```javascript
// directory-service.js
const express = require('express');
const bcrypt = require('bcrypt');
const app = express();

app.use(express.json());

// Bearer token authentication
const BEARER_TOKEN = process.env.BEARER_TOKEN || 'your-secret-token';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.replace('******', '');
  
  if (token !== BEARER_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
}

// Mock database (replace with real database)
const users = [
  {
    id: 'user-1',
    email: 'admin@example.com',
    password_hash: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    name: 'Admin User',
    email_verified: true
  }
];

app.get('/count', authenticateToken, (req, res) => {
  res.json({ count: users.length });
});

app.get('/find/:id', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.params.id || u.email === req.params.id);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const { password_hash, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

app.post('/validate', authenticateToken, async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  
  const user = users.find(u => u.email === email);
  
  if (!user) {
    return res.json({ valid: false });
  }
  
  const valid = await bcrypt.compare(password, user.password_hash);
  
  if (!valid) {
    return res.status(400).json({ valid: false });
  }
  
  const { password_hash, ...userWithoutPassword } = user;
  res.json({ valid: true, user: userWithoutPassword });
});

app.get('/healthz', authenticateToken, (req, res) => {
  res.json({ status: 'healthy', user_count: users.length });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Directory service listening on port ${PORT}`);
});
```

**2. Start directory service:**
```bash
BEARER_TOKEN=my-secret-token node directory-service.js
```

**3. Configure OIDC provider:**
```yaml
# docker-compose.yml
services:
  directory:
    build: ./directory-service
    environment:
      PORT: 5000
      BEARER_TOKEN: my-secret-token
  
  provider:
    image: plainscope/simple-oidc-provider
    environment:
      DIRECTORY_TYPE: remote
      DIRECTORY_BASE_URL: http://directory:5000
      DIRECTORY_HEADERS: '{"Authorization":"******"}'
    depends_on:
      - directory
```

---

## Integration Patterns

### Pattern 1: Development (Local JSON)

**Use Case:** Local development, testing, small deployments

```yaml
environment:
  DIRECTORY_TYPE: local
  DIRECTORY_USERS_FILE: /app/config/users.json
```

**Pros:**
- Simplest setup
- No dependencies
- Version control friendly
- Fast

**Cons:**
- Manual password hashing
- No dynamic updates
- Limited to basic user data

---

### Pattern 2: Self-Hosted (SQLite)

**Use Case:** Self-hosted deployments, small to medium teams

```yaml
environment:
  DIRECTORY_TYPE: sqlite
  DIRECTORY_DATABASE_FILE: /data/users.db
  DIRECTORY_USERS_FILE: /app/config/users.json  # Optional, for initial seeding
```

**Pros:**
- Structured data (roles, groups, multiple emails)
- Built-in management UI at `/mgmt`
- Automatic password hashing
- Audit logging
- No external dependencies

**Cons:**
- Single-server only
- Requires database management

---

### Pattern 3: Enterprise (Remote Directory)

**Use Case:** Enterprise deployments, integration with existing systems

```yaml
environment:
  DIRECTORY_TYPE: remote
  DIRECTORY_BASE_URL: http://directory:5000
  DIRECTORY_HEADERS: '{"Authorization":"******"}'
```

**Pros:**
- Centralized user management
- Scalable
- Can integrate with AD/LDAP
- Multiple providers can share directory
- Custom backend (PostgreSQL, MongoDB, etc.)

**Cons:**
- More complex setup
- Network dependency
- Requires separate service

---

## Testing Your Integration

### Test Local JSON Directory

```bash
# Start provider
docker run -p 8080:8080 \
  -e DIRECTORY_TYPE=local \
  -e DIRECTORY_USERS_FILE=/app/config/users.json \
  -v ./users.json:/app/config/users.json:ro \
  plainscope/simple-oidc-provider

# Test login
curl -X POST http://localhost:8080/interaction/xyz/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=admin@example.com&password=YourPassword"
```

### Test SQLite Directory

```bash
# Start provider
docker run -p 8080:8080 \
  -e DIRECTORY_TYPE=sqlite \
  -e DIRECTORY_DATABASE_FILE=/data/users.db \
  -v ./data:/data \
  plainscope/simple-oidc-provider

# Access management UI
open http://localhost:8080/mgmt

# Login with admin credentials
```

### Test Remote Directory

```bash
# Test count endpoint
curl http://localhost:5000/count \
  -H "Authorization: ******"

# Test find endpoint
curl http://localhost:5000/find/user@example.com \
  -H "Authorization: ******"

# Test validate endpoint
curl -X POST http://localhost:5000/validate \
  -H "Authorization: ******" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Test health endpoint
curl http://localhost:5000/healthz \
  -H "Authorization: ******"
```

---

## Troubleshooting

### Common Issues

**1. "User not found" error**
- Check user exists in directory
- Verify email address is correct
- Check user is marked as active

**2. "Invalid credentials" error**
- Verify password is correct
- For SQLite: ensure password is bcrypt hashed
- Check password starts with `$2a$`, `$2b$`, or `$2y$`

**3. "Unauthorized" error (remote directory)**
- Verify bearer token matches
- Check `DIRECTORY_HEADERS` is properly formatted JSON
- Ensure token is in Authorization header

**4. "Database not seeded"**
- Check `DIRECTORY_USERS_FILE` path is correct
- Verify users.json is valid JSON
- Check file permissions (readable)
- View logs for seeding errors

---

## Next Steps

- [SQLite Directory Guide](sqlite-directory.md)
- [Management UI Documentation](management-ui.md)
- [Directory Comparison Guide](directory-comparison.md)
- [Security Best Practices](../security.md)
