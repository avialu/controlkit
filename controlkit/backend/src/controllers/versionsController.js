const versionsService = require('../services/versionsService');
const auditService = require('../services/auditService');

async function list(req, res, next) {
  try {
    const { projectId, environment, publishedOnly, limit } = req.query;
    const rows = await versionsService.list({
      projectId,
      environment,
      publishedOnly: publishedOnly === 'true',
      limit: limit ? parseInt(limit, 10) : 100,
    });
    res.json(rows);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    res.json(await versionsService.getById(req.params.id));
  } catch (err) { next(err); }
}

async function publish(req, res, next) {
  try {
    const { projectId, environment, note, userName } = req.body || {};
    const row = await versionsService.publish({ projectId, environment, note, userName });

    await auditService.record({
      projectId,
      entityType: 'version',
      entityId: row.id,
      action: 'publish',
      newValue: { version: row.version, environment, note: row.note },
      userName: userName || 'system',
    });

    res.status(201).json(row);
  } catch (err) { next(err); }
}

module.exports = { list, getOne, publish };
