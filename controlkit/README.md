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

1. **Backend**

   ```bash
   cd backend
   cp .env.example .env       # set DATABASE_URL
   createdb controlkit
   npm install
   npm run migrate
   npm run seed               # prints production + staging API keys
   npm run dev                # http://localhost:4000
   ```

2. **Portal**

   ```bash
   cd ../portal
   cp .env.example .env       # default points at localhost:4000
   npm install
   npm run dev                # http://localhost:5173
   ```

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
   - Tap **Refresh** in the demo app — it pulls the latest config.
   - In the portal, toggle the `new_home` flag → tap Refresh in the demo → the home screen swaps from list to grid.
   - Change `welcome_text` or `max_items` → tap Refresh → the demo reflects the new values.
   - Open the demo's **Debug** screen to see the live JSON.
   - Open **Audit Logs** in the portal — every change is recorded with the user name and a diff.

## Design notes

- **One bundled SDK endpoint.** The SDK calls `GET /sdk/config` once and gets a full document: `{ version, environment, features, config }`. No per-flag round trips. This is the single most important backend design decision in the project.
- **Per-environment version.** Any flag/config mutation bumps `config_versions` for the affected environment. The SDK exposes `ControlKit.version()` so future work can decide whether to skip a fetch.
- **Audit everywhere.** Every mutation goes through `auditService.record` — the audit log is complete by construction.
- **Cache-first SDK.** On `init` the SDK loads its SharedPreferences cache synchronously. The very first read after a relaunch already returns real data; the network is only a freshness mechanism.
- **No premature auth.** Portal endpoints are unauthenticated and the portal passes a `userName` field with every write so audit logs are still meaningful. A real auth layer is a clean follow-up.

## MVP scope — explicitly out of scope

- A/B testing & percentage rollouts
- Billing
- Multi-tenant permissions
- Push notifications to invalidate the SDK cache
- Analytics dashboard
- Production auth (JWT, sessions, OAuth)

These can sit on top of the same data model without restructuring it.
