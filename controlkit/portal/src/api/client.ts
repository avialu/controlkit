import type {
  ApiKey,
  AuditLog,
  ConfigType,
  ConfigValue,
  Environment,
  Flag,
  Project,
} from './types';

const BASE_URL: string = (import.meta.env.VITE_API_URL as string) || 'http://localhost:4000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(`${res.status} ${message}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export const api = {
  // ---- projects ----
  listProjects: () => request<Project[]>('/portal/projects'),
  createProject: (name: string, userName: string) =>
    request<Project>('/portal/projects', {
      method: 'POST',
      body: JSON.stringify({ name, userName }),
    }),
  listApiKeys: (projectId: string) =>
    request<ApiKey[]>(`/portal/projects/${projectId}/api-keys`),
  createApiKey: (projectId: string, environment: Environment, userName: string) =>
    request<ApiKey>(`/portal/projects/${projectId}/api-keys`, {
      method: 'POST',
      body: JSON.stringify({ environment, userName }),
    }),

  // ---- flags ----
  listFlags: (projectId: string, environment: Environment) =>
    request<Flag[]>(`/portal/flags?projectId=${projectId}&environment=${environment}`),
  createFlag: (input: {
    projectId: string;
    name: string;
    enabled: boolean;
    environment: Environment;
    userName: string;
  }) => request<Flag>('/portal/flags', { method: 'POST', body: JSON.stringify(input) }),
  updateFlag: (id: string, input: { enabled?: boolean; name?: string; userName: string }) =>
    request<Flag>(`/portal/flags/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteFlag: (id: string, userName: string) =>
    request<void>(`/portal/flags/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ userName }),
    }),

  // ---- config ----
  listConfig: (projectId: string, environment: Environment) =>
    request<ConfigValue[]>(`/portal/config?projectId=${projectId}&environment=${environment}`),
  createConfig: (input: {
    projectId: string;
    key: string;
    value: unknown;
    type: ConfigType;
    environment: Environment;
    userName: string;
  }) => request<ConfigValue>('/portal/config', { method: 'POST', body: JSON.stringify(input) }),
  updateConfig: (
    id: string,
    input: { value?: unknown; type?: ConfigType; userName: string },
  ) =>
    request<ConfigValue>(`/portal/config/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  deleteConfig: (id: string, userName: string) =>
    request<void>(`/portal/config/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ userName }),
    }),

  // ---- audit ----
  listAudit: (projectId?: string, limit = 100) => {
    const qs = new URLSearchParams();
    if (projectId) qs.set('projectId', projectId);
    qs.set('limit', String(limit));
    return request<AuditLog[]>(`/portal/audit-logs?${qs.toString()}`);
  },
};

export { BASE_URL };
