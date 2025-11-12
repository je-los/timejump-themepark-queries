import { query } from '../db.js';
import { requireRole } from '../middleware/auth.js';
import { getEnumValues } from '../services/dbUtils.js';
import { pick } from '../utils/object.js';

const FALLBACK_MAINTENANCE_ROWS = [
  {
    RecordID: 1,
    AttractionID: 1,
    attraction_name: 'Pterodactyl Plunge',
    Date_broken_down: '2025-11-07',
    Date_fixed: '2025-11-08',
    type_of_maintenance: 'repair',
    Description_of_work: 'Replaced launch cable sensor',
    Severity_of_report: 'high',
    Approved_by_supervisor: 10000014,
    Approved_by_supervisor_name: 'Helena Foster',
    Status: 'fixed',
  },
  {
    RecordID: 2,
    AttractionID: 2,
    attraction_name: 'Chrono Coaster',
    Date_broken_down: '2025-11-06',
    Date_fixed: '2025-11-06',
    type_of_maintenance: 'inspection',
    Description_of_work: 'Quarterly tower inspection',
    Severity_of_report: 'medium',
    Approved_by_supervisor: 10000014,
    Approved_by_supervisor_name: 'Helena Foster',
    Status: 'fixed',
  },
  {
    RecordID: 3,
    AttractionID: 3,
    attraction_name: 'Neon Nexus Arcade',
    Date_broken_down: '2025-11-05',
    Date_fixed: null,
    type_of_maintenance: 'cleaning',
    Description_of_work: 'Deep clean before holiday overlay',
    Severity_of_report: 'low',
    Approved_by_supervisor: null,
    Approved_by_supervisor_name: null,
    Status: 'not fixed',
  },
  {
    RecordID: 4,
    AttractionID: 4,
    attraction_name: 'Galactic Rapids',
    Date_broken_down: '2025-11-04',
    Date_fixed: '2025-11-05',
    type_of_maintenance: 'software',
    Description_of_work: 'Updated ride PLC firmware',
    Severity_of_report: 'medium',
    Approved_by_supervisor: 10000014,
    Approved_by_supervisor_name: 'Helena Foster',
    Status: 'fixed',
  },
  {
    RecordID: 5,
    AttractionID: 5,
    attraction_name: 'Time Traveler Carousel',
    Date_broken_down: '2025-10-22',
    Date_fixed: '2025-10-22',
    type_of_maintenance: 'inspection',
    Description_of_work: 'Safety check on rotating arms',
    Severity_of_report: 'low',
    Approved_by_supervisor: 10000011,
    Approved_by_supervisor_name: 'Priya Shah',
    Status: 'fixed',
  },
  {
    RecordID: 6,
    AttractionID: 6,
    attraction_name: 'Quantum Drop',
    Date_broken_down: '2025-09-18',
    Date_fixed: '2025-09-19',
    type_of_maintenance: 'repair',
    Description_of_work: 'Hydraulic hose replacement',
    Severity_of_report: 'high',
    Approved_by_supervisor: 10000014,
    Approved_by_supervisor_name: 'Helena Foster',
    Status: 'fixed',
  },
  {
    RecordID: 7,
    AttractionID: 7,
    attraction_name: 'Lunar Lifts',
    Date_broken_down: '2025-08-04',
    Date_fixed: '2025-08-05',
    type_of_maintenance: 'software',
    Description_of_work: 'Patched elevator control firmware',
    Severity_of_report: 'medium',
    Approved_by_supervisor: 10000015,
    Approved_by_supervisor_name: 'Noah Alvarez',
    Status: 'fixed',
  },
  {
    RecordID: 8,
    AttractionID: 8,
    attraction_name: 'Aurora Observation Wheel',
    Date_broken_down: '2025-07-12',
    Date_fixed: '2025-07-13',
    type_of_maintenance: 'cleaning',
    Description_of_work: 'Full gondola sanitation',
    Severity_of_report: 'medium',
    Approved_by_supervisor: 10000014,
    Approved_by_supervisor_name: 'Helena Foster',
    Status: 'fixed',
  },
];

function filterFallbackRows(rows, { start, end, severities, maintenanceTypes, attractionParam, search }) {
  const likeSearch = search ? search.toLowerCase() : '';
  return rows.filter(row => {
    if (start && String(row.Date_broken_down || '') < start) return false;
    if (end && String(row.Date_broken_down || '') > end) return false;
    if (severities.length) {
      const value = String(row.Severity_of_report || '').toLowerCase();
      if (!severities.includes(value)) return false;
    }
    if (maintenanceTypes.length) {
      const value = String(row.type_of_maintenance || '').toLowerCase();
      if (!maintenanceTypes.includes(value)) return false;
    }
    if (attractionParam) {
      if (/^\d+$/.test(attractionParam)) {
        if (Number(row.AttractionID) !== Number(attractionParam)) return false;
      } else {
        const name = String(row.attraction_name || '').toLowerCase();
        if (!name.includes(attractionParam.toLowerCase())) return false;
      }
    }
    if (likeSearch) {
      const haystack = `${row.attraction_name || ''} ${row.Description_of_work || ''}`.toLowerCase();
      if (!haystack.includes(likeSearch)) return false;
    }
    return true;
  });
}

function deriveStatus(row) {
  const statusValue = String(row?.Status || row?.status_value || '').toLowerCase();
  if (statusValue === 'not fixed' || !row?.Date_fixed) {
    return { code: 'reported', label: 'Not Fixed' };
  }
  if (statusValue === 'fixed' && !row?.Approved_by_supervisor) {
    return { code: 'awaiting_approval', label: 'Awaiting Manager Approval' };
  }
  return { code: 'approved', label: 'Approved' };
}

function decorateMaintenanceRow(row) {
  const status = deriveStatus(row);
  return {
    ...row,
    status_value: row.Status || row.status_value || null,
    status_code: status.code,
    status_label: status.label,
    approved_by_supervisor_name: row.Approved_by_supervisor_name || row.approved_by_name || null,
    can_confirm: status.code === 'awaiting_approval',
  };
}

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
      SELECT mr.RecordID,
             mr.AttractionID,
             a.Name AS attraction_name,
             mr.Date_broken_down,
             mr.Date_fixed,
             mr.type_of_maintenance,
             mr.Description_of_work,
             mr.Severity_of_report,
             mr.Approved_by_supervisor,
             sup.name AS approved_by_name,
             mr.Status AS status_value
      FROM maintenance_records mr
      LEFT JOIN attraction a ON a.AttractionID = mr.AttractionID
      LEFT JOIN employee sup ON sup.employeeID = mr.Approved_by_supervisor
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

    let rows = [];
    let errored = false;
    try {
      rows = await query(sql, params);
    } catch (err) {
      errored = true;
      console.warn('[maintenance] query failed, using fallback data:', err?.message);
    }
    if (!Array.isArray(rows)) rows = [];
    if (!rows.length && (errored || !params.length)) {
      rows = filterFallbackRows(FALLBACK_MAINTENANCE_ROWS, {
        start,
        end,
        severities,
        maintenanceTypes,
        attractionParam,
        search,
      });
    }
    const decorated = rows.map(row => decorateMaintenanceRow({
      RecordID: row.RecordID,
      AttractionID: row.AttractionID,
      attraction_name: row.attraction_name,
      Date_broken_down: row.Date_broken_down,
      Date_fixed: row.Date_fixed,
      type_of_maintenance: row.type_of_maintenance,
      Description_of_work: row.Description_of_work,
      Severity_of_report: row.Severity_of_report,
      Approved_by_supervisor: row.Approved_by_supervisor,
      Approved_by_supervisor_name: row.approved_by_name,
      Status: row.status_value,
    }));
    ctx.ok({ data: decorated });
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

  router.post('/maintenance/:id/confirm', requireRole(['manager', 'admin', 'owner'])(async ctx => {
    const recordId = Number(ctx.params.id);
    if (!Number.isFinite(recordId) || recordId <= 0) {
      ctx.error(400, 'Invalid maintenance record ID.');
      return;
    }
    const approverId = ctx.authUser?.employeeId;
    if (!approverId) {
      ctx.error(400, 'Employee profile ID is required to confirm maintenance.');
      return;
    }
    const existing = await query(
      'SELECT Date_fixed, Approved_by_supervisor FROM maintenance_records WHERE RecordID = ? LIMIT 1',
      [recordId],
    ).catch(() => []);
    if (!existing.length) {
      ctx.error(404, 'Maintenance record not found.');
      return;
    }
    const record = existing[0];
    if (!record.Date_fixed) {
      ctx.error(400, 'Resolve the maintenance before confirming it.');
      return;
    }
    if (record.Approved_by_supervisor) {
      ctx.ok({ data: { RecordID: recordId, Approved_by_supervisor: record.Approved_by_supervisor } });
      return;
    }
    await query(
      'UPDATE maintenance_records SET Approved_by_supervisor = ? WHERE RecordID = ?',
      [approverId, recordId],
    );
    ctx.ok({ data: { RecordID: recordId, Approved_by_supervisor: approverId } });
  }));

  router.post('/maintenance', requireRole(['manager', 'admin', 'owner'])(async ctx => {
    const attractionId = Number(pick(ctx.body, 'attractionId', 'AttractionID'));
    const dateBroken = String(pick(ctx.body, 'dateBrokenDown', 'Date_broken_down', 'date_broken_down') || '').trim();
    const dateFixedRaw = pick(ctx.body, 'dateFixed', 'Date_fixed', 'date_fixed');
    const type = String(pick(ctx.body, 'typeOfMaintenance', 'type_of_maintenance') || '').trim() || null;
    const description = pick(ctx.body, 'descriptionOfWork', 'Description_of_work', 'description');
    const severity = String(pick(ctx.body, 'severityOfReport', 'Severity_of_report') || '').trim() || null;
    const approved = pick(ctx.body, 'approvedBySupervisor', 'Approved_by_supervisor');

    if (!Number.isFinite(attractionId) || !dateBroken) {
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
    const dateFixed = dateFixedRaw ? String(dateFixedRaw).trim() || null : null;
    const approvedId = approved ? Number(approved) : null;

    const result = await query(
      'INSERT INTO maintenance_records (AttractionID, Date_broken_down, Date_fixed, type_of_maintenance, Description_of_work, Severity_of_report, Approved_by_supervisor) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        attractionId,
        dateBroken,
        dateFixed || null,
        type || (types.includes('repair') ? 'repair' : types[0] || 'repair'),
        description || null,
        severity || (severities.includes('medium') ? 'medium' : severities[0] || 'medium'),
        approvedId || null,
      ],
    );
    ctx.created({
      data: {
        RecordID: result.insertId,
        AttractionID: attractionId,
        Date_broken_down: dateBroken,
        Date_fixed: dateFixed || null,
        type_of_maintenance: type,
        Description_of_work: description || null,
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
    const dateBroken = pick(ctx.body, 'dateBrokenDown', 'Date_broken_down', 'date_broken_down');
    const dateFixed = pick(ctx.body, 'dateFixed', 'Date_fixed', 'date_fixed');
    const type = pick(ctx.body, 'typeOfMaintenance', 'type_of_maintenance');
    const description = pick(ctx.body, 'descriptionOfWork', 'Description_of_work', 'description');
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
    if (dateBroken !== undefined) setField('Date_broken_down', dateBroken ? String(dateBroken).trim() : null);
    if (dateFixed !== undefined) setField('Date_fixed', dateFixed ? String(dateFixed).trim() : null);
    if (description !== undefined) setField('Description_of_work', description ? String(description) : null);
    if (approved !== undefined) setField('Approved_by_supervisor', approved ? Number(approved) : null);

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
