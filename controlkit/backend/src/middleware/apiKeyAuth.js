const { query } = require('../db/pool');
const { HttpError } = require('./errorHandler');

/**
 * Validates the SDK API key.
 *
 * Looks at:
 *   - header `x-api-key` (preferred) OR query `?apiKey=`
 *   - query `?environment=` (optional). If supplied, must match the key's env.
 *
 * Attaches `req.apiKey` = { project_id, environment } on success.
 */
async function apiKeyAuth(req, _res, next) {
  try {
    const key = req.header('x-api-key') || req.query.apiKey;
    if (!key) throw new HttpError(401, 'Missing API key');

    const { rows } = await query(
      'SELECT project_id, environment FROM api_keys WHERE key = $1 LIMIT 1',
      [key],
    );
    if (rows.length === 0) throw new HttpError(401, 'Invalid API key');

    const requestedEnv = req.query.environment;
    if (requestedEnv && requestedEnv !== rows[0].environment) {
      throw new HttpError(403, 'API key not valid for requested environment');
    }

    req.apiKey = rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { apiKeyAuth };
