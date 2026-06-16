import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useApp } from '../state/AppContext';
import type { AuditLog } from '../api/types';
import DataTable, { type Column } from '../components/DataTable';

export default function AuditLogsPage() {
  const { selectedProjectId } = useApp();
  const [rows, setRows] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .listAudit(selectedProjectId ?? undefined, 200)
      .then((r) => alive && setRows(r))
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [selectedProjectId]);

  const cols: Column<AuditLog>[] = [
    { header: 'When', render: (r) => new Date(r.timestamp).toLocaleString(), width: '180px' },
    { header: 'User', render: (r) => r.user_name || '—', width: '120px' },
    { header: 'Entity', render: (r) => <span className="pill">{r.entity_type}</span>, width: '120px' },
    {
      header: 'Action',
      render: (r) => <span className={`pill pill-${r.action}`}>{r.action}</span>,
      width: '90px',
    },
    {
      header: 'Diff',
      render: (r) => (
        <details>
          <summary className="muted">show</summary>
          <pre className="json small">
            {JSON.stringify({ old: r.old_value, new: r.new_value }, null, 2)}
          </pre>
        </details>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>Audit Logs</h2>
      </div>
      {error && <div className="error">{error}</div>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <DataTable rows={rows} columns={cols} keyFn={(r) => r.id} emptyText="No audit entries yet" />
      )}
    </div>
  );
}
