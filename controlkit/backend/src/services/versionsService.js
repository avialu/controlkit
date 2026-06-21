const { query } = require('../db/pool');
const { HttpError } = require('../middleware/errorHandler');

/**
 * Decodes a config_values row using its type column. Duplicated from
 * configService on purpose so versionsService can stay import-cycle-free
 * (flagsService and configService both import versionsService).
 */
function decodeValue(row) {
  switch (row.type) {
    case 'int':     return parseInt(row.value, 10);
    case 'boolean': return row.value === 'true';
    case 'json':
      try { return JSON.parse(row.value); } catch { return null; }
    case 'string':
    default:        return row.value;
  }
}

/**
 * Reads the full current (features, config) state for a (project, environment)
 * pair. Used to build snapshots stored in config_versions.
 *
 * Snapshot shape:
 *   {
 *     features: { name: bool, ... },           // SDK-facing
 *     config:   { key: decodedValue, ... },     // SDK-facing
 *     _meta: { config_types: { key: 'int' } }   // used by promote(); SDK ignores it
 *   }
 */
async function captureSnapshot(projectId, environment) {
  const { rows: flags } = await query(
    'SELECT name, enabled FROM flags WHERE project_id = $1 AND environment = $2 ORDER BY name',
    [projectId, environment],
  );
  const { rows: configs } = await query(
    'SELECT key, value, type FROM config_values WHERE project_id = $1 AND environment = $2 ORDER BY key',
    [projectId, environment],
  );

  const features = {};
  for (const f of flags) features[f.name] = f.enabled;

  const config = {};
  const configTypes = {};
  for (const c of configs) {
    config[c.key] = decodeValue(c);
    configTypes[c.key] = c.type;
  }

  return { features, config, _meta: { config_types: configTypes } };
}

/**
 * Creates a new config_versions row reflecting the current state.
 *
 * Called from flag/config mutations (no `note`, `isPublished=false`) and from
 * the explicit POST /portal/publish endpoint (with a `note`, `isPublished=true`).
 */
async function bumpVersion(projectId, environment, options = {}) {
  const { note = null, userName = null, isPublished = false } = options;

  const { rows: nextRows } = await query(
    `SELECT COALESCE(MAX(version), 0) + 1 AS next
       FROM config_versions
      WHERE project_id = $1 AND environment = $2`,
    [projectId, environment],
  );
  const next = nextRows[0].next;

  const snapshot = await captureSnapshot(projectId, environment);

  const { rows } = await query(
    `INSERT INTO config_versions
        (project_id, version, environment, snapshot, note, is_published, user_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [projectId, next, environment, snapshot, note, isPublished, userName],
  );
  return rows[0];
}

async function getCurrent(projectId, environment) {
  const { rows } = await query(
    `SELECT version FROM config_versions
      WHERE project_id = $1 AND environment = $2
      ORDER BY version DESC LIMIT 1`,
    [projectId, environment],
  );
  return rows.length ? rows[0].version : 0;
}

async function list({ projectId, environment, publishedOnly = false, limit = 100 }) {
  const params = [];
  const where = [];

  if (projectId)   { params.push(projectId);   where.push(`project_id = $${params.length}`); }
  if (environment) { params.push(environment); where.push(`environment = $${params.length}`); }
  if (publishedOnly) where.push('is_published = TRUE');

  params.push(limit);
  const sql = `
    SELECT id, project_id, version, environment, note, is_published, user_name, published_at
      FROM config_versions
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY version DESC
      LIMIT $${params.length}
  `;
  const { rows } = await query(sql, params);
  return rows;
}

async function getById(id) {
  const { rows } = await query('SELECT * FROM config_versions WHERE id = $1', [id]);
  if (rows.length === 0) throw new HttpError(404, 'Version not found');
  return rows[0];
}

async function publish({ projectId, environment, note, userName }) {
  if (!projectId || !environment) throw new HttpError(400, 'projectId and environment are required');
  if (!note || !note.trim())      throw new HttpError(400, 'A release note is required to publish');

  return bumpVersion(projectId, environment, {
    note: note.trim(),
    userName: userName || 'system',
    isPublished: true,
  });
}

/**
 * Encodes a JS value back into the TEXT representation we store in config_values.
 * Inverse of decodeValue().
 */
function encodeValue(value, type) {
  if (type === 'json') return typeof value === 'string' ? value : JSON.stringify(value);
  if (type === 'boolean') return String(Boolean(value));
  if (type === 'int') return String(parseInt(value, 10));
  return String(value);
}

/**
 * Upserts a snapshot's flags + config values into the target env's draft tables.
 * Shared by promote() (cross-env) and rollback() (same env).
 *
 * Items present in the target env but absent from the snapshot are left in
 * place — this is intentional. We only ever add or overwrite, never delete.
 */
async function applySnapshotToEnv(projectId, environment, snapshot) {
  const snap = snapshot || { features: {}, config: {}, _meta: {} };
  const types = (snap._meta && snap._meta.config_types) || {};

  for (const [name, enabled] of Object.entries(snap.features || {})) {
    await query(
      `INSERT INTO flags (project_id, name, enabled, environment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (project_id, environment, name) DO UPDATE
         SET enabled = EXCLUDED.enabled, updated_at = NOW()`,
      [projectId, name, !!enabled, environment],
    );
  }

  for (const [key, value] of Object.entries(snap.config || {})) {
    // If the type wasn't in the snapshot (old data), try to inherit it from
    // whatever this env already had; otherwise default to 'string'.
    let type = types[key];
    if (!type) {
      const { rows } = await query(
        'SELECT type FROM config_values WHERE project_id = $1 AND environment = $2 AND key = $3',
        [projectId, environment, key],
      );
      type = rows[0]?.type || 'string';
    }
    const encoded = encodeValue(value, type);
    await query(
      `INSERT INTO config_values (project_id, key, value, type, environment)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (project_id, environment, key) DO UPDATE
         SET value = EXCLUDED.value, type = EXCLUDED.type, updated_at = NOW()`,
      [projectId, key, encoded, type, environment],
    );
  }
}

/**
 * Promotes a published version from one environment to another:
 *
 *   1. Applies the snapshot to the target env's draft tables (upserts).
 *   2. Calls publish() so the SDK in the target env immediately serves it.
 */
async function promote({ sourceVersionId, targetEnvironment, note, userName }) {
  if (!sourceVersionId || !targetEnvironment) {
    throw new HttpError(400, 'sourceVersionId and targetEnvironment are required');
  }

  const source = await getById(sourceVersionId);
  if (!source.is_published) {
    throw new HttpError(400, 'Only published versions can be promoted');
  }
  if (source.environment === targetEnvironment) {
    throw new HttpError(400, 'Source and target environment must differ');
  }

  await applySnapshotToEnv(source.project_id, targetEnvironment, source.snapshot);

  const finalNote = (note && note.trim())
    || `Promoted from ${source.environment} v${source.version}${source.note ? `: ${source.note}` : ''}`;

  return bumpVersion(source.project_id, targetEnvironment, {
    note: finalNote,
    userName: userName || 'system',
    isPublished: true,
  });
}

/**
 * Restores a previously published version in the SAME environment:
 *
 *   1. Applies the older snapshot to the env's draft tables.
 *   2. Creates a new published version pointing at the restored state.
 *
 * Like promote, this is additive — flags/config that exist now but weren't
 * in the source snapshot are NOT removed. Be explicit if you need cleanup.
 */
async function rollback({ sourceVersionId, note, userName }) {
  if (!sourceVersionId) throw new HttpError(400, 'sourceVersionId is required');

  const source = await getById(sourceVersionId);
  if (!source.is_published) {
    throw new HttpError(400, 'Only published versions can be rolled back to');
  }

  // Refuse to "roll back" to the currently-served version — it's a no-op.
  const current = await getDraftStatus(source.project_id, source.environment);
  if (source.version === current.publishedVersion) {
    throw new HttpError(400, `v${source.version} is already the currently-published version`);
  }

  await applySnapshotToEnv(source.project_id, source.environment, source.snapshot);

  const finalNote = (note && note.trim())
    || `Rolled back to v${source.version}${source.note ? `: ${source.note}` : ''}`;

  return bumpVersion(source.project_id, source.environment, {
    note: finalNote,
    userName: userName || 'system',
    isPublished: true,
  });
}

/**
 * Net-diff between the live draft tables and the last published snapshot.
 *
 * Returns the number of *effective* pending changes. Flipping a flag on then
 * off again leaves the diff at 0 — we compare end-states, not history.
 *
 * draftCount counts every flag/config key whose live value differs from the
 * published snapshot (added, removed, or changed). Type changes on a config
 * value also count as a change.
 */
async function getDraftStatus(projectId, environment) {
  const { rows: pubRows } = await query(
    `SELECT version, snapshot FROM config_versions
      WHERE project_id = $1 AND environment = $2 AND is_published = TRUE
      ORDER BY version DESC LIMIT 1`,
    [projectId, environment],
  );

  const publishedVersion = pubRows[0]?.version || 0;
  const publishedSnap = pubRows[0]?.snapshot || { features: {}, config: {}, _meta: { config_types: {} } };
  const live = await captureSnapshot(projectId, environment);

  // No published version yet → every existing key is a pending change.
  if (publishedVersion === 0) {
    const initialChanges =
      Object.keys(live.features || {}).length + Object.keys(live.config || {}).length;
    return { publishedVersion: 0, draftCount: initialChanges };
  }

  const pubFeatures = publishedSnap.features || {};
  const liveFeatures = live.features || {};
  const featureKeys = new Set([...Object.keys(pubFeatures), ...Object.keys(liveFeatures)]);
  let changes = 0;
  for (const k of featureKeys) {
    if (pubFeatures[k] !== liveFeatures[k]) changes += 1;
  }

  const pubConfig = publishedSnap.config || {};
  const liveConfig = live.config || {};
  const pubTypes = (publishedSnap._meta && publishedSnap._meta.config_types) || {};
  const liveTypes = (live._meta && live._meta.config_types) || {};
  const configKeys = new Set([...Object.keys(pubConfig), ...Object.keys(liveConfig)]);
  for (const k of configKeys) {
    // Stringify because configs can be objects/arrays (json type) and Object.is would fail.
    const same =
      JSON.stringify(pubConfig[k]) === JSON.stringify(liveConfig[k]) &&
      pubTypes[k] === liveTypes[k];
    if (!same) changes += 1;
  }

  return { publishedVersion, draftCount: changes };
}

module.exports = {
  bumpVersion,
  getCurrent,
  list,
  getById,
  publish,
  promote,
  rollback,
  getDraftStatus,
};
