const flagsService = require('../services/flagsService');

async function list(req, res, next) {
  try {
    const { projectId, environment } = req.query;
    res.json(await flagsService.list({ projectId, environment }));
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { projectId, name, enabled, environment, userName } = req.body || {};
    const flag = await flagsService.create({ projectId, name, enabled, environment, userName });
    res.status(201).json(flag);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { enabled, name, userName } = req.body || {};
    const flag = await flagsService.update({ id: req.params.id, enabled, name, userName });
    res.json(flag);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await flagsService.remove({ id: req.params.id, userName: req.body?.userName });
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = { list, create, update, remove };
