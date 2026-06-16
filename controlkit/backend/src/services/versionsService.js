const { query } = require('../db/pool');

/**
 * Bumps the config version for (project, environment).
 * The SDK uses this number to know whether its cache is stale.
 * Called by flag/config mutations.
 */
async function bumpVersion(projectId, environment) {
  const { rows } = await query(
    `SELECT COALESCE(MAX(version), 0) + 1 AS next
       FROM config_versions
      WHERE project_id = $1 AND environment = $2`,
    [projectId, environment],
  );
  const next = rows[0].next;
  await query(
    `INSERT INTO config_versions (project_id, version, environment) VALUES ($1,$2,$3)`,
    [projectId, next, environment],
  );
  return next;
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

module.exports = { bumpVersion, getCurrent };
