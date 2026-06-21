const express = require('express');
const rateLimit = require('express-rate-limit');
const { apiKeyAuth } = require('../middleware/apiKeyAuth');
const sdk = require('../controllers/sdkController');

const router = express.Router();

// 60 requests per minute per IP. The SDK background refresher polls every 30s,
// so this comfortably accommodates legitimate clients while blocking abuse.
const sdkLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,   // RateLimit-* headers
  legacyHeaders: false,    // disable X-RateLimit-*
  message: { error: 'Too many requests — slow down.' },
});

router.use(sdkLimiter);
router.get('/config', apiKeyAuth, sdk.getConfig);

module.exports = router;
