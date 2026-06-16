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
  action: 'create' | 'update' | 'delete';
  old_value: unknown;
  new_value: unknown;
  user_name: string | null;
  timestamp: string;
}
