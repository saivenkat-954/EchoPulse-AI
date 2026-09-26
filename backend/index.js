require('dotenv').config();
const app = require('./app');
const { initializeDatabase } = require('./db');

async function start() {
  try {
    await initializeDatabase();
    const port = Number(process.env.PORT || 4000);
    app.listen(port, () => console.log(`EcoPulse API listening on http://localhost:${port}`));
  } catch (e) {
    console.error('[Startup] Failed:', e.message);
    process.exit(1);
  }
}

start();
