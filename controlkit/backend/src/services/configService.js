const { query } = require('../db/pool');
const audit = require('./auditService');
const versions = require('./versionsService');
const { HttpError } = require('../middleware/errorHandler');

const VALID_TYPES = ['string', 'int', 'boolean', 'json'];

function validateType(type) {
  if (!VALID_TYPES.includes(type)) {
    throw new HttpError(400, `type must be one of: ${VALID_TYPES.join(', ')}`);
  }
}

/**
 * Convert a stored row (value is always TEXT) into a real JS value.
 * Used by the SDK `/sdk/config` endpoint so the SDK gets typed data.
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

function encodeValue(value, type) {
  if (type === 'json') return typeof value === 'string' ? value : JSON.stringify(value);
  if (type === 'boolean') return String(!!value);
  if (type === 'int') return String(parseInt(value, 10));
  return String(value);
}

async function list({ projectId, environment }) {
  const params = [];
  const where = [];
  if (projectId) { params.push(projectId); where.push(`project_id = $${params.length}`); }
  if (environment) { params.push(environment); where.push(`environment = $${params.length}`); }
  const sql = `SELECT * FROM config_values ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY key`;
  const { rows } = await query(sql, params);
  return rows;
}

async function getById(id) {
  const { rows } = await query('SELECT * FROM config_values WHERE id = $1', [id]);
  if (rows.length === 0) throw new HttpError(404, 'Config value not found');
  return rows[0];
}

async function create({ projectId, key, value, type, environment, userName }) {
  if (!projectId || !key || value === undefined || !type || !environment) {
    throw new HttpError(400, 'projectId, key, value, type and environment are required');
  }
  validateType(type);
  const encoded = encodeValue(value, type);

  const { rows } = await query(
    `INSERT INTO config_values (project_id, key, value, type, environment)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [projectId, key, encoded, type, environment],
  );
  const row = rows[0];
  await audit.record({
    projectId, entityType: 'config_value', entityId: row.id,
    action: 'create', newValue: row, userName,
  });
  await versions.bumpVersion(projectId, environment);
  return row;
}

async function update({ id, value, type, userName }) {
  const before = await getById(id);
  const nextType = type || before.type;
  validateType(nextType);
  const encoded = value === undefined ? before.value : encodeValue(value, nextType);

  const { rows } = await query(
    `UPDATE config_values SET value = $1, type = $2, updated_at = NOW()
     WHERE id = $3 RETURNING *`,
    [encoded, nextType, id],
  );
  const after = rows[0];
  await audit.record({
    projectId: before.project_id, entityType: 'config_value', entityId: id,
    action: 'update', oldValue: before, newValue: after, userName,
  });
  await versions.bumpVersion(before.project_id, before.environment);
  return after;
}

async function remove({ id, userName }) {
  const before = await getById(id);
  await query('DELETE FROM config_values WHERE id = $1', [id]);
  await audit.record({
    projectId: before.project_id, entityType: 'config_value', entityId: id,
    action: 'delete', oldValue: before, userName,
  });
  await versions.bumpVersion(before.project_id, before.environment);
}

module.exports = { list, getById, create, update, remove, decodeValue };
