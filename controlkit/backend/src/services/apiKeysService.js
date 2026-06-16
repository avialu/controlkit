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

module.exports = { listByProject, create, generateKey };
