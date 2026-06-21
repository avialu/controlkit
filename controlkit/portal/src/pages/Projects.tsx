import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useApp } from '../state/AppContext';
import type { ApiKey } from '../api/types';
import DataTable, { type Column } from '../components/DataTable';
import Modal from '../components/Modal';

export default function ProjectsPage() {
  const {
    projects,
    selectedProjectId,
    setSelectedProjectId,
    reloadProjects,
    userName,
    availableEnvironments,
    reloadEnvironments,
  } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyEnv, setNewKeyEnv] = useState<string>('');

  async function loadKeys(id: string) {
    setKeysLoading(true);
    try {
      setApiKeys(await api.listApiKeys(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setKeysLoading(false);
    }
  }

  useEffect(() => {
    if (selectedProjectId) void loadKeys(selectedProjectId);
  }, [selectedProjectId]);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const p = await api.createProject(name.trim(), userName);
      setName('');
      setShowCreate(false);
      await reloadProjects();
      setSelectedProjectId(p.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }

  async function handleCreateKey() {
    if (!selectedProjectId) return;
    const env = newKeyEnv.trim();
    if (!env) { setError('Environment is required'); return; }
    setError(null);
    try {
      await api.createApiKey(selectedProjectId, env, userName);
      setShowCreateKey(false);
      setNewKeyEnv('');
      await Promise.all([loadKeys(selectedProjectId), reloadEnvironments()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const projectCols: Column<typeof projects[number]>[] = [
    { header: 'Name', render: (p) => p.name },
    { header: 'ID', render: (p) => <code className="mono">{p.id}</code> },
    { header: 'Created', render: (p) => new Date(p.created_at).toLocaleString() },
  ];

  const keyCols: Column<ApiKey>[] = [
    { header: 'Environment', render: (k) => k.environment },
    { header: 'Key', render: (k) => <code className="mono">{k.key}</code> },
    { header: 'Created', render: (k) => new Date(k.created_at).toLocaleString() },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>Projects</h2>
        <button className="primary" onClick={() => setShowCreate(true)}>+ New project</button>
      </div>

      {error && <div className="error">{error}</div>}

      <DataTable rows={projects} columns={projectCols} keyFn={(p) => p.id} emptyText="No projects yet" />

      <div className="page-header" style={{ marginTop: 32 }}>
        <h2>API keys</h2>
        <button
          className="primary"
          disabled={!selectedProjectId}
          onClick={() => setShowCreateKey(true)}
        >
          + New API key
        </button>
      </div>

      {!selectedProjectId ? (
        <p className="muted">Select a project to view its API keys.</p>
      ) : keysLoading ? (
        <p className="muted">Loading…</p>
      ) : (
        <DataTable rows={apiKeys} columns={keyCols} keyFn={(k) => k.id} emptyText="No API keys yet" />
      )}

      {showCreate && (
        <Modal title="Create project" onClose={() => setShowCreate(false)}>
          <label>
            Project name
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </label>
          <div className="modal-actions">
            <button onClick={() => setShowCreate(false)}>Cancel</button>
            <button
              className="primary"
              disabled={!name.trim() || creating}
              onClick={handleCreate}
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </Modal>
      )}

      {showCreateKey && (
        <Modal title="Generate API key" onClose={() => setShowCreateKey(false)}>
          <label>
            Environment
            <input
              value={newKeyEnv}
              list="known-envs"
              placeholder="e.g. production, staging, qa"
              autoFocus
              onChange={(e) => setNewKeyEnv(e.target.value)}
            />
            <datalist id="known-envs">
              {availableEnvironments.map((env) => <option key={env} value={env} />)}
            </datalist>
          </label>
          <p className="muted" style={{ fontSize: 13, marginTop: -4 }}>
            Pick an existing environment or type a new name to create one.
          </p>
          <div className="modal-actions">
            <button onClick={() => setShowCreateKey(false)}>Cancel</button>
            <button className="primary" disabled={!newKeyEnv.trim()} onClick={handleCreateKey}>
              Generate
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
