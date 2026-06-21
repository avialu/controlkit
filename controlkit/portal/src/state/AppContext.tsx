import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import type { Environment, Project } from '../api/types';

interface AppState {
  projects: Project[];
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string) => void;
  environment: Environment;
  setEnvironment: (env: Environment) => void;
  /** Distinct environment names that exist for the currently selected project. */
  availableEnvironments: string[];
  /** Refetch the env list for the current project (call after creating an env). */
  reloadEnvironments: () => Promise<void>;
  /** Persist a custom env display order for the current project. */
  setEnvironmentOrder: (order: string[]) => void;
  userName: string;
  setUserName: (name: string) => void;
  reloadProjects: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const Ctx = createContext<AppState | undefined>(undefined);

const LS_PROJECT = 'ck.projectId';
const LS_ENV = 'ck.env';
const LS_USER = 'ck.user';
const LS_ENV_ORDER_PREFIX = 'ck.env-order.';

/**
 * Read the user's saved env order for a project.
 * Returns an empty list if none was saved (i.e. use the backend's ordering).
 */
function loadEnvOrder(projectId: string): string[] {
  try {
    const raw = localStorage.getItem(LS_ENV_ORDER_PREFIX + projectId);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s: unknown): s is string => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

function saveEnvOrder(projectId: string, order: string[]) {
  localStorage.setItem(LS_ENV_ORDER_PREFIX + projectId, JSON.stringify(order));
}

/**
 * Reconcile the backend list with the user's saved order:
 *  - keep saved-and-still-present envs in their saved positions
 *  - drop envs the user reordered that no longer exist
 *  - append envs the backend reports but the user hasn't placed yet (newcomers go to the end)
 */
function applyEnvOrder(envs: string[], preferred: string[]): string[] {
  const pinned = preferred.filter((e) => envs.includes(e));
  const newcomers = envs.filter((e) => !pinned.includes(e));
  return [...pinned, ...newcomers];
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelected] = useState<string | null>(
    () => localStorage.getItem(LS_PROJECT),
  );
  const [environment, setEnv] = useState<Environment>(
    () => localStorage.getItem(LS_ENV) || 'production',
  );
  const [availableEnvironments, setAvailableEnvironments] = useState<string[]>([]);
  const [userName, setUser] = useState<string>(
    () => localStorage.getItem(LS_USER) || 'admin',
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.listProjects();
      setProjects(list);
      if (!selectedProjectId && list.length > 0) {
        setSelected(list[0].id);
        localStorage.setItem(LS_PROJECT, list[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  const reloadEnvironments = useCallback(async () => {
    if (!selectedProjectId) {
      setAvailableEnvironments([]);
      return;
    }
    try {
      const envs = await api.listEnvironments(selectedProjectId);
      const ordered = applyEnvOrder(envs, loadEnvOrder(selectedProjectId));
      setAvailableEnvironments(ordered);
      // If the persisted env doesn't exist for this project, snap to the first
      // available one. Stops Flags/Config pages from showing an empty state
      // just because the user switched projects.
      if (ordered.length > 0 && !ordered.includes(environment)) {
        setEnv(ordered[0]);
        localStorage.setItem(LS_ENV, ordered[0]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [selectedProjectId, environment]);

  const setEnvironmentOrder = useCallback(
    (order: string[]) => {
      if (!selectedProjectId) return;
      saveEnvOrder(selectedProjectId, order);
      setAvailableEnvironments(order);
    },
    [selectedProjectId],
  );

  useEffect(() => {
    void reloadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void reloadEnvironments();
  }, [reloadEnvironments]);

  const value = useMemo<AppState>(
    () => ({
      projects,
      selectedProjectId,
      setSelectedProjectId: (id) => {
        setSelected(id);
        localStorage.setItem(LS_PROJECT, id);
      },
      environment,
      setEnvironment: (env) => {
        setEnv(env);
        localStorage.setItem(LS_ENV, env);
      },
      availableEnvironments,
      reloadEnvironments,
      setEnvironmentOrder,
      userName,
      setUserName: (n) => {
        setUser(n);
        localStorage.setItem(LS_USER, n);
      },
      reloadProjects,
      loading,
      error,
    }),
    [
      projects,
      selectedProjectId,
      environment,
      availableEnvironments,
      reloadEnvironments,
      setEnvironmentOrder,
      userName,
      reloadProjects,
      loading,
      error,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside <AppProvider>');
  return v;
}
