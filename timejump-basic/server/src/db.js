import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const localEnvPath = resolve(__dirname, '../../.env.local');

dotenv.config({ path: localEnvPath, override: true });
dotenv.config();

console.log('[db] config', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  database: process.env.DB_NAME || 'themepark',
});

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  namedPlaceholders: true,
  multipleStatements: true,
  connectionLimit: 10,
});

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function verifyConnection() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();      // round-trip to confirm the server responds
    conn.release();
    console.log('MySQL connection ok');
  } catch (err) {
    console.error('MySQL connection failed:', err.message);
    process.exit(1);        // or handle however you prefer
  }
}

verifyConnection();
