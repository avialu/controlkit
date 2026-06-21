import { useState } from 'react';
import { api } from '../api/client';
import { useApp } from '../state/AppContext';
import type { DraftStatus } from '../api/types';
import Modal from './Modal';

/**
 * Sticky-feeling banner that lives at the top of any page where the user
 * mutates state (Flags, Config). Shows the publish gate status:
 *   - "Up to date" when there's nothing to publish
 *   - "N pending changes" with a Publish button when there are drafts
 *
 * Renders the publish modal inline so callers don't need to wire that up.
 */
export default function PublishBar({
  status,
  onPublished,
}: {
  status: DraftStatus | null;
  onPublished: () => void | Promise<void>;
}) {
  const { selectedProjectId, environment, userName } = useApp();
  const [showPublish, setShowPublish] = useState(false);

  if (!status) return null;

  const hasDrafts = status.draftCount > 0;

  return (
    <>
      <div className={`banner ${hasDrafts ? 'banner-warning' : 'banner-ok'}`}>
        <div>
          {hasDrafts ? (
            <>
              <strong>
                {status.draftCount} pending change{status.draftCount === 1 ? '' : 's'}
              </strong>{' '}
              since the last release{status.publishedVersion > 0 ? ` (v${status.publishedVersion})` : ''}.{' '}
              SDK in <code>{environment}</code> is still serving v{status.publishedVersion || 0}.
            </>
          ) : (
            <>
              <strong>Up to date.</strong>{' '}
              SDK in <code>{environment}</code> is serving v{status.publishedVersion || 0}.
            </>
          )}
        </div>
        <button
          className="primary"
          disabled={!hasDrafts}
          title={hasDrafts ? 'Publish the current draft state' : 'Nothing to publish'}
          onClick={() => setShowPublish(true)}
        >
          Publish
        </button>
      </div>

      {showPublish && (
        <PublishModal
          draftCount={status.draftCount}
          onClose={() => setShowPublish(false)}
          onSubmit={async (note) => {
            await api.publish({
              projectId: selectedProjectId!,
              environment,
              note,
              userName,
            });
            setShowPublish(false);
            await onPublished();
          }}
        />
      )}
    </>
  );
}

function PublishModal({
  draftCount,
  onClose,
  onSubmit,
}: {
  draftCount: number;
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
    <Modal title="Publish draft" onClose={onClose}>
      <p className="muted" style={{ marginTop: 0 }}>
        Captures a new version with the current state of every flag and config
        value, and tags it as the published release. The SDK will pick it up on
        its next fetch. Publishing <strong>{draftCount}</strong>{' '}
        pending change{draftCount === 1 ? '' : 's'}.
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
