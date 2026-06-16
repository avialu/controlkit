const { query } = require('../db/pool');
const audit = require('./auditService');
const versions = require('./versionsService');
const { HttpError } = require('../middleware/errorHandler');

async function list({ projectId, environment }) {
  const params = [];
  const where = [];
  if (projectId) { params.push(projectId); where.push(`project_id = $${params.length}`); }
  if (environment) { params.push(environment); where.push(`environment = $${params.length}`); }
  const sql = `SELECT * FROM flags ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY name`;
  const { rows } = await query(sql, params);
  return rows;
}

async function getById(id) {
  const { rows } = await query('SELECT * FROM flags WHERE id = $1', [id]);
  if (rows.length === 0) throw new HttpError(404, 'Flag not found');
  return rows[0];
}

async function create({ projectId, name, enabled = false, environment, userName }) {
  if (!projectId || !name || !environment) {
    throw new HttpError(400, 'projectId, name and environment are required');
  }
  const { rows } = await query(
    `INSERT INTO flags (project_id, name, enabled, environment)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [projectId, name, !!enabled, environment],
  );
  const flag = rows[0];
  await audit.record({
    projectId, entityType: 'flag', entityId: flag.id,
    action: 'create', newValue: flag, userName,
  });
  await versions.bumpVersion(projectId, environment);
  return flag;
}

async function update({ id, enabled, name, userName }) {
  const before = await getById(id);

  const fields = [];
  const params = [];
  if (typeof enabled === 'boolean') { params.push(enabled); fields.push(`enabled = $${params.length}`); }
  if (typeof name === 'string')     { params.push(name);    fields.push(`name = $${params.length}`); }
  if (fields.length === 0) return before;
  fields.push(`updated_at = NOW()`);
  params.push(id);

  const { rows } = await query(
    `UPDATE flags SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params,
  );
  const after = rows[0];

  await audit.record({
    projectId: before.project_id, entityType: 'flag', entityId: id,
    action: 'update', oldValue: before, newValue: after, userName,
  });
  await versions.bumpVersion(before.project_id, before.environment);
  return after;
}

async function remove({ id, userName }) {
  const before = await getById(id);
  await query('DELETE FROM flags WHERE id = $1', [id]);
  await audit.record({
    projectId: before.project_id, entityType: 'flag', entityId: id,
    action: 'delete', oldValue: before, userName,
  });
  await versions.bumpVersion(before.project_id, before.environment);
}

module.exports = { list, getById, create, update, remove };
