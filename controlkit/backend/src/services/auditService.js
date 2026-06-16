const { query } = require('../db/pool');

/**
 * Writes one row to audit_logs. Called by every mutation in the service layer.
 *
 * @param {object} entry
 * @param {string} entry.projectId
 * @param {string} entry.entityType  e.g. 'flag', 'config_value', 'project'
 * @param {string|null} entry.entityId
 * @param {string} entry.action      'create' | 'update' | 'delete'
 * @param {object|null} entry.oldValue
 * @param {object|null} entry.newValue
 * @param {string} [entry.userName]  defaults to 'system'
 */
async function record(entry) {
  const {
    projectId,
    entityType,
    entityId = null,
    action,
    oldValue = null,
    newValue = null,
    userName = 'system',
  } = entry;

  await query(
    `INSERT INTO audit_logs (project_id, entity_type, entity_id, action, old_value, new_value, user_name)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [projectId, entityType, entityId, action, oldValue, newValue, userName],
  );
}

async function list({ projectId, limit = 100 }) {
  const params = [];
  let where = '';
  if (projectId) {
    params.push(projectId);
    where = `WHERE project_id = $${params.length}`;
  }
  params.push(limit);
  const { rows } = await query(
    `SELECT * FROM audit_logs ${where} ORDER BY timestamp DESC LIMIT $${params.length}`,
    params,
  );
  return rows;
}

module.exports = { record, list };
