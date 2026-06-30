# ControlKit Portal

React + Vite + TypeScript dashboard for managing projects, API keys, feature flags, remote config values, releases, and audit logs.

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
- **Versions** – browse published releases (newest first), view a release's snapshot and diff vs. the previous one, **promote** a release to another environment, and **rollback** to an earlier release.
- **Audit Logs** – the most recent 200 audit entries, with old/new diffs.

## Drafts and publishing

Edits on the **Feature Flags** and **Remote Config** pages are **drafts** — they're saved and audited but the SDK keeps serving the last *published* release. Each of those pages (and the Versions page) shows a **publish bar** at the top:

- "**N pending changes** since the last release (vX). SDK is still serving vX." with an enabled **Publish** button when drafts exist.
- "**Up to date.** SDK is serving vX." when there's nothing to publish.

Clicking **Publish** asks for a release note (required), snapshots the current draft state, and cuts a new version that the SDK picks up on its next fetch. **Promote** copies a release into another environment and publishes it there; **Rollback** restores an earlier release in the same environment as a new published version.

The current "user" name shown in the top-right is stored in `localStorage` and sent as `userName` on every mutation (including publish/promote/rollback) so it appears in the audit log. There's no real auth in the MVP, intentionally.

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
    Versions.tsx          # release history + promote / rollback
    AuditLogs.tsx
  components/
    DataTable.tsx
    Modal.tsx
    EnvPicker.tsx
    ProjectPicker.tsx
    PublishBar.tsx        # draft-count banner + publish modal
  styles.css            # one stylesheet for the whole portal
```
