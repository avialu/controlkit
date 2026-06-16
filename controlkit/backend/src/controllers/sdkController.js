const flagsService = require('../services/flagsService');
const configService = require('../services/configService');
const versionsService = require('../services/versionsService');

/**
 * GET /sdk/config
 *
 * Returns one bundled JSON for the SDK. apiKeyAuth middleware has already
 * verified the key and attached `req.apiKey = { project_id, environment }`.
 *
 *   {
 *     "version": 1,
 *     "environment": "production",
 *     "features": { ... },
 *     "config":   { ... }
 *   }
 */
async function getConfig(req, res, next) {
  try {
    const { project_id: projectId, environment } = req.apiKey;

    const [flags, configRows, version] = await Promise.all([
      flagsService.list({ projectId, environment }),
      configService.list({ projectId, environment }),
      versionsService.getCurrent(projectId, environment),
    ]);

    const features = {};
    for (const flag of flags) features[flag.name] = flag.enabled;

    const config = {};
    for (const row of configRows) config[row.key] = configService.decodeValue(row);

    res.json({ version, environment, features, config });
  } catch (err) {
    next(err);
  }
}

module.exports = { getConfig };
