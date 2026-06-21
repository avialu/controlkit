const { query } = require('../db/pool');
const audit = require('./auditService');
const apiKeysService = require('./apiKeysService');

const DEFAULT_ENV = 'production';

async function list() {
  const { rows } = await query('SELECT * FROM projects ORDER BY created_at DESC');
  return rows;
}

/**
 * Creates a project AND auto-mints a `production` API key for it so the
 * project is immediately usable from an SDK / curl. Without this, a fresh
 * project has zero environments and the portal sits in an empty-state.
 */
async function create({ name, userName }) {
  const { rows } = await query(
    'INSERT INTO projects (name) VALUES ($1) RETURNING *',
    [name],
  );
  const project = rows[0];
  await audit.record({
    projectId: project.id,
    entityType: 'project',
    entityId: project.id,
    action: 'create',
    newValue: project,
    userName,
  });

  await apiKeysService.create({
    projectId: project.id,
    environment: DEFAULT_ENV,
    userName,
  });

  return project;
}

module.exports = { list, create };
