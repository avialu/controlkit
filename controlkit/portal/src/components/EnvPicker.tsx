import { useState } from 'react';
import { api } from '../api/client';
import { useApp } from '../state/AppContext';
import Modal from './Modal';

export default function EnvPicker() {
  const {
    environment,
    setEnvironment,
    availableEnvironments,
    selectedProjectId,
    userName,
    reloadEnvironments,
  } = useApp();
  const [showAdd, setShowAdd] = useState(false);

  // If the project has no envs yet (brand-new project), show a single CTA
  // instead of an empty picker.
  if (availableEnvironments.length === 0) {
    return (
      <div className="env-picker">
        <button
          className="muted"
          disabled={!selectedProjectId}
          onClick={() => setShowAdd(true)}
        >
          + Add environment
        </button>
        {showAdd && selectedProjectId && (
          <AddEnvModal
            projectId={selectedProjectId}
            userName={userName}
            existing={availableEnvironments}
            onClose={() => setShowAdd(false)}
            onCreated={async (env) => {
              await reloadEnvironments();
              setEnvironment(env);
              setShowAdd(false);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="env-picker">
      {availableEnvironments.map((env) => (
        <button
          key={env}
          className={environment === env ? 'active' : ''}
          onClick={() => setEnvironment(env)}
        >
          {env}
        </button>
      ))}
      <button
        title="Add a new environment"
        disabled={!selectedProjectId}
        onClick={() => setShowAdd(true)}
      >
        +
      </button>

      {showAdd && selectedProjectId && (
        <AddEnvModal
          projectId={selectedProjectId}
          userName={userName}
          existing={availableEnvironments}
          onClose={() => setShowAdd(false)}
          onCreated={async (env) => {
            await reloadEnvironments();
            setEnvironment(env);
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}

function AddEnvModal({
  projectId,
  userName,
  existing,
  onClose,
  onCreated,
}: {
  projectId: string;
  userName: string;
  existing: string[];
  onClose: () => void;
  onCreated: (env: string) => void | Promise<void>;
}) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function validate(raw: string): string | null {
    const v = raw.trim();
    if (!v) return 'Name is required';
    if (!/^[a-z0-9][a-z0-9_-]*$/i.test(v)) return 'Use letters, digits, dashes or underscores';
    if (existing.includes(v)) return `"${v}" already exists`;
    return null;
  }

  async function handle() {
    const problem = validate(name);
    if (problem) { setErr(problem); return; }
    setSubmitting(true);
    setErr(null);
    try {
      // Creating an API key with an unseen env name is what materializes the
      // environment — it's just a label everywhere else.
      await api.createApiKey(projectId, name.trim(), userName);
      await onCreated(name.trim());
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New environment" onClose={onClose}>
      <p className="muted" style={{ marginTop: 0 }}>
        Creates an API key for this environment. Use it in your SDK to scope
        flags and config to a separate slice of your data.
      </p>
      <label>
        Environment name
        <input
          value={name}
          autoFocus
          placeholder="e.g. qa, dev, preview"
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      {err && <div className="error">{err}</div>}
      <div className="modal-actions">
        <button onClick={onClose}>Cancel</button>
        <button className="primary" disabled={submitting} onClick={handle}>
          {submitting ? 'Creating…' : 'Create'}
        </button>
      </div>
    </Modal>
  );
}
