import { query } from '../db.js';
import { requireRole } from '../middleware/auth.js';
import { getEnumValues } from '../services/dbUtils.js';
import { pick } from '../utils/object.js';

export function registerMaintenanceRoutes(router) {
  router.get('/maintenance', requireRole(['employee', 'manager', 'admin', 'owner'])(async ctx => {
    const filters = ctx.query || {};
    const start = String(filters.start || filters.dateStart || '').trim();
    const end = String(filters.end || filters.dateEnd || '').trim();
    const severityParam = String(filters.severity || filters.severities || '').trim();
    const typeParam = String(filters.type || filters.types || '').trim();
    const attractionParam = String(filters.attraction || '').trim();
    const search = String(filters.q || filters.search || '').trim();

    const toList = (value) => value
      ? value.split(',').map(v => v.trim()).filter(Boolean)
      : [];
    const severities = toList(severityParam).map(val => val.toLowerCase());
    const maintenanceTypes = toList(typeParam).map(val => val.toLowerCase());

    let sql = `
      SELECT mr.RecordID, mr.AttractionID, a.Name AS attraction_name, mr.EmployeeID,
             mr.Date_broken_down, mr.Date_fixed, mr.type_of_maintenance,
             mr.Description_of_work, mr.Duration_of_repair, mr.Severity_of_report,
             mr.SourceID, mr.Approved_by_supervisor
      FROM maintenance_records mr
      LEFT JOIN attraction a ON a.AttractionID = mr.AttractionID
      WHERE 1=1
    `;
    const params = [];
    if (start) {
      sql += ' AND mr.Date_broken_down >= ?';
      params.push(start);
    }
    if (end) {
      sql += ' AND mr.Date_broken_down <= ?';
      params.push(end);
    }
    if (severities.length) {
      sql += ` AND LOWER(mr.Severity_of_report) IN (${severities.map(() => '?').join(',')})`;
      params.push(...severities);
    }
    if (maintenanceTypes.length) {
      sql += ` AND LOWER(mr.type_of_maintenance) IN (${maintenanceTypes.map(() => '?').join(',')})`;
      params.push(...maintenanceTypes);
    }
    if (attractionParam) {
      if (/^\d+$/.test(attractionParam)) {
        sql += ' AND mr.AttractionID = ?';
        params.push(Number(attractionParam));
      } else {
        sql += ' AND a.Name LIKE ?';
        params.push(`%${attractionParam}%`);
      }
    }
    if (search) {
      sql += ' AND (a.Name LIKE ? OR mr.Description_of_work LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like);
    }
    sql += ' ORDER BY mr.Date_broken_down DESC, mr.RecordID DESC LIMIT 500';

    const rows = await query(sql, params).catch(() => []);
    ctx.ok({
      data: rows.map(row => ({
        RecordID: row.RecordID,
        AttractionID: row.AttractionID,
        attraction_name: row.attraction_name,
        EmployeeID: row.EmployeeID,
        Date_broken_down: row.Date_broken_down,
        Date_fixed: row.Date_fixed,
        type_of_maintenance: row.type_of_maintenance,
        Description_of_work: row.Description_of_work,
        Duration_of_repair: row.Duration_of_repair,
        Severity_of_report: row.Severity_of_report,
        SourceID: row.SourceID,
        Approved_by_supervisor: row.Approved_by_supervisor,
      })),
    });
  }));

  router.get('/maintenance/meta', requireRole(['employee', 'manager', 'admin', 'owner'])(async ctx => {
    const [types, severities, sources] = await Promise.all([
      getEnumValues('maintenance_records', 'type_of_maintenance'),
      getEnumValues('maintenance_records', 'Severity_of_report'),
      query('SELECT SourceID, SourceName FROM maintenance_source ORDER BY SourceID').catch(() => []),
    ]);
    ctx.ok({
      data: {
        types,
        severities,
        sources: sources.map(row => ({ id: row.SourceID, name: row.SourceName })),
      },
    });
  }));

  router.post('/maintenance', requireRole(['manager', 'admin', 'owner'])(async ctx => {
    const attractionId = Number(pick(ctx.body, 'attractionId', 'AttractionID'));
    const employeeId = pick(ctx.body, 'employeeId', 'EmployeeID');
    const sourceId = Number(pick(ctx.body, 'sourceId', 'SourceID')) || 1;
    const dateBroken = String(pick(ctx.body, 'dateBrokenDown', 'Date_broken_down', 'date_broken_down') || '').trim();
    const dateFixedRaw = pick(ctx.body, 'dateFixed', 'Date_fixed', 'date_fixed');
    const type = String(pick(ctx.body, 'typeOfMaintenance', 'type_of_maintenance') || '').trim() || null;
    const description = pick(ctx.body, 'descriptionOfWork', 'Description_of_work', 'description');
    const durationRaw = pick(ctx.body, 'durationOfRepair', 'Duration_of_repair', 'duration');
    const severity = String(pick(ctx.body, 'severityOfReport', 'Severity_of_report') || '').trim() || null;
    const approved = pick(ctx.body, 'approvedBySupervisor', 'Approved_by_supervisor');

    if (!attractionId || !dateBroken) {
      ctx.error(400, 'Attraction and broken date are required.');
      return;
    }
    const [types, severities] = await Promise.all([
      getEnumValues('maintenance_records', 'type_of_maintenance'),
      getEnumValues('maintenance_records', 'Severity_of_report'),
    ]);
    if (type && !types.includes(type)) {
      ctx.error(400, `Invalid maintenance type "${type}".`);
      return;
    }
    if (severity && !severities.includes(severity)) {
      ctx.error(400, `Invalid severity "${severity}".`);
      return;
    }
    let duration = null;
    if (durationRaw !== undefined && durationRaw !== null && String(durationRaw).trim() !== '') {
      duration = Number(durationRaw);
      if (!Number.isFinite(duration) || duration < 0) {
        ctx.error(400, 'Duration must be a positive number.');
        return;
      }
    }
    const dateFixed = dateFixedRaw ? String(dateFixedRaw).trim() || null : null;
    const approvedId = approved ? Number(approved) : null;
    const employee = employeeId ? Number(employeeId) : null;

    const result = await query(
      'INSERT INTO maintenance_records (AttractionID, EmployeeID, SourceID, Date_broken_down, Date_fixed, type_of_maintenance, Description_of_work, Duration_of_repair, Severity_of_report, Approved_by_supervisor) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        attractionId,
        employee || null,
        sourceId,
        dateBroken,
        dateFixed || null,
        type || (types.includes('repair') ? 'repair' : types[0] || 'repair'),
        description || null,
        duration,
        severity || (severities.includes('medium') ? 'medium' : severities[0] || 'medium'),
        approvedId || null,
      ],
    );
    ctx.created({
      data: {
        RecordID: result.insertId,
        AttractionID: attractionId,
        EmployeeID: employee || null,
        SourceID: sourceId,
        Date_broken_down: dateBroken,
        Date_fixed: dateFixed || null,
        type_of_maintenance: type,
        Description_of_work: description || null,
        Duration_of_repair: duration,
        Severity_of_report: severity,
        Approved_by_supervisor: approvedId || null,
      },
    });
  }));

  router.put('/maintenance/:id', requireRole(['manager', 'admin', 'owner'])(async ctx => {
    const id = Number(ctx.params.id);
    if (!id) {
      ctx.error(400, 'Maintenance record id is required.');
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

    const attractionId = pick(ctx.body, 'attractionId', 'AttractionID');
    const employeeId = pick(ctx.body, 'employeeId', 'EmployeeID');
    const sourceId = pick(ctx.body, 'sourceId', 'SourceID');
    const dateBroken = pick(ctx.body, 'dateBrokenDown', 'Date_broken_down', 'date_broken_down');
    const dateFixed = pick(ctx.body, 'dateFixed', 'Date_fixed', 'date_fixed');
    const type = pick(ctx.body, 'typeOfMaintenance', 'type_of_maintenance');
    const description = pick(ctx.body, 'descriptionOfWork', 'Description_of_work', 'description');
    const durationRaw = pick(ctx.body, 'durationOfRepair', 'Duration_of_repair', 'duration');
    const severity = pick(ctx.body, 'severityOfReport', 'Severity_of_report');
    const approved = pick(ctx.body, 'approvedBySupervisor', 'Approved_by_supervisor');

    if (type !== undefined) {
      const types = await getEnumValues('maintenance_records', 'type_of_maintenance');
      if (type && !types.includes(String(type))) {
        ctx.error(400, `Invalid maintenance type "${type}".`);
        return;
      }
      setField('type_of_maintenance', type);
    }
    if (severity !== undefined) {
      const severities = await getEnumValues('maintenance_records', 'Severity_of_report');
      if (severity && !severities.includes(String(severity))) {
        ctx.error(400, `Invalid severity "${severity}".`);
        return;
      }
      setField('Severity_of_report', severity);
    }
    if (attractionId !== undefined) setField('AttractionID', attractionId ? Number(attractionId) : null);
    if (employeeId !== undefined) setField('EmployeeID', employeeId ? Number(employeeId) : null);
    if (sourceId !== undefined) setField('SourceID', sourceId ? Number(sourceId) : null);
    if (dateBroken !== undefined) setField('Date_broken_down', dateBroken ? String(dateBroken).trim() : null);
    if (dateFixed !== undefined) setField('Date_fixed', dateFixed ? String(dateFixed).trim() : null);
    if (description !== undefined) setField('Description_of_work', description ? String(description) : null);
    if (approved !== undefined) setField('Approved_by_supervisor', approved ? Number(approved) : null);
    if (durationRaw !== undefined) {
      if (durationRaw === null || durationRaw === '') {
        setField('Duration_of_repair', null);
      } else {
        const duration = Number(durationRaw);
        if (!Number.isFinite(duration) || duration < 0) {
          ctx.error(400, 'Duration must be a positive number.');
          return;
        }
        setField('Duration_of_repair', duration);
      }
    }

    if (!fields.length) {
      ctx.error(400, 'Nothing to update.');
      return;
    }

    const result = await query(
      `UPDATE maintenance_records SET ${fields.join(', ')} WHERE RecordID = ?`,
      [...values, id],
    );
    if (!result.affectedRows) {
      ctx.error(404, 'Maintenance record not found.');
      return;
    }
    ctx.ok({ data: { RecordID: id } });
  }));
}
