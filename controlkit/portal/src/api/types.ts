export type Environment = 'production' | 'staging';

export interface Project {
  id: string;
  name: string;
  created_at: string;
}

export interface ApiKey {
  id: string;
  project_id: string;
  key: string;
  environment: string;
  created_at: string;
}

export interface Flag {
  id: string;
  project_id: string;
  name: string;
  enabled: boolean;
  environment: string;
  created_at: string;
  updated_at: string;
}

export type ConfigType = 'string' | 'int' | 'boolean' | 'json';

export interface ConfigValue {
  id: string;
  project_id: string;
  key: string;
  value: string;
  type: ConfigType;
  environment: string;
  decoded_value?: unknown;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  project_id: string;
  entity_type: string;
  entity_id: string | null;
  action: 'create' | 'update' | 'delete' | 'publish' | 'promote' | 'rollback';
  old_value: unknown;
  new_value: unknown;
  user_name: string | null;
  timestamp: string;
}

export interface ConfigSnapshot {
  features: Record<string, boolean>;
  config: Record<string, unknown>;
  _meta?: { config_types?: Record<string, string> };
}

export interface DraftStatus {
  publishedVersion: number;
  draftCount: number;
}

/** Row from /portal/versions (list) — no snapshot to keep payload small. */
export interface VersionSummary {
  id: string;
  project_id: string;
  version: number;
  environment: string;
  note: string | null;
  is_published: boolean;
  user_name: string | null;
  published_at: string;
}

/** Row from /portal/versions/:id — includes the JSON snapshot. */
export interface VersionDetail extends VersionSummary {
  snapshot: ConfigSnapshot | null;
}
