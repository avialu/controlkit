# ControlKit Backend

Express + PostgreSQL backend for ControlKit — a remote feature flag and remote configuration platform.

It exposes two surface areas:

- `GET /sdk/config` – called by the Android SDK. One request, one bundled JSON document. Serves the **latest published** snapshot for the key's environment (see [Release workflow](#release-workflow)).
- `/portal/*` – CRUD + release endpoints used by the React developer portal.

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
Rate limit: 60 requests/min per IP (`RateLimit-*` headers; `429` on exceed).

Returns the **latest published** snapshot for the key's environment. Draft edits made in the portal are not served until they are published. For a brand-new project with no published version yet, the endpoint falls back to the live (draft) tables so the SDK isn't stuck on empty config; once you publish for the first time, the gate is enforced.

### Sample response

```json
{
  "version": 1,
  "environment": "production",
  "features": {
    "dark_mode": false,
    "new_version_available": false,
    "show_promo_banner": true,
    "show_buy_button": true
  },
  "config": {
    "welcome_text": "ControlKit Store",
    "promo_text": "🔥 Summer sale — up to 40% off!",
    "update_message": "Version 2.0 is here — faster and smoother.",
    "max_items": 8
  }
}
```

`version` is the number of the published snapshot being served (per environment). It is bumped only when you **publish**, **promote**, or **rollback** — editing a flag or config value creates a draft and does *not* change the served `version`. The SDK can compare it against its cache to decide whether to update.

## Release workflow

The portal's `flags` and `config_values` tables are **drafts**. Edits to them (create / update / delete) are recorded in the audit log but are *not* visible to the SDK. To release the current draft state you publish it, which captures an immutable snapshot into `config_versions` and marks it as the served version.

| Endpoint | What it does |
| --- | --- |
| `GET /portal/draft-status?projectId=&environment=` | Returns `{ publishedVersion, draftCount }` — `draftCount` is the number of flags/config keys whose live value differs from the last published snapshot (added, removed, or changed; net diff, so toggling a flag on then off again is 0). |
| `GET /portal/versions?projectId=&environment=&publishedOnly=true&limit=` | Lists versions (newest first). |
| `GET /portal/versions/:id` | Returns one version including its full `snapshot`. |
| `POST /portal/publish` | Body `{ projectId, environment, note, userName }`. A non-empty `note` is required. Snapshots the current draft state, bumps the version, marks it published. |
| `POST /portal/promote` | Body `{ sourceVersionId, targetEnvironment, note?, userName }`. Copies a published version's snapshot into another environment (additive upsert — existing keys overwritten, keys absent from the snapshot left untouched) and publishes it there. |
| `POST /portal/rollback` | Body `{ sourceVersionId, note?, userName }`. Restores an earlier published version in the **same** environment by re-applying its snapshot and publishing a new version. Additive, like promote; nothing is deleted. Refuses to roll back to the currently-served version. |

Publish, promote, and rollback are all recorded in the audit log (`entityType: 'version'`).

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

# Toggle a flag (replace :id). This edits the DRAFT only — the SDK won't
# see it until you publish (see below).
curl -s -X PUT "$BASE/portal/flags/<flag-id>" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false, "userName": "alice"}' | jq

# How many unpublished changes are pending for this env?
curl -s "$BASE/portal/draft-status?projectId=<project-id>&environment=production" | jq

# Publish the current draft state → this is what makes the SDK pick it up
curl -s -X POST "$BASE/portal/publish" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "<project-id>",
    "environment": "production",
    "note": "Disable promo banner",
    "userName": "alice"
  }' | jq

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
- Flag/config edits are **drafts**; only publish/promote/rollback write a new `config_versions` row (all via `versionsService.bumpVersion`). The SDK always reads the latest *published* version, so there's a single number to look at and editing in the portal never affects live traffic until you choose to publish.
- All mutations go through `auditService.record`, so the `/portal/audit-logs` view stays complete by construction.
- The `/sdk/config` route is rate limited to 60 requests/min per IP.
