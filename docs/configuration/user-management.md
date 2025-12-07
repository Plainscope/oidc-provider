# User Management

Guide for managing user authentication and profiles in the OIDC provider.

## User Storage

The OIDC provider stores user data in a JSON file format. This file contains user credentials, profile information, and authentication state.

### Default User Database

Located at `/app/dist/users.json` (inside container).

Mount your own file:

```bash
docker run -d \
  -v /path/to/users.json:/app/dist/users.json:ro \
  docker.io/plainscope/simple-oidc-provider
```

Or in Docker Compose:

```yaml
services:
  oidc-provider:
    volumes:
      - ./users.json:/app/dist/users.json:ro
```

## User Data Structure

### Complete User Object

```json
{
  "id": "8276bb5b-d0b7-41e9-a805-77b62a2865f4",
  "email": "user@example.com",
  "password": "hashed-password-here",
  "preferred_username": "john.doe",
  "given_name": "John",
  "family_name": "Doe",
  "name": "John Doe",
  "middle_name": "Michael",
  "nickname": "Johnny",
  "picture": "https://example.com/avatar.jpg",
  "profile": "https://example.com/profile",
  "website": "https://example.com",
  "gender": "male",
  "birthdate": "1990-01-15",
  "zoneinfo": "America/New_York",
  "locale": "en-US",
  "updated_at": 1704067200,
  "email_verified": true,
  "phone_number": "+1-555-1234",
  "phone_number_verified": true,
  "address": {
    "formatted": "123 Main Street, Anytown, ST 12345, USA",
    "street_address": "123 Main Street",
    "locality": "Anytown",
    "region": "ST",
    "postal_code": "12345",
    "country": "USA"
  }
}
```

### Minimal User Object

```json
{
  "id": "user-1",
  "email": "user@example.com",
  "password": "hashed-password"
}
```

## Required Fields

- **id**: Unique identifier (UUID recommended)
- **email**: User email address
- **password**: Hashed password (bcrypt or similar recommended)

## OpenID Connect Standard Claims

### Core Claims

| Claim | Type | Description | Example |
|-------|------|-------------|---------|
| `sub` | String | Subject (user ID) | User identifier |
| `iss` | String | Issuer | <https://oidc.example.com> |
| `aud` | String | Audience | Client ID |

### Profile Claims

| Claim | Type | Description | Example |
|-------|------|-------------|---------|
| `name` | String | Full name | John Doe |
| `given_name` | String | First name | John |
| `family_name` | String | Last name | Doe |
| `middle_name` | String | Middle name | Michael |
| `nickname` | String | Nickname | Johnny |
| `preferred_username` | String | Preferred username | john.doe |
| `profile` | String (URL) | Profile URL | <https://example.com/profile> |
| `picture` | String (URL) | Profile picture | <https://example.com/photo.jpg> |
| `website` | String (URL) | Website URL | <https://example.com> |
| `gender` | String | Gender | male, female, other |
| `birthdate` | String (YYYY-MM-DD) | Birth date | 1990-01-15 |
| `zoneinfo` | String | Timezone | America/New_York |
| `locale` | String | Preferred locale | en-US |
| `updated_at` | Number (Unix) | Last update time | 1704067200 |

### Email Claims

| Claim | Type | Description |
|-------|------|-------------|
| `email` | String | Email address |
| `email_verified` | Boolean | Email verified |

### Phone Claims

| Claim | Type | Description |
|-------|------|-------------|
| `phone_number` | String | Phone number |
| `phone_number_verified` | Boolean | Phone verified |

### Address Claims

| Claim | Type | Description |
|-------|------|-------------|
| `address` | Object | Full address object |
| `address.formatted` | String | Formatted address |
| `address.street_address` | String | Street |
| `address.locality` | String | City |
| `address.region` | String | State/Region |
| `address.postal_code` | String | ZIP code |
| `address.country` | String | Country |

## Password Management

### Hashing Passwords

Never store passwords in plain text. Use bcrypt:

```bash
# Generate bcrypt hash
npm install bcrypt
node -e "require('bcrypt').hash('password123', 10, (err, hash) => console.log(hash))"
```

Or use online tools for testing:

- <https://bcrypt-generator.com/>

### Example: Create Hashed Password

```bash
# Using bcrypt CLI
npm install -g bcrypt-cli
bcrypt "MyPassword123" 10
# Output: $2a$10$abcd1234...

# Using Python
python3 -c "import bcrypt; print(bcrypt.hashpw(b'MyPassword123', bcrypt.gensalt(10)).decode())"
```

### Password Requirements

Best practices:

- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, special characters
- No dictionary words
- Never reuse passwords
- Change password at least annually

## Creating a users.json File

### Basic Template

```json
[
  {
    "id": "8276bb5b-d0b7-41e9-a805-77b62a2865f4",
    "email": "admin@localhost",
    "password": "$2a$10$abcd1234....",
    "given_name": "John",
    "family_name": "Doe",
    "name": "John Doe",
    "preferred_username": "admin"
  },
  {
    "id": "92a93c6d-1234-5678-9abc-def012345678",
    "email": "user@example.com",
    "password": "$2a$10$xyz9876....",
    "given_name": "Jane",
    "family_name": "Smith",
    "name": "Jane Smith",
    "preferred_username": "jane.smith"
  }
]
```

### Complete Example

```json
[
  {
    "id": "8276bb5b-d0b7-41e9-a805-77b62a2865f4",
    "email": "admin@localhost",
    "password": "$2a$10$abcd1234...",
    "given_name": "John",
    "family_name": "Doe",
    "name": "John Doe",
    "middle_name": "Michael",
    "nickname": "Johnny",
    "preferred_username": "johnny",
    "email_verified": true,
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
    }
  }
]
```

## User Authentication Flow

### Login Process

1. User accesses application
2. Application redirects to OIDC provider
3. Provider shows login page
4. User enters email and password
5. Provider validates credentials against users.json
6. If valid, user is authenticated
7. Provider shows consent screen (if configured)
8. User grants permissions
9. Provider issues authentication code
10. Application exchanges code for tokens
11. User is logged in

### Credential Validation

The provider validates credentials by:

1. Looking up user by email in users.json
2. Comparing entered password with stored hash
3. Returning user profile if credentials valid
4. Rejecting if user not found or password invalid

## Managing Users

### Add a New User

1. Generate password hash:

```bash
node -e "require('bcrypt').hash('NewPassword123', 10, (err, hash) => console.log(hash))"
```

2. Add to users.json:

```json
{
  "id": "unique-user-id",
  "email": "newuser@example.com",
  "password": "$2a$10/hash...",
  "given_name": "New",
  "family_name": "User",
  "name": "New User"
}
```

3. Update mounted volume:

```bash
docker cp users.json container_name:/app/dist/users.json
docker restart container_name
```

### Update User Profile

Edit users.json and update the desired fields:

```json
{
  "id": "user-1",
  "email": "user@example.com",
  "password": "$2a$10/hash...",
  "given_name": "Updated",
  "family_name": "Name",
  "picture": "https://example.com/new-photo.jpg"
}
```

### Change User Password

1. Generate new hash for new password
2. Update the `password` field
3. Restart provider

### Remove a User

Delete the user object from users.json array:

```json
[
  {
    "id": "user-1",
    "email": "keeper@example.com",
    "password": "$2a$10/hash..."
  }
  // User to remove deleted
]
```

## Custom User Attributes

Add custom fields to user objects:

```json
{
  "id": "user-1",
  "email": "user@example.com",
  "password": "$2a$10/hash...",
  "department": "Engineering",
  "team": "Backend",
  "costCenter": "CC-12345",
  "customAttribute": "customValue"
}
```

Then map to claims in configuration:

```bash
CLAIMS='{
  "profile": ["name", "department", "team"],
  "custom": ["costCenter", "customAttribute"]
}'
```

## User Data Export

Export user data for backup or migration:

```bash
# Copy from container
docker cp oidc-provider:/app/dist/users.json users-backup.json

# Or from volume
cat /var/lib/docker/volumes/volume-name/_data/users.json > backup.json
```

## User Data Privacy

### Data Retention

Plan for user data retention:

- Regularly backup user data
- Archive old data as needed
- Implement deletion policies

### GDPR Compliance

For GDPR compliance:

- Implement data export endpoint
- Implement account deletion
- Log all data processing
- Obtain explicit consent
- Track consent history

## User Groups and Roles

Add custom groups/roles field:

```json
{
  "id": "user-1",
  "email": "user@example.com",
  "password": "$2a$10/hash...",
  "groups": ["admin", "developers"],
  "roles": ["editor", "reviewer"]
}
```

Request in scopes:

```bash
SCOPES=openid,profile,email,groups
CLAIMS='{
  "profile": ["name", "groups", "roles"]
}'
```

## Testing Users

### Test with Demo App

1. Start provider with docker-compose
2. Login with provided test user
3. Verify profile information in consent screen

### Manual Testing

```bash
# Get authorization code
curl -X GET "http://localhost:8080/auth?client_id=test-client&response_type=code&scope=openid+profile&redirect_uri=http://localhost:3000/callback&state=123"

# Manually enter credentials on login page
# Email: admin@localhost
# Password: Rays-93-Accident

# Exchange code for token
curl -X POST http://localhost:8080/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -u "test-client:test-secret" \
  -d "grant_type=authorization_code&code=CODE&redirect_uri=http://localhost:3000/callback"
```

## Scaling to Database

For production with many users:

1. Implement database backend (PostgreSQL, MongoDB, etc.)
2. Modify `profile.ts` to query database
3. Move away from JSON file storage
4. Implement database migrations

Example structure:

```typescript
// Query database instead of JSON
async findAccount(ctx, id) {
  const user = await database.users.findById(id);
  return user;
}
```
