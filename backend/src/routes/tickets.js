const { pool, allowedOrigin } = require('../db');

async function purchaseTicket(res, data) {
  // Validate required fields for ticket purchase
  const { TicketType, Price, FirstName, LastName, PhoneNumber, Email, BirthDate, EntryDate, parkingId } = data;
  if (!TicketType || Price == null || !FirstName || !LastName || !PhoneNumber || !Email || !EntryDate) {
    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin });
    return res.end(JSON.stringify({ error: 'Missing required ticket fields' }));
  }
  try {
    // Insert new ticket record (EntryTime unused, ExpirationDate = EntryDate + 1 day for simplicity)
    const ticketSql = 'INSERT INTO ticket (TicketType, Price, EntryTime, ExpirationDate) VALUES (?, ?, ?, ?)';
    const entryTime = null;
    const entryDateObj = new Date(EntryDate);
    const nextDay = new Date(entryDateObj.getTime() + 24*60*60*1000);
    const expirationDate = nextDay.toISOString().split('T')[0];  // format as YYYY-MM-DD
    const [ticketResult] = await pool.execute(ticketSql, [TicketType, Price, entryTime, expirationDate]);
    const newTicketId = ticketResult.insertId;
    // Insert visitor details linked to the TicketID
    const visitorSql = 'INSERT INTO visitors (TicketID, FirstName, LastName, PhoneNumber, Email, BirthDate, EntryDate) VALUES (?, ?, ?, ?, ?, ?, ?)';
    await pool.execute(visitorSql, [
      newTicketId,
      FirstName,
      LastName,
      PhoneNumber,
      Email,
      BirthDate || null,
      EntryDate
    ]);
    // If a parking spot ID was provided, reserve that spot
    if (parkingId) {
      // Check that the spot is currently available
      const [checkRows] = await pool.execute(
        'SELECT availability FROM parking WHERE ParkingID = ? AND availability = 1',
        [parkingId]
      );
      if (checkRows.length === 0) {
        res.writeHead(409, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin });
        return res.end(JSON.stringify({ error: 'Selected parking spot is not available' }));
      }
      // Mark the parking spot as taken (availability = 0)
      await pool.execute('UPDATE parking SET availability = 0 WHERE ParkingID = ?', [parkingId]);
      // Record the parking reservation for that date (associate with EntryDate)
      await pool.execute(
        'INSERT INTO parking_reservation (ParkingID, reservation_date) VALUES (?, ?)',
        [parkingId, EntryDate]
      );
    }
    res.writeHead(201, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin });
    res.end(JSON.stringify({ message: 'Ticket purchased successfully', ticketId: newTicketId }));
  } catch (err) {
    // Handle database errors (e.g., constraint violations)
    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin });
    res.end(JSON.stringify({ error: 'Database error during ticket purchase' }));
  }
}

module.exports = { purchaseTicket };
