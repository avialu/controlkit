const projectsService = require('../services/projectsService');
const apiKeysService = require('../services/apiKeysService');

async function list(req, res, next) {
  try { res.json(await projectsService.list()); } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { name } = req.body || {};
    const project = await projectsService.create({ name, userName: req.body?.userName });
    res.status(201).json(project);
  } catch (err) { next(err); }
}

async function createApiKey(req, res, next) {
  try {
    const { environment } = req.body || {};
    const key = await apiKeysService.create({
      projectId: req.params.id,
      environment,
      userName: req.body?.userName,
    });
    res.status(201).json(key);
  } catch (err) { next(err); }
}

async function listApiKeys(req, res, next) {
  try {
    res.json(await apiKeysService.listByProject(req.params.id));
  } catch (err) { next(err); }
}

module.exports = { list, create, createApiKey, listApiKeys };
