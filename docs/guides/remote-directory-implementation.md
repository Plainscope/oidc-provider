# Remote Directory Implementation

Build a directory service that the OIDC provider can call for user lookup and credential validation.

## Contract

Implement `GET /count`, `GET /find/:id`, `POST /validate`, and `GET /healthz`. Authenticate with a bearer token.

## Default users (local samples)

When shipping sample `users.json` for local demos:

- `admin@localhost` / `test-password`
- `user@localhost` / `test-password-2`

These are canonical placeholders only. See CONTRIBUTING.md.

## Minimal Node example

```javascript
const express = require('express');
const bcrypt = require('bcrypt');
const app = express();
app.use(express.json());

const BEARER_TOKEN = process.env.BEARER_TOKEN || 'local-dev-bearer-token';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (token !== BEARER_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Replace with real persistence
const users = [
  {
    id: 'user-1',
    email: 'admin@localhost',
    password_hash: bcrypt.hashSync('test-password', 10),
    name: 'Admin User',
    email_verified: true,
  },
];

app.get('/count', authenticateToken, (req, res) => {
  res.json({ count: users.length });
});

app.get('/find/:id', authenticateToken, (req, res) => {
  const user = users.find((u) => u.id === req.params.id || u.email === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password_hash, ...safe } = user;
  res.json(safe);
});

app.post('/validate', authenticateToken, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const user = users.find((u) => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(400).json({ valid: false });
  }
  const { password_hash, ...safe } = user;
  res.json({ valid: true, user: safe });
});

app.get('/healthz', authenticateToken, (req, res) => {
  res.json({ status: 'healthy', user_count: users.length });
});

app.listen(process.env.PORT || 5000);
```

## Provider wiring

```yaml
environment:
  DIRECTORY_TYPE: remote
  DIRECTORY_BASE_URL: http://directory:5000
  DIRECTORY_HEADERS: '{"Authorization":"Bearer local-dev-bearer-token"}'
```

## Security

- Use a strong bearer token outside local dev
- Never return password hashes from `/find` or `/validate`
- Prefer constant-time password comparison
