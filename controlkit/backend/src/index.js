require('dotenv').config();
const { buildApp } = require('./app');

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
const app = buildApp();

app.listen(port, () => {
  console.log(`ControlKit backend listening on http://localhost:${port}`);
});
