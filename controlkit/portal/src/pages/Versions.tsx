import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useApp } from '../state/AppContext';
import type { ConfigSnapshot, VersionDetail, VersionSummary } from '../api/types';
import DataTable, { type Column } from '../components/DataTable';
import Modal from '../components/Modal';

export default function VersionsPage() {
  const { selectedProjectId, environment, userName } = useApp();
  const [rows, setRows] = useState<VersionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPublishedOnly, setShowPublishedOnly] = useState(false);

  const [openDetail, setOpenDetail] = useState<{
    current: VersionDetail;
    previous: VersionDetail | null;
  } | null>(null);

  const [showPublish, setShowPublish] = useState(false);

  const load = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await api.listVersions(selectedProjectId, environment, {
        publishedOnly: showPublishedOnly,
      });
      setRows(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, environment, showPublishedOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openVersion(row: VersionSummary) {
    setError(null);
    try {
      const current = await api.getVersion(row.id);
      // Find the previous version (one lower number) regardless of filter.
      const all = showPublishedOnly
        ? await api.listVersions(selectedProjectId!, environment, { limit: 500 })
        : rows;
      const prevSummary = all.find((v) => v.version === row.version - 1) ?? null;
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
      header: 'Kind',
      width: '110px',
      render: (v) =>
        v.is_published ? (
          <span className="pill pill-create">published</span>
        ) : (
          <span className="pill">auto</span>
        ),
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
      width: '90px',
      render: (v) => <button onClick={() => openVersion(v)}>View</button>,
    },
  ];

  if (!selectedProjectId) return <p className="muted">Select a project first.</p>;

  return (
    <div>
      <div className="page-header">
        <h2>Versions</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label className="checkbox-inline">
            <input
              type="checkbox"
              checked={showPublishedOnly}
              onChange={(e) => setShowPublishedOnly(e.target.checked)}
            />
            Published only
          </label>
          <button className="primary" onClick={() => setShowPublish(true)}>+ Publish</button>
        </div>
      </div>

      <p className="muted" style={{ marginTop: -8 }}>
        Every flag/config change creates an <strong>auto</strong> version capturing the full state.
        Clicking <strong>Publish</strong> tags the current state as an explicit release with a note.
      </p>

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

      {showPublish && (
        <PublishModal
          onClose={() => setShowPublish(false)}
          onSubmit={async (note) => {
            await api.publish({
              projectId: selectedProjectId,
              environment,
              note,
              userName,
            });
            setShowPublish(false);
            await load();
          }}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Publish modal
// ----------------------------------------------------------------------------

function PublishModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (note: string) => Promise<void>;
}) {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handle() {
    if (!note.trim()) return;
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
    <Modal title="Publish current state" onClose={onClose}>
      <p className="muted" style={{ marginTop: 0 }}>
        Captures a snapshot of the current (features, config) state and tags it as a
        released version with the note below.
      </p>
      <label>
        Release note
        <input
          value={note}
          autoFocus
          placeholder="e.g. v1.4 — Enable new checkout"
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      {err && <div className="error">{err}</div>}
      <div className="modal-actions">
        <button onClick={onClose}>Cancel</button>
        <button className="primary" disabled={!note.trim() || submitting} onClick={handle}>
          {submitting ? 'Publishing…' : 'Publish'}
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
    <Modal
      title={`Version v${current.version} — ${current.is_published ? 'published' : 'auto'}`}
      onClose={onClose}
    >
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
