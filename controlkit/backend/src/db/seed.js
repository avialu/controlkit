require('dotenv').config();
const { pool, query } = require('./pool');
const apiKeysService = require('../services/apiKeysService');
const versionsService = require('../services/versionsService');

const ENVIRONMENTS = ['production', 'staging'];
const DEMO_PROJECT_NAME = 'Demo Project';

const FLAG_SEEDS = [
  { name: 'dark_mode',             enabled: false },
  { name: 'new_version_available', enabled: false },
  { name: 'show_promo_banner',     enabled: true  },
  { name: 'show_buy_button',       enabled: true  },
];

const CONFIG_SEEDS = [
  { key: 'welcome_text',   value: 'ControlKit Store',                          type: 'string' },
  { key: 'promo_text',     value: '🔥 Summer sale — up to 40% off!',           type: 'string' },
  { key: 'update_message', value: 'Version 2.0 is here — faster and smoother.', type: 'string' },
  { key: 'max_items',      value: '8',                                         type: 'int'    },
];

async function ensureProject() {
  const existing = await query(
    'SELECT * FROM projects WHERE name = $1 LIMIT 1',
    [DEMO_PROJECT_NAME],
  );
  if (existing.rows.length) {
    console.log(`Project "${DEMO_PROJECT_NAME}" already exists.`);
    return existing.rows[0];
  }
  const { rows } = await query(
    'INSERT INTO projects (name) VALUES ($1) RETURNING *',
    [DEMO_PROJECT_NAME],
  );
  console.log(`Created project "${DEMO_PROJECT_NAME}"`);
  return rows[0];
}

async function ensureApiKey(projectId, environment) {
  const existing = await query(
    'SELECT * FROM api_keys WHERE project_id = $1 AND environment = $2 LIMIT 1',
    [projectId, environment],
  );
  if (existing.rows.length) return existing.rows[0];

  const key = apiKeysService.generateKey();
  const { rows } = await query(
    'INSERT INTO api_keys (project_id, key, environment) VALUES ($1,$2,$3) RETURNING *',
    [projectId, key, environment],
  );
  console.log(`Created ${environment} API key`);
  return rows[0];
}

async function ensureFlag(projectId, environment, { name, enabled }) {
  const { rows } = await query(
    `INSERT INTO flags (project_id, name, enabled, environment)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (project_id, environment, name) DO NOTHING
     RETURNING *`,
    [projectId, name, enabled, environment],
  );
  if (rows.length) console.log(`  + flag ${environment}/${name} = ${enabled}`);
}

async function ensureConfig(projectId, environment, { key, value, type }) {
  const { rows } = await query(
    `INSERT INTO config_values (project_id, key, value, type, environment)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (project_id, environment, key) DO NOTHING
     RETURNING *`,
    [projectId, key, value, type, environment],
  );
  if (rows.length) console.log(`  + config ${environment}/${key} = ${value} (${type})`);
}

async function run() {
  const project = await ensureProject();

  for (const env of ENVIRONMENTS) {
    const apiKey = await ensureApiKey(project.id, env);

    console.log(`Seeding flags for ${env}…`);
    for (const f of FLAG_SEEDS) await ensureFlag(project.id, env, f);

    console.log(`Seeding config for ${env}…`);
    for (const c of CONFIG_SEEDS) await ensureConfig(project.id, env, c);

    // Auto-publish the initial state so the SDK has something to serve out
    // of the box. After this, the SDK only sees changes once you click
    // Publish in the portal.
    await versionsService.publish({
      projectId: project.id,
      environment: env,
      note: 'Initial release (seeded)',
      userName: 'seed',
    });

    console.log(`\n${env.toUpperCase()} API key: ${apiKey.key}\n`);
  }

  console.log('Seed complete.');
  console.log(`Project ID: ${project.id}`);
  await pool.end();
}

run().catch(async (err) => {
  console.error('Seed failed:', err);
  try { await pool.end(); } catch (_) { /* noop */ }
  process.exit(1);
});
