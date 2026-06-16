import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import type { Environment, Project } from '../api/types';

interface AppState {
  projects: Project[];
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string) => void;
  environment: Environment;
  setEnvironment: (env: Environment) => void;
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelected] = useState<string | null>(
    () => localStorage.getItem(LS_PROJECT),
  );
  const [environment, setEnv] = useState<Environment>(
    () => (localStorage.getItem(LS_ENV) as Environment) || 'production',
  );
  const [userName, setUser] = useState<string>(
    () => localStorage.getItem(LS_USER) || 'admin',
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reloadProjects() {
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
  }

  useEffect(() => {
    void reloadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      userName,
      setUserName: (n) => {
        setUser(n);
        localStorage.setItem(LS_USER, n);
      },
      reloadProjects,
      loading,
      error,
    }),
    [projects, selectedProjectId, environment, userName, loading, error],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside <AppProvider>');
  return v;
}
