const auditService = require('../services/auditService');

async function list(req, res, next) {
  try {
    const { projectId, limit } = req.query;
    const rows = await auditService.list({
      projectId,
      limit: limit ? parseInt(limit, 10) : 100,
    });
    res.json(rows);
  } catch (err) { next(err); }
}

module.exports = { list };
