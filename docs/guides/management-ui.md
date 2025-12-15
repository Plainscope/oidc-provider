# SQLite Directory Management UI

## Overview

The OIDC Provider now includes a comprehensive management UI for the SQLite directory, accessible at `/directory` when using `DIRECTORY_TYPE=sqlite`.

## Features

### 🔐 Secure Authentication

- Admin-only access with role validation
- Session management with httpOnly cookies
- Secure password validation via directory service
- Auto-logout after 1 hour of inactivity

### 📊 Dashboard

- Real-time statistics: users, roles, groups, domains
- Quick action buttons for common tasks
- Modern, responsive design

### 👥 User Management

- List all users with status, email, and creation date
- Detailed user profiles showing:
  - Basic information (username, name, domain)
  - Email addresses (primary, verified status)
  - Assigned roles
  - Group memberships
  - Custom properties

### 🛡️ Roles & Groups

- View all roles with user counts
- View all groups with domain and user counts
- Track assignments and memberships

### 🔒 Security Measures

1. **Authentication**:
   - Requires valid credentials via directory service
   - Admin role required for access
   - Session-based authentication

2. **Input Sanitization**:
   - All inputs validated and sanitized using validator.js
   - Maximum input length enforcement
   - SQL injection protection via prepared statements

3. **Cookie Security**:
   - HttpOnly cookies (JavaScript cannot access)
   - Secure flag in production (HTTPS only)
   - SameSite=Strict (CSRF protection)
   - 1-hour expiration

4. **Session Management**:
   - In-memory session store
   - Automatic session expiration
   - Session refresh on activity

## Usage

### Access the Management UI

1. **Start provider with SQLite directory**:

   ```bash
   docker run -p 8080:8080 \
     -e DIRECTORY_TYPE=sqlite \
     -e DIRECTORY_DATABASE_FILE=/data/users.db \
     -v ./data:/data \
     plainscope/simple-oidc-provider
   ```

2. **Navigate to management UI**:

   ```
   http://localhost:8080/directory
   ```

3. **Login with admin credentials**:
   - Email: `admin@localhost`
   - Password: Your admin password from users.json
   - Must have `admin` role assigned

### First-Time Setup

The database is automatically seeded on first run if:

- Database file doesn't exist, OR
- Database file is empty

Seeding process:

1. Creates schema (users, roles, groups, domains, etc.)
2. Creates default domain: `localhost`
3. Creates default roles: `admin`, `user`, `guest`
4. Imports users from `users.json` if `DIRECTORY_USERS_FILE` is set
5. Assigns roles: `admin@localhost` gets `admin` role, others get `user` role

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DIRECTORY_TYPE` | Set to `sqlite` | `local` |
| `DIRECTORY_DATABASE_FILE` | Path to SQLite database | `data/users.db` |
| `DIRECTORY_USERS_FILE` | Path to users.json for seeding | Not set |

## Pages

### 1. Login Page (`/directory/login`)

- Clean, modern login form
- Error message display
- Gradient background
- Mobile-responsive

### 2. Dashboard (`/directory`)

- Statistics cards: users, roles, groups, domains
- Quick action buttons
- Feature overview
- Navigation menu

### 3. Users List (`/directory/users`)

- Table with all users
- Status badges (active/inactive)
- Email addresses
- Creation dates
- View detail buttons

### 4. User Detail (`/directory/users/:id`)

- Complete user profile
- Multiple email addresses
- Role assignments
- Group memberships
- Custom properties
- Domain information

### 5. Roles (`/directory/roles`)

- List of all roles
- Descriptions
- User counts
- Creation dates

### 6. Groups (`/directory/groups`)

- List of all groups
- Domain associations
- User counts
- Creation dates

## UI Design

### Color Scheme

- Primary: `#667eea` (purple-blue gradient)
- Secondary: `#e2e8f0` (light gray)
- Success: `#c6f6d5` (green)
- Error: `#fed7d7` (red)

### Typography

- Font: System font stack (San Francisco, Segoe UI, Roboto)
- Modern, clean, readable

### Components

- Cards with shadows and hover effects
- Responsive tables
- Badge components for status
- Gradient buttons with hover animations

## Security Best Practices

1. **Access Control**:
   - Always verify admin role before granting access
   - Implement audit logging for admin actions

2. **Database Security**:
   - Database file should have restricted permissions (600 or 640)
   - Store database outside web-accessible directories
   - Regular backups

3. **Session Security**:
   - Sessions expire after 1 hour
   - Logout clears cookies
   - No persistent sessions

4. **Production Deployment**:
   - Enable HTTPS
   - Set `NODE_ENV=production`
   - Use strong admin passwords
   - Restrict network access to management UI

## Example docker-compose.yml

```yaml
services:
  provider:
    image: plainscope/simple-oidc-provider
    ports:
      - "8080:8080"
    environment:
      NODE_ENV: production
      ISSUER: https://oidc.example.com
      CLIENT_ID: your-client-id
      CLIENT_SECRET: your-client-secret
      REDIRECT_URIS: https://app.example.com/callback
      
      # SQLite Directory Configuration
      DIRECTORY_TYPE: sqlite
      DIRECTORY_DATABASE_FILE: /data/users.db
      DIRECTORY_USERS_FILE: /app/config/users.json
    volumes:
      - ./data:/data
      - ./users.json:/app/config/users.json:ro
```

## Troubleshooting

### Cannot Access Management UI

- Check `DIRECTORY_TYPE` is set to `sqlite`
- Verify database file exists and has data
- Check admin user has `admin` role

### Login Fails

- Verify credentials are correct
- Check user has `admin` role assigned
- Ensure database is not corrupted

### Database Not Seeding

- Check `DIRECTORY_USERS_FILE` path is correct
- Verify users.json format is valid
- Check file permissions and accessibility

## Future Enhancements

Potential features for future versions:

- User creation/editing via UI
- Role and group management
- Bulk user import
- Audit log viewer
- Password reset functionality
- Email verification management
- Custom property editor

## Screenshots

The management UI features:

1. **Login Page**: Secure, modern login with gradient background
2. **Dashboard**: Statistics cards and quick actions
3. **Users List**: Comprehensive table with status indicators
4. **User Detail**: Complete profile with all associations
5. **Roles/Groups**: Management views for access control

All pages feature:

- Responsive design (mobile-friendly)
- Modern styling with shadows and animations
- Intuitive navigation
- Clear information hierarchy
- Professional appearance
