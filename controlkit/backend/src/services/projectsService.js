const { query } = require('../db/pool');
const audit = require('./auditService');

async function list() {
  const { rows } = await query('SELECT * FROM projects ORDER BY created_at DESC');
  return rows;
}

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
  return project;
}

module.exports = { list, create };
