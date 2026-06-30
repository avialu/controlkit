# ControlKit SDK

> Remote Feature Management & Configuration Platform — course MVP.

ControlKit lets an Android app change behavior **without shipping a new release**. The app integrates the SDK, the SDK fetches one JSON document from the backend, and developers manage that document through a web portal.

## What's in this repo

```text
controlkit/
  backend/   # Node.js + Express + PostgreSQL.  REST API for the SDK and the portal.
  portal/    # React + Vite + TypeScript developer dashboard.
  android/   # Two Gradle modules:
             #   controlkit-sdk/   Kotlin Android library
             #   demo-app/         Jetpack Compose demo app that uses the SDK
```

Each folder has its own README with detailed setup.

## End-to-end demo flow

Roughly 10 minutes from clone to "the Android emulator shows new behavior when I toggle a flag in the portal".

### Daily startup (after the one-time setup below)

Everything goes through the `Makefile` at the root:

```bash
make up          # starts Postgres + backend + portal in new Terminal windows
make status      # check what's listening on :5432 / :4000 / :5173
make down        # stop everything
```

Other useful targets: `make help`, `make migrate`, `make seed`, `make reset`, `make psql`, `make install`.

### One-time setup

1. **Backend**

   ```bash
   cd backend
   cp .env.example .env       # set DATABASE_URL
   createdb controlkit
   npm install
   npm run migrate
   npm run seed               # prints production + staging API keys
   ```

2. **Portal**

   ```bash
   cd ../portal
   cp .env.example .env       # default points at localhost:4000
   npm install
   ```

   …or from the repo root, just `make install` to do both at once.

3. **Android demo**

   ```bash
   cd ../android
   cp local.properties.example local.properties
   # edit local.properties:
   #   sdk.dir=…
   #   controlkit.apiKey=ck_…   (from `npm run seed`)
   #   controlkit.baseUrl=http://10.0.2.2:4000
   #   controlkit.env=production
   ```

   Open `android/` in Android Studio and run **demo-app** on an emulator.

4. **Try it**
   - In the portal, toggle any of the four feature flags. Your edit is a **draft** — the portal shows "N pending changes" and the SDK keeps serving the last published release.
   - Click **Publish** (a release note is required). This cuts a new version that the SDK will serve.
   - The demo app polls every 5 s, so the storefront updates on its own within a few seconds (or tap **Refresh** to pull immediately):
     - `dark_mode` flips the whole app between light and dark themes.
     - `new_version_available` shows/hides the "Update available" prompt.
     - `show_promo_banner` shows/hides the marketing banner.
     - `show_buy_button` shows/hides the "Buy" button on every product.
   - Change `welcome_text`, `promo_text`, `update_message`, or `max_items` → **Publish** → the demo reflects the new values.
   - Open the **Versions** page in the portal to see the release history, diff any two releases, and **promote** or **rollback** a release.
   - Open the demo's **Debug** screen to see the live JSON.
   - Open **Audit Logs** in the portal — every change (including each publish) is recorded with the user name and a diff.

## Design notes

- **One bundled SDK endpoint.** The SDK calls `GET /sdk/config` once and gets a full document: `{ version, environment, features, config }`. No per-flag round trips. This is the single most important backend design decision in the project.
- **Draft → publish releases.** Editing a flag or config value in the portal only changes a **draft**; the SDK keeps serving the last *published* snapshot. Publishing captures the current draft state into `config_versions` and bumps that environment's version. **Promote** copies a release to another environment, **rollback** restores an earlier one — both produce new published versions. This keeps live traffic decoupled from in-progress editing.
- **Per-environment version.** Each publish/promote/rollback bumps `config_versions` for the affected environment. The SDK exposes `ControlKit.version()` so future work can decide whether to skip a fetch.
- **Audit everywhere.** Every mutation — and every publish/promote/rollback — goes through `auditService.record`, so the audit log is complete by construction.
- **Cache-first SDK.** On `init` the SDK loads its SharedPreferences cache synchronously. The very first read after a relaunch already returns real data; the network is only a freshness mechanism.
- **Two-layer background refresh.** The SDK runs an in-process coroutine timer (configurable; the default is 15 min, and the demo overrides it to 5 s for snappy foreground updates), and on top of that schedules a WorkManager `PeriodicWorkRequest` (default 30 min) that survives the app process being killed. The worker reads persisted init params from SharedPreferences and writes a fresh cache so the next launch sees recent data immediately. WorkManager's 15-minute minimum is respected; the in-process timer covers anything faster.
- **No premature auth.** Portal endpoints are unauthenticated and the portal passes a `userName` field with every write so audit logs are still meaningful. A real auth layer is a clean follow-up.

## MVP scope — explicitly out of scope

- A/B testing & percentage rollouts
- Billing
- Multi-tenant permissions
- Push notifications to invalidate the SDK cache
- Analytics dashboard
- Production auth (JWT, sessions, OAuth)

These can sit on top of the same data model without restructuring it.
