import { query } from '../db.js';
import { hashPassword } from '../auth.js';
import { requireRole } from '../middleware/auth.js';
import {
  ensureAttractionExperienceColumns,
  ensureAttractionImageColumn,
  ensureScheduleCompletionColumn,
} from '../services/ensure.js';
import { pick } from '../utils/object.js';

const EMPLOYEE_POSITION_ID = 1;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeDate(value) {
  if (!value && value !== 0) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

export function registerOperationsRoutes(router) {
  router.get('/positions', requireRole(['manager', 'admin', 'owner'])(async ctx => {
    const rows = await query('SELECT PositionID, RoleName FROM positions ORDER BY RoleName ASC').catch(() => []);
    ctx.ok({
      data: rows.map(row => ({
        id: row.PositionID,
        name: row.RoleName,
      })),
    });
  }));

  router.post('/positions', requireRole(['admin', 'owner'])(async ctx => {
    const name = String(ctx.body?.name || '').trim();
    if (!name) {
      ctx.error(400, 'Position name is required.');
      return;
    }
    const [existing] = await query(
      'SELECT PositionID FROM positions WHERE LOWER(RoleName) = LOWER(?) LIMIT 1',
      [name],
    ).catch(() => []);
    if (existing) {
      ctx.error(409, 'A position with that name already exists.');
      return;
    }
    const result = await query(
      'INSERT INTO positions (RoleName) VALUES (?)',
      [name],
    );
    ctx.created({
      data: {
        id: result.insertId,
        name,
      },
    });
  }));

  router.put('/positions/:id', requireRole(['admin', 'owner'])(async ctx => {
    const positionId = Number(ctx.params?.id);
    if (!Number.isInteger(positionId) || positionId <= 0) {
      ctx.error(400, 'Valid position id is required.');
      return;
    }
    const name = String(ctx.body?.name || '').trim();
    if (!name) {
      ctx.error(400, 'Position name is required.');
      return;
    }
    const [duplicate] = await query(
      'SELECT PositionID FROM positions WHERE LOWER(RoleName) = LOWER(?) AND PositionID <> ? LIMIT 1',
      [name, positionId],
    ).catch(() => []);
    if (duplicate) {
      ctx.error(409, 'Another position already uses that name.');
      return;
    }
    const result = await query(
      'UPDATE positions SET RoleName = ? WHERE PositionID = ?',
      [name, positionId],
    );
    if (!result.affectedRows) {
      ctx.error(404, 'Position not found.');
      return;
    }
    ctx.ok({
      data: {
        id: positionId,
        name,
      },
    });
  }));

  router.get('/employees', requireRole(['manager', 'admin', 'owner'])(async ctx => {
    const rows = await query(`
      SELECT e.employeeID, e.name, e.salary, e.role, e.start_date, e.email, p.RoleName AS role_name
      FROM employee e
      LEFT JOIN positions p ON p.PositionID = e.role
      ORDER BY e.name ASC
    `).catch(() => []);
    ctx.ok({
      data: rows.map(row => ({
        employeeID: row.employeeID,
        name: row.name,
        salary: row.salary,
        role: row.role,
        role_name: row.role_name,
        start_date: row.start_date,
        email: row.email,
      })),
    });
  }));

  router.post('/employees', requireRole(['admin', 'owner'])(async ctx => {
    const name = String(pick(ctx.body, 'name') || '').trim();
    const email = String(pick(ctx.body, 'email') || '').trim().toLowerCase();
    const password = String(pick(ctx.body, 'password') || '').trim();
    const salaryInput = pick(ctx.body, 'salary');
    const startDateRaw = pick(ctx.body, 'startDate', 'start_date');
    const startDate = normalizeDate(startDateRaw);
    const positionIdRaw = pick(ctx.body, 'positionId', 'position_id', 'role', 'roleId', 'role_id');
    const requestedPosition = pick(ctx.body, 'positionId', 'position_id', 'roleId', 'role_id');

    if (!name) {
      ctx.error(400, 'Employee name is required.');
      return;
    }
    if (!email) {
      ctx.error(400, 'Employee email is required.');
      return;
    }
    if (!password) {
      ctx.error(400, 'A temporary password is required.');
      return;
    }
    if (password.length < 8) {
      ctx.error(400, 'Password must be at least 8 characters.');
      return;
    }
    if (startDateRaw && !startDate) {
      ctx.error(400, 'Start date must be formatted as YYYY-MM-DD.');
      return;
    }

    let salary = null;
    if (salaryInput !== undefined && salaryInput !== null && String(salaryInput).trim() !== '') {
      salary = Number(salaryInput);
      if (!Number.isFinite(salary) || salary <= 0 || salary > 200000) {
        ctx.error(400, 'Salary must be between 0 and 200,000.');
        return;
      }
    } else {
      ctx.error(400, 'Salary is required.');
      return;
    }

    const [employeeRows, userRows] = await Promise.all([
      query('SELECT employeeID FROM employee WHERE email = ? LIMIT 1', [email]),
      query('SELECT user_id FROM users WHERE email = ? LIMIT 1', [email]),
    ]);
    if (employeeRows.length) {
      ctx.error(409, 'An employee already exists with that email.');
      return;
    }
    if (userRows.length) {
      ctx.error(409, 'A user already exists with that email.');
      return;
    }

    let positionId = EMPLOYEE_POSITION_ID;
    let positionName = 'Employee';
    if (requestedPosition !== undefined && requestedPosition !== null && String(requestedPosition).trim() !== '') {
      const candidate = Number(requestedPosition);
      if (!Number.isInteger(candidate) || candidate <= 0) {
        ctx.error(400, 'Selected employee role is invalid.');
        return;
      }
      const [positionRow] = await query(
        'SELECT PositionID, RoleName FROM positions WHERE PositionID = ? LIMIT 1',
        [candidate],
      );
      if (!positionRow) {
        ctx.error(400, 'Selected employee role does not exist.');
        return;
      }
      positionId = positionRow.PositionID;
      positionName = positionRow.RoleName || positionName;
    } else {
      const [defaultPosition] = await query(
        'SELECT RoleName FROM positions WHERE PositionID = ? LIMIT 1',
        [positionId],
      ).catch(() => []);
      if (defaultPosition?.RoleName) {
        positionName = defaultPosition.RoleName;
      }
    }
    const normalizedRole = String(positionName || 'employee').trim().toLowerCase();

    const employeeResult = await query(
      'INSERT INTO employee (name, salary, role, start_date, email) VALUES (?, ?, ?, ?, ?)',
      [
        name,
        salary !== null ? salary : null,
        positionId,
        startDate,
        email,
      ],
    );
    const employeeId = employeeResult.insertId;
    const hash = hashPassword(password);
    try {
      await query(
        'INSERT INTO users (email, password_hash, role, employeeID) VALUES (?, ?, ?, ?)',
        [email, hash, normalizedRole, employeeId],
      );
    } catch (err) {
      await query('DELETE FROM employee WHERE employeeID = ?', [employeeId]).catch(() => {});
      throw err;
    }

    ctx.created({
      data: {
        employeeID: employeeId,
        name,
        salary,
        role: positionId,
        role_name: positionName || 'Employee',
        start_date: startDate,
        email,
      },
    });
  }));

  router.put('/employees/:id', requireRole(['admin', 'owner'])(async ctx => {
    const employeeId = Number(ctx.params?.id);
    if (!employeeId) {
      ctx.error(400, 'Valid employee ID is required.');
      return;
    }

    const name = ctx.body?.name ? String(ctx.body.name).trim() : null;
    const salaryInput = ctx.body?.salary;
    const positionIdRaw = pick(ctx.body, 'positionId', 'position_id', 'role', 'roleId', 'role_id');

    const fields = [];
    const values = [];

    if (name) {
      fields.push('name = ?');
      values.push(name);
    }
    if (salaryInput !== undefined) {
      if (salaryInput === null || salaryInput === '') {
        ctx.error(400, 'Salary must be greater than zero.');
        return;
      }
      const salaryValue = Number(salaryInput);
      if (!Number.isFinite(salaryValue) || salaryValue <= 0 || salaryValue > 200000) {
        ctx.error(400, 'Salary must be between 0 and 200,000.');
        return;
      }
      fields.push('salary = ?');
      values.push(salaryValue);
    }
    let newPositionName = null;
    let normalizedRoleName = null;
    if (positionIdRaw !== undefined) {
      if (positionIdRaw === null || positionIdRaw === '') {
        ctx.error(400, 'Access role must be specified.');
        return;
      }
      const candidate = Number(positionIdRaw);
      if (!Number.isInteger(candidate) || candidate <= 0) {
        ctx.error(400, 'Access role is invalid.');
        return;
      }
      const [positionRow] = await query(
        'SELECT RoleName FROM positions WHERE PositionID = ? LIMIT 1',
        [candidate],
      );
      if (!positionRow) {
        ctx.error(400, 'Selected access role does not exist.');
        return;
      }
      fields.push('role = ?');
      values.push(candidate);
      newPositionName = positionRow.RoleName;
      normalizedRoleName = String(positionRow.RoleName || '').trim().toLowerCase() || null;
    }

    if (!fields.length) {
      ctx.error(400, 'Nothing to update.');
      return;
    }
    values.push(employeeId);

    const result = await query(
      `UPDATE employee SET ${fields.join(', ')} WHERE employeeID = ?`,
      values,
    );
    if (!result.affectedRows) {
      ctx.error(404, 'Employee not found.');
      return;
    }

    const [updated] = await query(
      `
        SELECT e.employeeID, e.name, e.salary, e.start_date, e.email, e.role, p.RoleName AS role_name
        FROM employee e
        LEFT JOIN positions p ON p.PositionID = e.role
        WHERE e.employeeID = ?
        LIMIT 1
      `,
      [employeeId],
    );

    ctx.ok({
      data: {
        employeeID: employeeId,
        name: updated?.name ?? name ?? null,
        salary: updated?.salary ?? salaryInput ?? null,
        start_date: updated?.start_date ?? null,
        email: updated?.email ?? null,
        role: updated?.role ?? (positionIdRaw ?? null),
        role_name: updated?.role_name ?? newPositionName ?? null,
      },
    });
    if (normalizedRoleName) {
      await query('UPDATE users SET role = ? WHERE employeeID = ?', [normalizedRoleName, employeeId]).catch(() => {});
    }
  }));

  router.delete('/employees/:id', requireRole(['admin', 'owner'])(async ctx => {
    const employeeId = Number(ctx.params?.id);
    if (!employeeId) {
      ctx.error(400, 'Valid employee ID is required.');
      return;
    }

    const rows = await query(
      'SELECT employeeID, email FROM employee WHERE employeeID = ? LIMIT 1',
      [employeeId],
    );
    if (!rows.length) {
      ctx.error(404, 'Employee not found.');
      return;
    }
    const employeeEmail = rows[0]?.email || null;

    const deleteParams = [employeeId];
    let deleteSql = 'DELETE FROM users WHERE employeeID = ?';
    if (employeeEmail) {
      deleteSql += ' OR email = ?';
      deleteParams.push(employeeEmail);
    }
    await query(deleteSql, deleteParams).catch(() => {});
    await query('DELETE FROM employee WHERE employeeID = ?', [employeeId]);

    ctx.noContent();
  }));

  router.get('/attractions', requireRole(['employee', 'manager', 'admin', 'owner'])(async ctx => {
    await ensureAttractionImageColumn();
    await ensureAttractionExperienceColumns();
    const rows = await query(`
      SELECT a.AttractionID,
             a.Name,
             a.AttractionTypeID,
             atype.TypeName AS attraction_type_name,
             a.ThemeID,
             t.themeName AS theme_name,
             a.Capacity,
             a.image_url,
             a.experience_level,
             a.target_audience
      FROM attraction a
      LEFT JOIN theme t ON t.themeID = a.ThemeID
      LEFT JOIN attraction_type atype ON atype.AttractionTypeID = a.AttractionTypeID
      ORDER BY t.themeName ASC, a.Name ASC
    `).catch(() => []);
    ctx.ok({
      data: rows.map(row => ({
        AttractionID: row.AttractionID,
        Name: row.Name,
        AttractionTypeID: row.AttractionTypeID,
        attraction_type_name: row.attraction_type_name,
        ThemeID: row.ThemeID,
        theme_name: row.theme_name,
        Capacity: row.Capacity,
        image_url: row.image_url || null,
        experience_level: row.experience_level || null,
        target_audience: row.target_audience || null,
      })),
    });
  }));

  router.get('/schedules', requireRole(['employee', 'manager', 'admin', 'owner'])(async ctx => {
    await ensureScheduleCompletionColumn();
    const isEmployee = ctx.authUser.role === 'employee';
    let whereClause = 'WHERE s.isDeleted = 0';
    const params = [];
    if (isEmployee) {
      if (!ctx.authUser.employeeId) {
        ctx.error(400, 'Employee profile is missing.');
        return;
      }
      whereClause += ' AND s.EmployeeID = ? AND s.is_completed = 0';
      params.push(ctx.authUser.employeeId);
    } else if (ctx.query?.employeeId) {
      const filterId = Number(ctx.query.employeeId);
      if (Number.isInteger(filterId) && filterId > 0) {
        whereClause += ' AND s.EmployeeID = ?';
        params.push(filterId);
      }
    }
  const rows = await query(`
      SELECT s.ScheduleID,
             s.EmployeeID,
             e.name AS employee_name,
             s.AttractionID,
             a.Name AS attraction_name,
             s.Shift_date,
             s.Start_time,
             s.End_time,
             s.is_completed,
             s.ShiftStatus,
             COALESCE(sst.StatusName,
               CASE s.ShiftStatus
                 WHEN 2 THEN 'cancelled_for_maintenance'
                 WHEN 1 THEN 'cancelled'
                 ELSE 'scheduled'
               END
             ) AS shift_status_name,
             CASE
               WHEN EXISTS (
                 SELECT 1
                 FROM maintenance_records mr
                 WHERE mr.AttractionID = s.AttractionID
                   AND mr.Date_broken_down <= s.Shift_date
                   AND (mr.Date_fixed IS NULL OR mr.Date_fixed > s.Shift_date)
               ) THEN 1
               ELSE 0
             END AS maintenance_overlap,
             (
               SELECT mr.Description_of_work
               FROM maintenance_records mr
               WHERE mr.AttractionID = s.AttractionID
                 AND mr.Date_broken_down <= s.Shift_date
                 AND (mr.Date_fixed IS NULL OR mr.Date_fixed > s.Shift_date)
               ORDER BY (mr.Date_fixed IS NULL) DESC, mr.Date_broken_down DESC
               LIMIT 1
             ) AS maintenance_description
      FROM schedules s
      LEFT JOIN employee e ON e.employeeID = s.EmployeeID
      LEFT JOIN attraction a ON a.AttractionID = s.AttractionID
      LEFT JOIN shift_status_type sst ON sst.StatusCode = s.ShiftStatus
      ${whereClause}
      ORDER BY s.Shift_date DESC, s.Start_time ASC
      LIMIT 500
    `, params).catch((err) => []);
  ctx.ok({
    data: rows.map(row => {
      const maintenanceOverlap = row.maintenance_overlap === 1 || row.maintenance_overlap === true;
      const baseStatusRaw = Number(row.ShiftStatus ?? 0);
      let shiftStatus = baseStatusRaw;
      if (maintenanceOverlap && shiftStatus === 0) {
        shiftStatus = 2;
      } else if (!maintenanceOverlap && shiftStatus === 2 && (!row.shift_status_name || row.shift_status_name === 'cancelled_for_maintenance')) {
        shiftStatus = 0;
      }
      let shiftStatusName = row.shift_status_name;
      if (shiftStatus === 2) {
        shiftStatusName = 'cancelled_for_maintenance';
      } else if (shiftStatus === 1) {
        shiftStatusName = 'cancelled';
      } else {
        shiftStatusName = 'scheduled';
      }
      const isCancelled = shiftStatus !== 0;
      const maintenanceNote = row.maintenance_description || null;
      return {
        ScheduleID: row.ScheduleID,
        EmployeeID: row.EmployeeID,
        employee_name: row.employee_name || '',
        EmployeeName: row.employee_name || '',
        AttractionID: row.AttractionID,
        attraction_name: row.attraction_name || '',
        attractionName: row.attraction_name || '',
        Shift_date: row.Shift_date,
        shiftDate: row.Shift_date,
        Start_time: row.Start_time,
        startTime: row.Start_time,
        End_time: row.End_time,
        endTime: row.End_time,
        is_completed: row.is_completed === 1,
        isCompleted: row.is_completed === 1,
        ShiftStatus: shiftStatus,
        shiftStatus,
        shift_status: shiftStatus,
        shiftStatusName,
        shift_status_name: shiftStatusName,
        is_cancelled: isCancelled,
        isCancelled,
        maintenanceOverlap,
        maintenance_overlap: maintenanceOverlap,
        maintenanceNote,
        maintenance_note: maintenanceNote,
      };
    }),
  });
  }));

  router.post('/schedules', requireRole(['manager', 'admin', 'owner'])(async ctx => {
    const employeeId = Number(pick(ctx.body, 'employeeId', 'EmployeeID'));
    const attractionId = Number(pick(ctx.body, 'attractionId', 'AttractionID'));
    const shiftDate = String(pick(ctx.body, 'shiftDate', 'Shift_date') || '').trim();
    const startTime = String(pick(ctx.body, 'startTime', 'Start_time') || '').trim();
    const endTime = String(pick(ctx.body, 'endTime', 'End_time') || '').trim();

    if (!employeeId || !attractionId || !shiftDate || !startTime || !endTime) {
      ctx.error(400, 'Employee, attraction, date, start, and end time are required.');
      return;
    }

    try {
      const result = await query(
        'INSERT INTO schedules (EmployeeID, AttractionID, Shift_date, Start_time, End_time, isDeleted) VALUES (?, ?, ?, ?, ?, 0)',
        [employeeId, attractionId, shiftDate, startTime, endTime],
      );
      const scheduleId = result.insertId;
      ctx.created({
        data: {
          ScheduleID: scheduleId,
          EmployeeID: employeeId,
          AttractionID: attractionId,
          Shift_date: shiftDate,
          shiftDate,
          Start_time: startTime,
          startTime,
          End_time: endTime,
          endTime,
        },
      });
    } catch (err) {
      if (err?.code === 'ER_DUP_ENTRY') {
        ctx.error(409, 'A shift already exists for that employee, attraction, and start time.');
        return;
      }
      if (err?.code === 'ER_SIGNAL_EXCEPTION' || (err?.message && err.message.includes('overlap'))) {
        ctx.error(409, 'Employee already has a shift during this timeframe.');
        return;
      }
      throw err;
    }
  }));

  router.delete('/schedules/:id', requireRole(['manager'])(async ctx => {
    const scheduleId = Number(ctx.params.id);

    if (!scheduleId) {
      ctx.error(400, 'A valid ScheduleID is required.');
      return;
    }

    try {
      const result = await query(
        'UPDATE schedules SET isDeleted = 1 WHERE ScheduleID = ?',
        [scheduleId]
      );

      if (result.affectedRows === 0) {
        ctx.error(404, 'Schedule not found.');
        return;
      }

      ctx.ok({
        message: 'Schedule deleted successfully.',
        deletedId: scheduleId,
        
      });
    }
    catch (err) {
      console.error('DELETE /schedules/:id error:', err);
      ctx.error(500, 'Server error deleting schedule.');
    }
  }));

  router.get('/ride-log', requireRole(['employee', 'manager', 'admin', 'owner'])(async ctx => {
    const attractionId = Number(pick(ctx.query, 'attractionId', 'AttractionID'));
    const daysParam = Number(pick(ctx.query, 'days'));
    const limitParam = Number(pick(ctx.query, 'limit'));
    const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 14;
    const limit = Number.isFinite(limitParam) && limitParam > 0 && limitParam <= 200 ? limitParam : 50;

    let whereClause = 'WHERE rl.log_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)';
    const params = [days];

    if (attractionId) {
      whereClause += ' AND rl.AttractionID = ?';
      params.push(attractionId);
    }

    if (ctx.authUser.role === 'employee') {
      if (!ctx.authUser.employeeId) {
        ctx.error(400, 'Employee profile is missing.');
        return;
      }
      whereClause += ' AND EXISTS (SELECT 1 FROM schedules s WHERE s.EmployeeID = ? AND s.AttractionID = rl.AttractionID AND s.Shift_date = rl.log_date)';
      params.push(ctx.authUser.employeeId);
    }

    const rows = await query(
      `
        SELECT rl.AttractionID, a.Name AS attraction_name, rl.log_date, rl.riders_count
        FROM ride_log rl
        LEFT JOIN attraction a ON a.AttractionID = rl.AttractionID
        ${whereClause}
        ORDER BY rl.log_date DESC, rl.AttractionID ASC
        LIMIT ?
      `,
      [...params, limit],
    ).catch(() => []);

    ctx.ok({
      data: rows.map(row => ({
        AttractionID: row.AttractionID,
        attraction_name: row.attraction_name || '',
        log_date: row.log_date,
        riders_count: Number(row.riders_count || 0),
      })),
    });
  }));

  router.post('/ride-log', requireRole(['employee', 'manager', 'admin', 'owner'])(async ctx => {
    await ensureScheduleCompletionColumn();
    const attractionId = Number(pick(ctx.body, 'attractionId', 'AttractionID'));
    const logDate = String(pick(ctx.body, 'logDate', 'date', 'log_date') || '').trim();
    const ridersRaw = pick(ctx.body, 'riders', 'ridersCount', 'riders_count');
    const ridersCount = Number(ridersRaw);
    const providedScheduleId = Number(pick(ctx.body, 'scheduleId', 'ScheduleID'));
    let targetScheduleId = Number.isInteger(providedScheduleId) && providedScheduleId > 0 ? providedScheduleId : null;

    if (!attractionId || !logDate) {
      ctx.error(400, 'Attraction and date are required.');
      return;
    }
    if (!Number.isFinite(ridersCount) || ridersCount < 0) {
      ctx.error(400, 'Rider count must be a non-negative number.');
      return;
    }

    if (ctx.authUser.role === 'employee') {
      if (!ctx.authUser.employeeId) {
        ctx.error(400, 'Employee profile is missing.');
        return;
      }
      const [assignment] = await query(
        'SELECT ScheduleID FROM schedules WHERE EmployeeID = ? AND AttractionID = ? AND Shift_date = ? AND is_completed = 0 AND ShiftStatus = 0 LIMIT 1',
        [ctx.authUser.employeeId, attractionId, logDate],
      ).catch(() => []);
      if (!assignment) {
        ctx.error(403, 'You are not scheduled on that attraction for the selected date.');
        return;
      }
      if (!targetScheduleId) {
        targetScheduleId = assignment.ScheduleID;
      }
    } else if (targetScheduleId) {
      const [schedule] = await query(
        'SELECT ScheduleID FROM schedules WHERE ScheduleID = ? AND AttractionID = ? AND Shift_date = ? AND ShiftStatus = 0 LIMIT 1',
        [targetScheduleId, attractionId, logDate],
      ).catch(() => []);
      if (!schedule) {
        ctx.error(400, 'Schedule entry not found for the provided identifiers.');
        return;
      }
    }

    await query(
      'INSERT INTO ride_log (AttractionID, log_date, riders_count) VALUES (?, ?, ?) ' +
      'ON DUPLICATE KEY UPDATE riders_count = VALUES(riders_count)',
      [attractionId, logDate, ridersCount],
    );

    if (targetScheduleId) {
      await query(
        'UPDATE schedules SET is_completed = 1 WHERE ScheduleID = ?',
        [targetScheduleId],
      ).catch(() => {});
    }

    ctx.ok({
      data: {
        AttractionID: attractionId,
        log_date: logDate,
        riders_count: ridersCount,
      },
    });
  }));

  router.get('/ride-cancellations', requireRole(['manager', 'admin', 'owner'])(async ctx => {
    const limitParam = Number(ctx.query?.limit);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50;
    const rows = await query(`
      SELECT rc.cancel_id,
             rc.AttractionID,
             DATE(rc.cancel_date) AS cancel_date,
             rc.reason,
             a.Name AS attraction_name
      FROM ride_cancellation rc
      LEFT JOIN attraction a ON a.AttractionID = rc.AttractionID
      ORDER BY rc.cancel_date DESC, rc.cancel_id DESC
      LIMIT ${limit}
    `).catch(() => []);
    ctx.ok({
      data: rows.map(row => ({
        cancel_id: row.cancel_id,
        attraction_id: row.AttractionID,
        attraction_name: row.attraction_name || `Attraction ${row.AttractionID}`,
        cancel_date: row.cancel_date,
        reason: row.reason || '',
      })),
    });
  }));

  router.post('/ride-cancellations', requireRole(['manager', 'admin', 'owner'])(async ctx => {
    const attractionId = Number(ctx.body?.attractionId || ctx.body?.AttractionID);
    const cancelDateRaw = ctx.body?.cancelDate || ctx.body?.cancel_date || ctx.body?.date;
    const cancelDate = normalizeDate(cancelDateRaw) || todayISO();
    const reason = String(ctx.body?.reason || '').trim();

    if (!attractionId) {
      ctx.error(400, 'Attraction is required.');
      return;
    }
    if (!reason) {
      ctx.error(400, 'Reason is required.');
      return;
    }
    const [exists] = await query(
      'SELECT AttractionID FROM attraction WHERE AttractionID = ? LIMIT 1',
      [attractionId],
    ).catch(() => []);
    if (!exists) {
      ctx.error(400, 'Attraction not found.');
      return;
    }
    const trimmedReason = reason.slice(0, 255);
    const result = await query(
      'INSERT INTO ride_cancellation (AttractionID, cancel_date, reason) VALUES (?, ?, ?)',
      [attractionId, cancelDate, trimmedReason],
    );
    ctx.created({
      data: {
        cancel_id: result.insertId,
        attraction_id: attractionId,
        cancel_date: cancelDate,
        reason: trimmedReason,
      },
    });
  }));
}
