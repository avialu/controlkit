# ControlKit Backend

Express + PostgreSQL backend for ControlKit — a remote feature flag and remote configuration platform.

It exposes two surface areas:

- `GET /sdk/config` – called by the Android SDK. One request, one bundled JSON document.
- `/portal/*` – CRUD endpoints used by the React developer portal.

## Folder structure

```text
backend/
  src/
    index.js                # entry point
    app.js                  # Express app factory
    db/
      pool.js               # pg Pool
      migrate.js            # applies migrations/*.sql
      seed.js               # demo project + keys + flags + config
    middleware/             # apiKeyAuth, errorHandler, requestLogger
    services/               # projects, apiKeys, flags, config, versions, audit
    controllers/            # thin HTTP handlers
    routes/                 # sdkRoutes, portalRoutes
  migrations/
    001_init.sql
  .env.example
  package.json
```

## Quick start

```bash
# 1. install deps
cd controlkit/backend
npm install

# 2. configure environment
cp .env.example .env
# edit DATABASE_URL to point at your local Postgres

# 3. create the DB (one-time, outside the app)
createdb controlkit

# 4. apply schema
npm run migrate

# 5. seed demo data (project, API keys, flags, config)
npm run seed
# → prints the production + staging API keys. Save them.

# 6. start the server
npm run dev   # uses nodemon, restarts on changes
# or
npm start
```

Server listens on `http://localhost:4000` by default.

## SDK endpoint

`GET /sdk/config`

Authentication: header `x-api-key: ck_…` (or `?apiKey=ck_…`).
Optional query: `?environment=production`. If supplied, must match the key's env.

### Sample response

```json
{
  "version": 1,
  "environment": "production",
  "features": {
    "new_home": true,
    "checkout_v2": false,
    "show_banner": true
  },
  "config": {
    "welcome_text": "שלום",
    "max_items": 10,
    "banner_text": "Welcome to ControlKit Demo!"
  }
}
```

`version` is bumped automatically every time a flag or config value is created, updated, or deleted (per environment). The SDK can compare it against its cache to decide whether to update.

## Curl examples

Replace `KEY=ck_…` with the API key printed by `npm run seed`.

```bash
KEY=ck_REPLACE_ME
BASE=http://localhost:4000

# Fetch full SDK config
curl -s "$BASE/sdk/config" -H "x-api-key: $KEY" | jq

# List projects
curl -s "$BASE/portal/projects" | jq

# List flags in production
curl -s "$BASE/portal/flags?environment=production" | jq

# Toggle a flag (replace :id)
curl -s -X PUT "$BASE/portal/flags/<flag-id>" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false, "userName": "alice"}' | jq

# Create a new config value
curl -s -X POST "$BASE/portal/config" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "<project-id>",
    "key": "primary_color",
    "value": "#FF6600",
    "type": "string",
    "environment": "production"
  }' | jq

# View audit log
curl -s "$BASE/portal/audit-logs?limit=20" | jq
```

## Notes

- Portal endpoints are intentionally unauthenticated for the MVP — `userName` is passed in the request body and stored in `audit_logs` so we can still see who did what during the demo. Real auth (JWT, sessions) is out of scope for now.
- All flag/config mutations bump `config_versions` per environment in one place (`versionsService.bumpVersion`), so the SDK always has a single number to look at.
- All mutations go through `auditService.record`, so the `/portal/audit-logs` view stays complete by construction.
