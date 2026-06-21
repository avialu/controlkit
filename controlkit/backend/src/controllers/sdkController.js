const { query } = require('../db/pool');
const flagsService = require('../services/flagsService');
const configService = require('../services/configService');

/**
 * GET /sdk/config
 *
 * Returns the latest PUBLISHED snapshot for the SDK. The portal's "live"
 * tables (`flags`, `config_values`) are drafts and are NOT served here —
 * the developer must click Publish in the portal to release them.
 *
 * For brand-new projects with no published version yet, we fall back to
 * the live tables so the demo works out of the box. After the first
 * publish, the gate becomes real.
 */
async function getConfig(req, res, next) {
  try {
    const { project_id: projectId, environment } = req.apiKey;

    const { rows } = await query(
      `SELECT version, snapshot
         FROM config_versions
        WHERE project_id = $1 AND environment = $2 AND is_published = TRUE
        ORDER BY version DESC
        LIMIT 1`,
      [projectId, environment],
    );

    if (rows.length > 0 && rows[0].snapshot) {
      const snap = rows[0].snapshot;
      return res.json({
        version: rows[0].version,
        environment,
        features: snap.features || {},
        config: snap.config || {},
      });
    }

    // Fallback: no published version yet — serve live draft tables so the
    // SDK isn't stuck with empty config on a freshly-created project.
    const [flags, configRows] = await Promise.all([
      flagsService.list({ projectId, environment }),
      configService.list({ projectId, environment }),
    ]);
    const features = {};
    for (const flag of flags) features[flag.name] = flag.enabled;
    const config = {};
    for (const row of configRows) config[row.key] = configService.decodeValue(row);

    res.json({ version: 0, environment, features, config });
  } catch (err) {
    next(err);
  }
}

module.exports = { getConfig };
