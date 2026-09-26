const app = require('../backend/app');
const { initializeDatabase } = require('../backend/db');

let dbInitialized = false;

module.exports = async (req, res) => {
  if (!dbInitialized) {
    try {
      await initializeDatabase();
      dbInitialized = true;
    } catch (err) {
      console.warn('[Vercel DB Init Notice]', err.message);
    }
  }
  return app(req, res);
};
