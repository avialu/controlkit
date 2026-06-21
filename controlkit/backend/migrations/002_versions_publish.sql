-- Adds snapshot / note / is_published / user_name to config_versions so the
-- portal can show a true version history and the new POST /portal/publish
-- endpoint can tag explicit releases.

ALTER TABLE config_versions
    ADD COLUMN IF NOT EXISTS snapshot     JSONB,
    ADD COLUMN IF NOT EXISTS note         VARCHAR(500),
    ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS user_name    VARCHAR(200);

CREATE INDEX IF NOT EXISTS idx_versions_published
    ON config_versions(project_id, environment, is_published, version DESC);
