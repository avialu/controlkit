import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApp } from '../state/AppContext';
import type { ConfigValue, DraftStatus, Flag } from '../api/types';

export default function Dashboard() {
  const { selectedProjectId, environment } = useApp();
  const [flags, setFlags] = useState<Flag[]>([]);
  const [config, setConfig] = useState<ConfigValue[]>([]);
  const [drafts, setDrafts] = useState<DraftStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProjectId) return;
    let alive = true;
    setError(null);
    Promise.all([
      api.listFlags(selectedProjectId, environment),
      api.listConfig(selectedProjectId, environment),
      api.getDraftStatus(selectedProjectId, environment),
    ])
      .then(([f, c, d]) => {
        if (!alive) return;
        setFlags(f);
        setConfig(c);
        setDrafts(d);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, [selectedProjectId, environment]);

  if (!selectedProjectId) {
    return <p className="muted">Create or select a project to get started.</p>;
  }

  return (
    <div>
      <h2>Dashboard</h2>
      {error && <div className="error">{error}</div>}

      <div className="card-grid">
        <Card label="Flags" value={flags.length} />
        <Card label="Flags enabled" value={flags.filter((f) => f.enabled).length} />
        <Card label="Config values" value={config.length} />
        <Card label="SDK serves" value={drafts ? `v${drafts.publishedVersion || 0}` : '—'} />
        <Card label="Drafts pending" value={drafts ? drafts.draftCount : '—'} />
      </div>

      {drafts && drafts.draftCount > 0 && (
        <div className="banner banner-warning">
          <div>
            <strong>{drafts.draftCount} unpublished change{drafts.draftCount === 1 ? '' : 's'}</strong>{' '}
            in <code>{environment}</code>. The SDK is still serving v{drafts.publishedVersion || 0}.
          </div>
          <Link to="/versions" className="primary button-link">Go to Versions</Link>
        </div>
      )}

      <h3>Draft state — current contents of the portal</h3>
      <p className="muted">
        This is what would be released if you clicked <strong>Publish</strong> right now.
        Until then, the SDK keeps serving the snapshot from v{drafts?.publishedVersion ?? 0}.
      </p>
      <pre className="json">{JSON.stringify(buildPreview(flags, config, environment), null, 2)}</pre>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function buildPreview(flags: Flag[], config: ConfigValue[], environment: string) {
  const features: Record<string, boolean> = {};
  for (const f of flags) features[f.name] = f.enabled;
  const cfg: Record<string, unknown> = {};
  for (const c of config) cfg[c.key] = c.decoded_value;
  return { environment, features, config: cfg };
}
