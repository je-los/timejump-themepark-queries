const { pool, allowedOrigin } = require('../db');

async function getParking(res) {
  // Query parking availability summary (available vs total spaces per lot)
  const query = `SELECT parking_lot_name AS lot,
                        COUNT(*) AS total_spaces,
                        SUM(CASE WHEN availability = 1 THEN 1 ELSE 0 END) AS available_spaces
                 FROM parking
                 GROUP BY parking_lot_name`;
  const [rows] = await pool.query(query);
  res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin });
  res.end(JSON.stringify(rows));
}

module.exports = { getParking };
