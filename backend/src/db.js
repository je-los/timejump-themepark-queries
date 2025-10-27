const mysql = require('mysql2/promise');

// Load environment variables (if not already loaded elsewhere)
if (!process.env.DB_HOST) {
  require('dotenv').config();
}

const config = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

// Create a promise-based MySQL connection pool:contentReference[oaicite:6]{index=6}
const pool = mysql.createPool(config);

// CORS origin allowed (from .env or default to localhost:5173)
const allowedOrigin = process.env.CLIENT_ORIGIN || '*';

module.exports = { pool, allowedOrigin };
