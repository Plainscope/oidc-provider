# Environment variables

### CLIENT_SECRET

- **Example (production)**: generate with `openssl rand -hex 32`
- **Example (local only)**: `local-dev-secret`
- Known development placeholders are rejected when `NODE_ENV=production`.

### CLIENT_ID

- Local/test default: `test-client-id` or `local-dev`
