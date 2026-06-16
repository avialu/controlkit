import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useApp } from '../state/AppContext';
import type { ConfigType, ConfigValue } from '../api/types';
import DataTable, { type Column } from '../components/DataTable';
import Modal from '../components/Modal';

const TYPES: ConfigType[] = ['string', 'int', 'boolean', 'json'];

export default function ConfigPage() {
  const { selectedProjectId, environment, userName } = useApp();
  const [rows, setRows] = useState<ConfigValue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ConfigValue | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    setError(null);
    try {
      setRows(await api.listConfig(selectedProjectId, environment));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, environment]);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(row: ConfigValue) {
    if (!confirm(`Delete config "${row.key}"?`)) return;
    try {
      await api.deleteConfig(row.id, userName);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const cols: Column<ConfigValue>[] = [
    { header: 'Key', render: (r) => <code className="mono">{r.key}</code> },
    { header: 'Type', render: (r) => <span className="pill">{r.type}</span>, width: '90px' },
    {
      header: 'Value',
      render: (r) => <span className="mono">{formatDecoded(r.decoded_value, r.type)}</span>,
    },
    { header: 'Updated', render: (r) => new Date(r.updated_at).toLocaleString(), width: '180px' },
    {
      header: '',
      width: '160px',
      render: (r) => (
        <div className="row-actions">
          <button onClick={() => setEditing(r)}>Edit</button>
          <button className="danger" onClick={() => remove(r)}>Delete</button>
        </div>
      ),
    },
  ];

  if (!selectedProjectId) return <p className="muted">Select a project first.</p>;

  return (
    <div>
      <div className="page-header">
        <h2>Remote Config</h2>
        <button className="primary" onClick={() => setCreating(true)}>+ New value</button>
      </div>

      {error && <div className="error">{error}</div>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <DataTable rows={rows} columns={cols} keyFn={(r) => r.id} emptyText="No config values yet" />
      )}

      {creating && (
        <ConfigForm
          mode="create"
          onClose={() => setCreating(false)}
          onSubmit={async ({ key, value, type }) => {
            await api.createConfig({
              projectId: selectedProjectId,
              environment,
              userName,
              key,
              value: coerce(value, type),
              type,
            });
            setCreating(false);
            await load();
          }}
        />
      )}

      {editing && (
        <ConfigForm
          mode="edit"
          initial={{ key: editing.key, type: editing.type, value: editing.value }}
          onClose={() => setEditing(null)}
          onSubmit={async ({ value, type }) => {
            await api.updateConfig(editing.id, { userName, value: coerce(value, type), type });
            setEditing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function formatDecoded(value: unknown, type: ConfigType): string {
  if (type === 'json') return JSON.stringify(value);
  if (value === null || value === undefined) return '';
  return String(value);
}

function coerce(raw: string, type: ConfigType): unknown {
  switch (type) {
    case 'int': return parseInt(raw, 10);
    case 'boolean': return raw === 'true' || raw === '1';
    case 'json': return JSON.parse(raw);
    default: return raw;
  }
}

interface FormInput { key: string; value: string; type: ConfigType }

function ConfigForm({
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
  const [key, setKey] = useState(initial?.key ?? '');
  const [value, setValue] = useState(initial?.value ?? '');
  const [type, setType] = useState<ConfigType>(initial?.type ?? 'string');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setErr(null);
    try {
      if (type === 'json') JSON.parse(value); // validate
      await onSubmit({ key: key.trim(), value, type });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={mode === 'create' ? 'New config value' : 'Edit config value'} onClose={onClose}>
      <label>
        Key
        <input value={key} disabled={mode === 'edit'} onChange={(e) => setKey(e.target.value)} autoFocus={mode === 'create'} />
      </label>
      <label>
        Type
        <select value={type} onChange={(e) => setType(e.target.value as ConfigType)}>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      <label>
        Value
        {type === 'json' ? (
          <textarea value={value} rows={5} onChange={(e) => setValue(e.target.value)} />
        ) : type === 'boolean' ? (
          <select value={value} onChange={(e) => setValue(e.target.value)}>
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        ) : (
          <input value={value} onChange={(e) => setValue(e.target.value)} />
        )}
      </label>
      {err && <div className="error">{err}</div>}
      <div className="modal-actions">
        <button onClick={onClose}>Cancel</button>
        <button className="primary" disabled={!key.trim() || submitting} onClick={handleSubmit}>
          {submitting ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Modal>
  );
}
