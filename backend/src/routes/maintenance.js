const { pool, allowedOrigin } = require('../db');

async function getMaintenanceRecords(res) {
  // Query maintenance records that are not yet fixed
  const query = `SELECT m.RecordID, m.AttractionID, a.Name AS AttractionName,
                        m.Date_broken_down, m.Issue_reported, m.Severity_of_report,
                        m.pre_condition_status, m.Date_fixed, m.Description_of_work,
                        m.post_condition_status, m.Safety_check_status
                 FROM maintenance_records m
                 JOIN attraction a ON m.AttractionID = a.AttractionID
                 WHERE m.Date_fixed IS NULL`;
  const [rows] = await pool.query(query);
  res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin });
  res.end(JSON.stringify(rows));
}

async function updateMaintenance(res, recordId, data) {
  // Allowable fields to update for a maintenance record
  const allowedFields = [
    'Date_fixed',
    'Description_of_work',
    'Duration_of_repair',
    'post_condition_status',
    'Safety_check_status',
    'Approved_by_supervisor',
    'EmployeeID'
  ];
  const updates = [];
  const values = [];
  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      updates.push(`${field} = ?`);
      values.push(data[field]);
    }
  }
  if (updates.length === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin });
    return res.end(JSON.stringify({ error: 'No fields provided to update' }));
  }
  // If Date_fixed not provided in data, set it to today (mark as fixed)
  if (!data.Date_fixed) {
    const today = new Date().toISOString().split('T')[0];
    updates.push('Date_fixed = ?');
    values.push(today);
  }
  const sql = `UPDATE maintenance_records SET ${updates.join(', ')} WHERE RecordID = ?`;
  values.push(recordId);
  const [result] = await pool.execute(sql, values);
  if (result.affectedRows === 0) {
    // No record updated (ID not found)
    res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin });
    return res.end(JSON.stringify({ error: 'Maintenance record not found' }));
  }
  res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin });
  res.end(JSON.stringify({ message: 'Maintenance record updated' }));
}

module.exports = { getMaintenanceRecords, updateMaintenance };
