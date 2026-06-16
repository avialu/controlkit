const express = require('express');
const projects = require('../controllers/projectsController');
const flags = require('../controllers/flagsController');
const config = require('../controllers/configController');
const audit = require('../controllers/auditController');

const router = express.Router();

router.get('/projects', projects.list);
router.post('/projects', projects.create);
router.get('/projects/:id/api-keys', projects.listApiKeys);
router.post('/projects/:id/api-keys', projects.createApiKey);

router.get('/flags', flags.list);
router.post('/flags', flags.create);
router.put('/flags/:id', flags.update);
router.delete('/flags/:id', flags.remove);

router.get('/config', config.list);
router.post('/config', config.create);
router.put('/config/:id', config.update);
router.delete('/config/:id', config.remove);

router.get('/audit-logs', audit.list);

module.exports = router;
