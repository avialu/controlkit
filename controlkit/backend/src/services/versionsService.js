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
  for (const c of configs) config[c.key] = decodeValue(c);

  return { features, config };
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

module.exports = { bumpVersion, getCurrent, list, getById, publish };
