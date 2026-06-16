const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const sdkRoutes = require('./routes/sdkRoutes');
const portalRoutes = require('./routes/portalRoutes');
const { errorHandler } = require('./middleware/errorHandler');

function buildApp() {
  const app = express();

  const origin = (process.env.CORS_ORIGIN || '*')
    .split(',')
    .map((s) => s.trim());

  app.use(cors({ origin }));
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('dev'));

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.use('/sdk', sdkRoutes);
  app.use('/portal', portalRoutes);

  app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));
  app.use(errorHandler);

  return app;
}

module.exports = { buildApp };
