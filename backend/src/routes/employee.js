const { pool, allowedOrigin } = require('../db');

async function loginEmployee(res, data) {
  const { email } = data;
  if (!email) {
    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin });
    return res.end(JSON.stringify({ error: 'Email is required' }));
  }
  // Look up employee by email (demo authentication)
  const [rows] = await pool.execute(
    'SELECT employeeID, name, role, email FROM employee WHERE email = ?',
    [email]
  );
  if (rows.length === 0) {
    // No matching employee found
    res.writeHead(401, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin });
    return res.end(JSON.stringify({ error: 'Invalid credentials' }));
  }
  // Login successful – return basic employee info
  const employee = rows[0];
  res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin });
  res.end(JSON.stringify({ message: 'Login successful', employee }));
}

async function getVisitors(res) {
  // Query all visitors with their ticket type and price
  const query = `SELECT v.FirstName, v.LastName, v.PhoneNumber, v.Email, v.EntryDate,
                        t.TicketType, t.Price
                 FROM visitors v
                 JOIN ticket t ON v.TicketID = t.TicketID`;
  const [rows] = await pool.query(query);
  res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin });
  res.end(JSON.stringify(rows));
}

module.exports = { loginEmployee, getVisitors };
