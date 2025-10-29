import { query } from '../db.js';
import { requireRole } from '../middleware/auth.js';
import { pick } from '../utils/object.js';

export function registerIncidentRoutes(router) {
  router.get('/incidents', requireRole(['employee', 'manager', 'admin', 'owner'])(async ctx => {
    const rows = await query(`
      SELECT i.IncidentID, i.IncidentType, it.TypeName, i.StatusID, ist.StatusName,
             i.EmployeeID, i.TicketID, i.OccurredAt, i.Location, i.Severity, i.Details
      FROM incidents i
      LEFT JOIN incident_type it ON it.TypeID = i.IncidentType
      LEFT JOIN incident_status ist ON ist.StatusID = i.StatusID
      ORDER BY i.OccurredAt DESC, i.IncidentID DESC
      LIMIT 500
    `).catch(() => []);
    ctx.ok({
      data: rows.map(row => ({
        IncidentID: row.IncidentID,
        IncidentType: row.IncidentType,
        incident_type_name: row.TypeName,
        StatusID: row.StatusID,
        status_name: row.StatusName,
        EmployeeID: row.EmployeeID,
        TicketID: row.TicketID,
        OccurredAt: row.OccurredAt,
        Location: row.Location,
        Severity: row.Severity,
        Details: row.Details,
      })),
    });
  }));

  router.get('/incidents/meta', requireRole(['employee', 'manager', 'admin', 'owner'])(async ctx => {
    const [types, statuses] = await Promise.all([
      query('SELECT TypeID, TypeName FROM incident_type ORDER BY TypeName').catch(() => []),
      query('SELECT StatusID, StatusName FROM incident_status ORDER BY StatusID').catch(() => []),
    ]);
    ctx.ok({
      data: {
        types: types.map(row => ({ id: row.TypeID, name: row.TypeName })),
        statuses: statuses.map(row => ({ id: row.StatusID, name: row.StatusName })),
        severities: [1, 2, 3, 4, 5],
      },
    });
  }));

  router.post('/incidents', requireRole(['manager', 'admin', 'owner'])(async ctx => {
    const incidentType = Number(pick(ctx.body, 'incidentType', 'IncidentType'));
    const statusId = Number(pick(ctx.body, 'statusId', 'StatusID')) || 1;
    const employeeId = pick(ctx.body, 'employeeId', 'EmployeeID');
    const ticketId = pick(ctx.body, 'ticketId', 'TicketID');
    const occurredAtRaw = pick(ctx.body, 'occurredAt', 'OccurredAt');
    const location = pick(ctx.body, 'location', 'Location');
    const severityRaw = pick(ctx.body, 'severity', 'Severity');
    const details = pick(ctx.body, 'details', 'Details');

    if (!incidentType) {
      ctx.error(400, 'Incident type is required.');
      return;
    }
    const severity = severityRaw ? Number(severityRaw) : 1;
    if (!Number.isInteger(severity) || severity < 1 || severity > 5) {
      ctx.error(400, 'Severity must be an integer between 1 and 5.');
      return;
    }
    const occurredAt = occurredAtRaw ? new Date(occurredAtRaw) : new Date();
    if (Number.isNaN(occurredAt.getTime())) {
      ctx.error(400, 'Invalid occurrence date.');
      return;
    }

    const result = await query(
      'INSERT INTO incidents (IncidentType, StatusID, EmployeeID, TicketID, OccurredAt, Location, Severity, Details) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        incidentType,
        statusId,
        employeeId ? Number(employeeId) : null,
        ticketId ? Number(ticketId) : null,
        occurredAt.toISOString().slice(0, 19).replace('T', ' '),
        location || null,
        severity,
        details || null,
      ],
    );
    ctx.created({
      data: {
        IncidentID: result.insertId,
        IncidentType: incidentType,
        StatusID: statusId,
        EmployeeID: employeeId ? Number(employeeId) : null,
        TicketID: ticketId ? Number(ticketId) : null,
        OccurredAt: occurredAt.toISOString(),
        Location: location || null,
        Severity: severity,
        Details: details || null,
      },
    });
  }));

  router.put('/incidents/:id', requireRole(['manager', 'admin', 'owner'])(async ctx => {
    const id = Number(ctx.params.id);
    if (!id) {
      ctx.error(400, 'Incident id is required.');
      return;
    }

    const fields = [];
    const values = [];

    function setField(column, value) {
      if (value === undefined) return;
      if (value === null || value === '') {
        fields.push(`${column} = NULL`);
      } else {
        fields.push(`${column} = ?`);
        values.push(value);
      }
    }

    const incidentType = pick(ctx.body, 'incidentType', 'IncidentType');
    const statusId = pick(ctx.body, 'statusId', 'StatusID');
    const employeeId = pick(ctx.body, 'employeeId', 'EmployeeID');
    const ticketId = pick(ctx.body, 'ticketId', 'TicketID');
    const occurredAt = pick(ctx.body, 'occurredAt', 'OccurredAt');
    const location = pick(ctx.body, 'location', 'Location');
    const severity = pick(ctx.body, 'severity', 'Severity');
    const details = pick(ctx.body, 'details', 'Details');

    if (incidentType !== undefined) setField('IncidentType', incidentType ? Number(incidentType) : null);
    if (statusId !== undefined) setField('StatusID', statusId ? Number(statusId) : null);
    if (employeeId !== undefined) setField('EmployeeID', employeeId ? Number(employeeId) : null);
    if (ticketId !== undefined) setField('TicketID', ticketId ? Number(ticketId) : null);
    if (location !== undefined) setField('Location', location || null);
    if (details !== undefined) setField('Details', details || null);
    if (severity !== undefined) {
      if (severity === null || severity === '') {
        setField('Severity', null);
      } else {
        const sevNum = Number(severity);
        if (!Number.isInteger(sevNum) || sevNum < 1 || sevNum > 5) {
          ctx.error(400, 'Severity must be an integer between 1 and 5.');
          return;
        }
        setField('Severity', sevNum);
      }
    }
    if (occurredAt !== undefined) {
      if (!occurredAt) {
        setField('OccurredAt', null);
      } else {
        const date = new Date(occurredAt);
        if (Number.isNaN(date.getTime())) {
          ctx.error(400, 'Invalid occurrence date.');
          return;
        }
        setField('OccurredAt', date.toISOString().slice(0, 19).replace('T', ' '));
      }
    }

    if (!fields.length) {
      ctx.error(400, 'Nothing to update.');
      return;
    }

    const result = await query(
      `UPDATE incidents SET ${fields.join(', ')} WHERE IncidentID = ?`,
      [...values, id],
    );
    if (!result.affectedRows) {
      ctx.error(404, 'Incident not found.');
      return;
    }
    ctx.ok({ data: { IncidentID: id } });
  }));
}
