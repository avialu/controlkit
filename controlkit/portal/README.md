# ControlKit Portal

React + Vite + TypeScript dashboard for managing projects, API keys, feature flags, remote config values, and viewing audit logs.

## Run it

```bash
cd controlkit/portal
npm install
cp .env.example .env   # then edit VITE_API_URL if backend is not on :4000
npm run dev
```

Open http://localhost:5173.

## What you can do

- **Dashboard** – per-environment counts and a live preview of the JSON the SDK would receive.
- **Projects** – create projects and generate API keys (one per environment).
- **Feature Flags** – list / add / edit / toggle / delete flags for the selected (project, environment).
- **Remote Config** – list / add / edit / delete config values. Supports `string`, `int`, `boolean`, `json` types.
- **Audit Logs** – the most recent 200 audit entries, with old/new diffs.

The current "user" name shown in the top-right is stored in `localStorage` and sent as `userName` on every mutation so it appears in the audit log. There's no real auth in the MVP, intentionally.

## Folder structure

```text
src/
  main.tsx              # boots React + Router
  App.tsx               # layout + nav + topbar (project / env / user)
  api/
    client.ts           # fetch wrapper around the backend
    types.ts            # shared TypeScript types
  state/
    AppContext.tsx      # selected project + env + user name (Context)
  pages/
    Dashboard.tsx
    Projects.tsx
    Flags.tsx
    Config.tsx
    AuditLogs.tsx
  components/
    DataTable.tsx
    Modal.tsx
    EnvPicker.tsx
    ProjectPicker.tsx
  styles.css            # one stylesheet for the whole portal
```
