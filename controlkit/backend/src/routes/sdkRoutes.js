const express = require('express');
const { apiKeyAuth } = require('../middleware/apiKeyAuth');
const sdk = require('../controllers/sdkController');

const router = express.Router();

router.get('/config', apiKeyAuth, sdk.getConfig);

module.exports = router;
