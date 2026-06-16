-- ControlKit initial schema
-- Run with: npm run migrate

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------- projects ----------
CREATE TABLE IF NOT EXISTS projects (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(200) NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---------- api_keys ----------
CREATE TABLE IF NOT EXISTS api_keys (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    key         VARCHAR(128) NOT NULL UNIQUE,
    environment VARCHAR(50)  NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_project ON api_keys(project_id);

-- ---------- flags ----------
CREATE TABLE IF NOT EXISTS flags (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        VARCHAR(200) NOT NULL,
    enabled     BOOLEAN      NOT NULL DEFAULT FALSE,
    environment VARCHAR(50)  NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, environment, name)
);

CREATE INDEX IF NOT EXISTS idx_flags_project_env ON flags(project_id, environment);

-- ---------- config_values ----------
CREATE TABLE IF NOT EXISTS config_values (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    key         VARCHAR(200) NOT NULL,
    value       TEXT         NOT NULL,
    type        VARCHAR(20)  NOT NULL CHECK (type IN ('string','int','boolean','json')),
    environment VARCHAR(50)  NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, environment, key)
);

CREATE INDEX IF NOT EXISTS idx_config_project_env ON config_values(project_id, environment);

-- ---------- config_versions ----------
CREATE TABLE IF NOT EXISTS config_versions (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version      INTEGER     NOT NULL,
    environment  VARCHAR(50) NOT NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, environment, version)
);

CREATE INDEX IF NOT EXISTS idx_versions_project_env ON config_versions(project_id, environment);

-- ---------- audit_logs ----------
CREATE TABLE IF NOT EXISTS audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id   UUID,
    action      VARCHAR(50) NOT NULL,
    old_value   JSONB,
    new_value   JSONB,
    user_name   VARCHAR(200),
    timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_project_time ON audit_logs(project_id, timestamp DESC);
