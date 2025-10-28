import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT||3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
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
