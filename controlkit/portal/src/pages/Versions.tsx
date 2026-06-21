import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useApp } from '../state/AppContext';
import type {
  ConfigSnapshot,
  DraftStatus,
  VersionDetail,
  VersionSummary,
} from '../api/types';
import DataTable, { type Column } from '../components/DataTable';
import Modal from '../components/Modal';
import PublishBar from '../components/PublishBar';

export default function VersionsPage() {
  const { selectedProjectId, environment, userName, availableEnvironments } = useApp();
  const [rows, setRows] = useState<VersionSummary[]>([]);
  const [drafts, setDrafts] = useState<DraftStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openDetail, setOpenDetail] = useState<{
    current: VersionDetail;
    previous: VersionDetail | null;
  } | null>(null);

  const [promoteFrom, setPromoteFrom] = useState<VersionSummary | null>(null);
  const [rollbackTo, setRollbackTo] = useState<VersionSummary | null>(null);

  const load = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    setError(null);
    try {
      const [list, status] = await Promise.all([
        // Only published versions exist as a meaningful concept now.
        // Legacy "auto" rows from older builds are hidden.
        api.listVersions(selectedProjectId, environment, { publishedOnly: true }),
        api.getDraftStatus(selectedProjectId, environment),
      ]);
      setRows(list);
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

  async function openVersion(row: VersionSummary) {
    setError(null);
    try {
      const current = await api.getVersion(row.id);
      // Compare against the previous PUBLISHED version (skipping any legacy
      // unpublished rows from older builds).
      const prevSummary = rows.find((v) => v.version < row.version) ?? null;
      const previous = prevSummary ? await api.getVersion(prevSummary.id) : null;
      setOpenDetail({ current, previous });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const cols: Column<VersionSummary>[] = [
    {
      header: 'Version',
      width: '90px',
      render: (v) => <span className="mono">v{v.version}</span>,
    },
    {
      header: 'Note',
      render: (v) => v.note ?? <span className="muted">—</span>,
    },
    { header: 'User', width: '120px', render: (v) => v.user_name || '—' },
    {
      header: 'When',
      width: '180px',
      render: (v) => new Date(v.published_at).toLocaleString(),
    },
    {
      header: '',
      width: '260px',
      render: (v) => {
        const isCurrent = drafts && v.version === drafts.publishedVersion;
        return (
          <div className="row-actions">
            <button onClick={() => openVersion(v)}>View</button>
            <button
              title={`Promote v${v.version} to the other environment`}
              onClick={() => setPromoteFrom(v)}
            >
              Promote
            </button>
            {!isCurrent && (
              <button
                className="danger"
                title={`Roll back ${environment} to v${v.version}`}
                onClick={() => setRollbackTo(v)}
              >
                Rollback
              </button>
            )}
            {isCurrent && <span className="pill pill-create" style={{ alignSelf: 'center' }}>current</span>}
          </div>
        );
      },
    },
  ];

  if (!selectedProjectId) return <p className="muted">Select a project first.</p>;

  // Promote can target any environment other than the source (the current one).
  const promoteTargets = availableEnvironments.filter((e) => e !== environment);

  return (
    <div>
      <div className="page-header">
        <h2>Versions</h2>
      </div>

      <p className="muted" style={{ marginTop: -8 }}>
        Every release is a published snapshot. Edit flags or config on those
        pages, then <strong>Publish</strong> to cut a new version. Use{' '}
        <strong>Promote</strong> to roll a release out to another environment,
        or <strong>Rollback</strong> to restore an earlier release.
      </p>

      <PublishBar status={drafts} onPublished={load} />

      {error && <div className="error">{error}</div>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <DataTable rows={rows} columns={cols} keyFn={(v) => v.id} emptyText="No versions yet" />
      )}

      {openDetail && (
        <VersionDetailModal
          current={openDetail.current}
          previous={openDetail.previous}
          onClose={() => setOpenDetail(null)}
        />
      )}

      {promoteFrom && (
        <PromoteModal
          source={promoteFrom}
          targets={promoteTargets}
          onClose={() => setPromoteFrom(null)}
          onSubmit={async (targetEnv, note) => {
            await api.promote({
              sourceVersionId: promoteFrom.id,
              targetEnvironment: targetEnv,
              note: note || undefined,
              userName,
            });
            setPromoteFrom(null);
            await load();
          }}
        />
      )}

      {rollbackTo && drafts && (
        <RollbackModal
          source={rollbackTo}
          currentVersion={drafts.publishedVersion}
          onClose={() => setRollbackTo(null)}
          onSubmit={async (note) => {
            await api.rollback({
              sourceVersionId: rollbackTo.id,
              note: note || undefined,
              userName,
            });
            setRollbackTo(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function RollbackModal({
  source,
  currentVersion,
  onClose,
  onSubmit,
}: {
  source: VersionSummary;
  currentVersion: number;
  onClose: () => void;
  onSubmit: (note: string) => Promise<void>;
}) {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handle() {
    setSubmitting(true);
    setErr(null);
    try {
      await onSubmit(note.trim());
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={`Roll back ${source.environment} from v${currentVersion} → v${source.version}`}
      onClose={onClose}
    >
      <p className="muted" style={{ marginTop: 0 }}>
        Applies v{source.version}'s snapshot back onto <code>{source.environment}</code>'s
        draft tables and publishes a new version with the restored state. The
        SDK will serve it on its next fetch. Audit history is preserved —
        nothing is deleted.
      </p>
      <label>
        Release note (optional)
        <input
          value={note}
          placeholder={`Rolled back to v${source.version}`}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      {err && <div className="error">{err}</div>}
      <div className="modal-actions">
        <button onClick={onClose}>Cancel</button>
        <button className="danger" disabled={submitting} onClick={handle}>
          {submitting ? 'Rolling back…' : `Roll back to v${source.version}`}
        </button>
      </div>
    </Modal>
  );
}

function PromoteModal({
  source,
  targets,
  onClose,
  onSubmit,
}: {
  source: VersionSummary;
  targets: string[];
  onClose: () => void;
  onSubmit: (targetEnv: string, note: string) => Promise<void>;
}) {
  const [target, setTarget] = useState<string>(targets[0] ?? '');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handle() {
    if (!target) { setErr('Pick a target environment'); return; }
    setSubmitting(true);
    setErr(null);
    try {
      await onSubmit(target, note.trim());
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (targets.length === 0) {
    return (
      <Modal title={`Promote v${source.version}`} onClose={onClose}>
        <p className="muted" style={{ marginTop: 0 }}>
          No other environments to promote to. Use the <strong>+</strong>{' '}
          button in the environment picker to add one.
        </p>
        <div className="modal-actions">
          <button onClick={onClose}>Close</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title={`Promote v${source.version} from ${source.environment}`}
      onClose={onClose}
    >
      <p className="muted" style={{ marginTop: 0 }}>
        Copies every flag and config value from this snapshot into the target
        environment, then publishes the result so its SDK immediately serves
        it. Existing keys in the target are overwritten; keys that aren't in
        this snapshot are left untouched.
      </p>
      <label>
        Target environment
        <select value={target} onChange={(e) => setTarget(e.target.value)}>
          {targets.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      <label>
        Release note (optional)
        <input
          value={note}
          placeholder={`Promoted from ${source.environment} v${source.version}`}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      {err && <div className="error">{err}</div>}
      <div className="modal-actions">
        <button onClick={onClose}>Cancel</button>
        <button className="primary" disabled={submitting} onClick={handle}>
          {submitting ? 'Promoting…' : `Promote to ${target}`}
        </button>
      </div>
    </Modal>
  );
}

// ----------------------------------------------------------------------------
// Version detail + diff
// ----------------------------------------------------------------------------

interface DiffEntry {
  key: string;
  kind: 'added' | 'removed' | 'changed' | 'unchanged';
  before?: unknown;
  after?: unknown;
}

function diffMaps(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
): DiffEntry[] {
  const a = before ?? {};
  const b = after ?? {};
  const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)])).sort();
  return keys.map((k) => {
    const inA = k in a;
    const inB = k in b;
    if (inA && !inB) return { key: k, kind: 'removed', before: a[k] };
    if (!inA && inB) return { key: k, kind: 'added', after: b[k] };
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k]))
      return { key: k, kind: 'changed', before: a[k], after: b[k] };
    return { key: k, kind: 'unchanged', before: a[k], after: b[k] };
  });
}

function formatVal(v: unknown): string {
  if (v === undefined) return '—';
  if (typeof v === 'string') return JSON.stringify(v);
  return JSON.stringify(v);
}

function VersionDetailModal({
  current,
  previous,
  onClose,
}: {
  current: VersionDetail;
  previous: VersionDetail | null;
  onClose: () => void;
}) {
  const curSnap: ConfigSnapshot = current.snapshot ?? { features: {}, config: {} };
  const prevSnap: ConfigSnapshot | null = previous?.snapshot ?? null;

  const featureDiff = diffMaps(prevSnap?.features as Record<string, unknown> | undefined, curSnap.features);
  const configDiff = diffMaps(prevSnap?.config, curSnap.config);

  const showDiff = Boolean(previous);

  return (
    <Modal title={`Version v${current.version}`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 560 }}>
        <div className="muted" style={{ fontSize: 13 }}>
          {current.note && <div><strong>Note:</strong> {current.note}</div>}
          <div>
            <strong>By:</strong> {current.user_name || '—'} ·{' '}
            <strong>When:</strong> {new Date(current.published_at).toLocaleString()}
            {showDiff && (
              <>
                {' '}· <strong>Compared to:</strong> v{previous!.version}
              </>
            )}
          </div>
        </div>

        <Section title="Features">
          <DiffTable entries={featureDiff} showDiff={showDiff} />
        </Section>

        <Section title="Config">
          <DiffTable entries={configDiff} showDiff={showDiff} />
        </Section>

        <details>
          <summary className="muted">Raw snapshot JSON</summary>
          <pre className="json small" style={{ marginTop: 8 }}>
            {JSON.stringify(current.snapshot, null, 2)}
          </pre>
        </details>
      </div>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 style={{ margin: '0 0 8px' }}>{title}</h4>
      {children}
    </div>
  );
}

function DiffTable({ entries, showDiff }: { entries: DiffEntry[]; showDiff: boolean }) {
  if (entries.length === 0) {
    return <p className="muted" style={{ margin: 0 }}>(empty)</p>;
  }
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th style={{ width: 200 }}>Key</th>
          {showDiff && <th style={{ width: 100 }}>Change</th>}
          {showDiff && <th>Previous</th>}
          <th>{showDiff ? 'Current' : 'Value'}</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.key}>
            <td><span className="mono">{e.key}</span></td>
            {showDiff && (
              <td>
                <span className={`pill pill-${e.kind === 'unchanged' ? '' : e.kind}`}>
                  {e.kind}
                </span>
              </td>
            )}
            {showDiff && (
              <td className="mono">
                {e.kind === 'added' ? <span className="muted">—</span> : formatVal(e.before)}
              </td>
            )}
            <td className="mono">
              {e.kind === 'removed' ? <span className="muted">—</span> : formatVal(e.after)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
