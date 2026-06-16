const configService = require('../services/configService');

async function list(req, res, next) {
  try {
    const { projectId, environment } = req.query;
    const rows = await configService.list({ projectId, environment });
    const decoded = rows.map((r) => ({ ...r, decoded_value: configService.decodeValue(r) }));
    res.json(decoded);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { projectId, key, value, type, environment, userName } = req.body || {};
    const row = await configService.create({ projectId, key, value, type, environment, userName });
    res.status(201).json(row);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { value, type, userName } = req.body || {};
    const row = await configService.update({ id: req.params.id, value, type, userName });
    res.json(row);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await configService.remove({ id: req.params.id, userName: req.body?.userName });
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = { list, create, update, remove };
