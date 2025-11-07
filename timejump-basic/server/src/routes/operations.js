import { query } from '../db.js';
import { hashPassword } from '../auth.js';
import { requireRole } from '../middleware/auth.js';
import { ensureScheduleNotesTable } from '../services/ensure.js';
import { pick } from '../utils/object.js';

const EMPLOYEE_POSITION_ID = 1;

function normalizeDate(value) {
  if (!value && value !== 0) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

export function registerOperationsRoutes(router) {
  router.get('/employees', requireRole(['manager', 'admin', 'owner'])(async ctx => {
    const rows = await query(`
      SELECT e.employeeID, e.name, e.salary, e.role, e.start_date, e.end_date, e.email, p.RoleName AS role_name
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
        end_date: row.end_date,
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
      if (!Number.isFinite(salary) || salary < 0) {
        ctx.error(400, 'Salary must be a positive number.');
        return;
      }
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

    const employeeResult = await query(
      'INSERT INTO employee (name, salary, role, start_date, end_date, email) VALUES (?, ?, ?, ?, ?, ?)',
      [
        name,
        salary !== null ? salary : null,
        EMPLOYEE_POSITION_ID,
        startDate,
        null,
        email,
      ],
    );
    const employeeId = employeeResult.insertId;
    const hash = hashPassword(password);
    try {
      await query(
        'INSERT INTO users (email, password_hash, role, employeeID) VALUES (?, ?, ?, ?)',
        [email, hash, 'employee', employeeId],
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
        role: EMPLOYEE_POSITION_ID,
        role_name: 'Employee',
        start_date: startDate,
        end_date: null,
        email,
      },
    });
  }));

  router.delete('/employees/:id', requireRole(['admin', 'owner'])(async ctx => {
    const employeeId = Number(ctx.params?.id);
    if (!employeeId) {
      ctx.error(400, 'Valid employee ID is required.');
      return;
    }

    const rows = await query(
      'SELECT employeeID FROM employee WHERE employeeID = ? LIMIT 1',
      [employeeId],
    );
    if (!rows.length) {
      ctx.error(404, 'Employee not found.');
      return;
    }

    await query('DELETE FROM users WHERE employeeID = ?', [employeeId]).catch(() => {});
    await query('DELETE FROM employee WHERE employeeID = ?', [employeeId]);

    ctx.noContent();
  }));

  router.get('/attractions', requireRole(['employee', 'manager', 'admin', 'owner'])(async ctx => {
    const rows = await query(`
      SELECT a.AttractionID,
             a.Name,
             a.AttractionTypeID,
             atype.TypeName AS attraction_type_name,
             a.ThemeID,
             t.themeName AS theme_name,
             a.HeightRestriction,
             a.RidersPerVehicle
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
        HeightRestriction: row.HeightRestriction,
        RidersPerVehicle: row.RidersPerVehicle,
      })),
    });
  }));

  router.get('/schedules', requireRole(['manager', 'admin', 'owner'])(async ctx => {
    await ensureScheduleNotesTable();
    const rows = await query(`
      SELECT s.ScheduleID, s.EmployeeID, s.AttractionID, s.Shift_date, s.Start_time, s.End_time, sn.notes
      FROM schedules s
      LEFT JOIN schedule_notes sn ON sn.ScheduleID = s.ScheduleID
      ORDER BY s.Shift_date DESC, s.Start_time ASC
      LIMIT 500
    `).catch(() => []);
    ctx.ok({
      data: rows.map(row => ({
        ScheduleID: row.ScheduleID,
        EmployeeID: row.EmployeeID,
        AttractionID: row.AttractionID,
        Shift_date: row.Shift_date,
        shiftDate: row.Shift_date,
        Start_time: row.Start_time,
        startTime: row.Start_time,
        End_time: row.End_time,
        endTime: row.End_time,
        notes: row.notes || '',
      })),
    });
  }));

  router.post('/schedules', requireRole(['manager', 'admin', 'owner'])(async ctx => {
    const employeeId = Number(pick(ctx.body, 'employeeId', 'EmployeeID'));
    const attractionId = Number(pick(ctx.body, 'attractionId', 'AttractionID'));
    const shiftDate = String(pick(ctx.body, 'shiftDate', 'Shift_date') || '').trim();
    const startTime = String(pick(ctx.body, 'startTime', 'Start_time') || '').trim();
    const endTime = String(pick(ctx.body, 'endTime', 'End_time') || '').trim();
    const notes = String(pick(ctx.body, 'notes') || '').trim();

    if (!employeeId || !attractionId || !shiftDate || !startTime || !endTime) {
      ctx.error(400, 'Employee, attraction, date, start, and end time are required.');
      return;
    }

    try {
      const result = await query(
        'INSERT INTO schedules (EmployeeID, AttractionID, Shift_date, Start_time, End_time) VALUES (?, ?, ?, ?, ?)',
        [employeeId, attractionId, shiftDate, startTime, endTime],
      );
      const scheduleId = result.insertId;
      if (notes) {
        await ensureScheduleNotesTable();
        await query(
          'INSERT INTO schedule_notes (ScheduleID, notes) VALUES (?, ?) ' +
          'ON DUPLICATE KEY UPDATE notes = VALUES(notes)',
          [scheduleId, notes],
        );
      }
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
          notes,
        },
      });
    } catch (err) {
      if (err?.code === 'ER_DUP_ENTRY') {
        ctx.error(409, 'A shift already exists for that employee, attraction, and start time.');
        return;
      }
      throw err;
    }
  }));
}
