const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');

async function run() {
  const dir = path.join(__dirname, '..', '..', 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

  console.log(`Found ${files.length} migration file(s).`);

  for (const file of files) {
    const full = path.join(dir, file);
    const sql = fs.readFileSync(full, 'utf8');
    console.log(`→ Applying ${file}`);
    await pool.query(sql);
  }

  console.log('Migrations complete.');
  await pool.end();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
