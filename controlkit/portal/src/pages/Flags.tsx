import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useApp } from '../state/AppContext';
import type { DraftStatus, Flag } from '../api/types';
import DataTable, { type Column } from '../components/DataTable';
import Modal from '../components/Modal';
import PublishBar from '../components/PublishBar';

export default function FlagsPage() {
  const { selectedProjectId, environment, userName } = useApp();
  const [flags, setFlags] = useState<Flag[]>([]);
  const [drafts, setDrafts] = useState<DraftStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Flag | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    setError(null);
    try {
      const [list, status] = await Promise.all([
        api.listFlags(selectedProjectId, environment),
        api.getDraftStatus(selectedProjectId, environment),
      ]);
      setFlags(list);
      setDrafts(status);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, environment]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(flag: Flag) {
    try {
      await api.updateFlag(flag.id, { enabled: !flag.enabled, userName });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function remove(flag: Flag) {
    if (!confirm(`Delete flag "${flag.name}"?`)) return;
    try {
      await api.deleteFlag(flag.id, userName);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const cols: Column<Flag>[] = [
    { header: 'Name', render: (f) => <code className="mono">{f.name}</code> },
    {
      header: 'Enabled',
      render: (f) => (
        <label className="switch">
          <input type="checkbox" checked={f.enabled} onChange={() => toggle(f)} />
          <span className="slider" />
        </label>
      ),
      width: '120px',
    },
    { header: 'Updated', render: (f) => new Date(f.updated_at).toLocaleString() },
    {
      header: '',
      width: '160px',
      render: (f) => (
        <div className="row-actions">
          <button onClick={() => setEditing(f)}>Edit</button>
          <button className="danger" onClick={() => remove(f)}>Delete</button>
        </div>
      ),
    },
  ];

  if (!selectedProjectId) return <p className="muted">Select a project first.</p>;

  return (
    <div>
      <div className="page-header">
        <h2>Feature Flags</h2>
        <button className="primary" onClick={() => setCreating(true)}>+ New flag</button>
      </div>

      <PublishBar status={drafts} onPublished={load} />

      {error && <div className="error">{error}</div>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <DataTable rows={flags} columns={cols} keyFn={(f) => f.id} emptyText="No flags yet" />
      )}

      {creating && (
        <FlagForm
          mode="create"
          onClose={() => setCreating(false)}
          onSubmit={async (input) => {
            await api.createFlag({
              projectId: selectedProjectId,
              environment,
              userName,
              ...input,
            });
            setCreating(false);
            await load();
          }}
        />
      )}

      {editing && (
        <FlagForm
          mode="edit"
          initial={{ name: editing.name, enabled: editing.enabled }}
          onClose={() => setEditing(null)}
          onSubmit={async (input) => {
            await api.updateFlag(editing.id, { userName, ...input });
            setEditing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

interface FormInput {
  name: string;
  enabled: boolean;
}

function FlagForm({
  mode,
  initial,
  onClose,
  onSubmit,
}: {
  mode: 'create' | 'edit';
  initial?: FormInput;
  onClose: () => void;
  onSubmit: (input: FormInput) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [enabled, setEnabled] = useState(initial?.enabled ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setErr(null);
    try {
      await onSubmit({ name: name.trim(), enabled });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={mode === 'create' ? 'New flag' : 'Edit flag'} onClose={onClose}>
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </label>
      <label className="checkbox-row">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Enabled
      </label>
      {err && <div className="error">{err}</div>}
      <div className="modal-actions">
        <button onClick={onClose}>Cancel</button>
        <button className="primary" disabled={!name.trim() || submitting} onClick={handleSubmit}>
          {submitting ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Modal>
  );
}
