const crypto = require('crypto');
const { query } = require('../db/pool');
const audit = require('./auditService');

function generateKey() {
  return 'ck_' + crypto.randomBytes(24).toString('hex');
}

async function listByProject(projectId) {
  const { rows } = await query(
    'SELECT * FROM api_keys WHERE project_id = $1 ORDER BY created_at DESC',
    [projectId],
  );
  return rows;
}

async function create({ projectId, environment, userName }) {
  const key = generateKey();
  const { rows } = await query(
    'INSERT INTO api_keys (project_id, key, environment) VALUES ($1,$2,$3) RETURNING *',
    [projectId, key, environment],
  );
  const apiKey = rows[0];
  await audit.record({
    projectId,
    entityType: 'api_key',
    entityId: apiKey.id,
    action: 'create',
    newValue: { environment, key_prefix: key.slice(0, 8) + '…' },
    userName,
  });
  return apiKey;
}

/**
 * Returns the unique set of environment names that exist for a project,
 * sourced from anything that has an `environment` column. This gives the
 * portal a dynamic list to render in EnvPicker / Promote dropdowns without
 * needing a dedicated `environments` table.
 */
async function listEnvironmentsForProject(projectId) {
  const { rows } = await query(
    `SELECT environment FROM api_keys      WHERE project_id = $1
       UNION
     SELECT environment FROM flags          WHERE project_id = $1
       UNION
     SELECT environment FROM config_values  WHERE project_id = $1
     ORDER BY environment ASC`,
    [projectId],
  );
  return rows.map((r) => r.environment);
}

module.exports = { listByProject, create, generateKey, listEnvironmentsForProject };
