# Remote directory

```bash
curl -X POST http://localhost:7090/validate \
  -H "Authorization: Bearer local-dev-bearer-token" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@localhost","password":"test-password"}'
```
