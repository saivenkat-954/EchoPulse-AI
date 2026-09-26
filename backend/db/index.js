const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ecopulse';
const pool = new Pool({
  connectionString,
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  ssl: process.env.NODE_ENV === 'production' || connectionString.includes('supabase.com') ? { rejectUnauthorized: false } : false
});

async function query(text, params = []) {
  return pool.query(text, params);
}

async function initializeDatabase() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
}

async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tx = { query: (text, params = []) => client.query(text, params) };
    const result = await callback(tx);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, initializeDatabase, withTransaction };
