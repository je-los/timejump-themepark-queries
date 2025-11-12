import { hashPassword, signToken, verifyPassword } from '../auth.js';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { ensureUserProfileTable } from '../services/ensure.js';
import { isZeroBuffer } from '../utils/buffer.js';

const CREATE_MATRIX = {
  owner: new Set(['admin', 'manager', 'employee', 'customer']),
  admin: new Set(['manager', 'employee', 'customer']),
  manager: new Set(['employee', 'customer']),
  employee: new Set(['customer']),
  customer: new Set([]),
};

function normalizeBirthDate(value) {
  const str = String(value || '').trim();
  if (!str) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const date = new Date(`${str}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : str;
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 10) return null;
  const area = digits.slice(0, 3);
  const prefix = digits.slice(3, 6);
  const line = digits.slice(6);
  return `(${area}) ${prefix}-${line}`;
}

export function registerAuthRoutes(router) {
  router.post('/signup', async ctx => {
    const email = String(ctx.body?.email || '').trim().toLowerCase();
    const password = String(ctx.body?.password || '');
    const firstName = String(ctx.body?.firstName ?? ctx.body?.first_name ?? '').trim();
    const lastName = String(ctx.body?.lastName ?? ctx.body?.last_name ?? '').trim();
    const phone = String(ctx.body?.phone ?? '').trim();
    const birthDateRaw = ctx.body?.dateOfBirth ?? ctx.body?.date_of_birth;
    const dateOfBirth = normalizeBirthDate(birthDateRaw);

    if (!email || !password || !firstName || !lastName || !phone || !dateOfBirth) {
      ctx.error(400, 'First name, last name, email, password, phone, and date of birth are required.');
      return;
    }
    const existing = await query(
      'SELECT user_id FROM users WHERE email = ? LIMIT 1',
      [email],
    );
    if (existing.length) {
      ctx.error(409, 'An account already exists for that email.');
      return;
    }
    const hash = hashPassword(password);
    const result = await query(
      'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
      [email, hash, 'customer'],
    );
    await ensureUserProfileTable();
    await query(
      `
        INSERT INTO user_profile (user_id, first_name, last_name, full_name, phone, date_of_birth)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          first_name = VALUES(first_name),
          last_name = VALUES(last_name),
          full_name = VALUES(full_name),
          phone = VALUES(phone),
          date_of_birth = VALUES(date_of_birth)
      `,
      [
        result.insertId,
        firstName,
        lastName,
        `${firstName} ${lastName}`.trim(),
        phone,
        dateOfBirth,
      ],
    );
    const token = signToken({ sub: result.insertId, role: 'customer' });
    ctx.created({
      token,
      me: {
        email,
        role: 'customer',
      },
    });
  });

  router.post('/login', async ctx => {
    const email = String(ctx.body?.email || '').trim().toLowerCase();
    const password = String(ctx.body?.password || '');
    if (!email || !password) {
      ctx.error(400, 'Email and password are required.');
      return;
    }
    const rows = await query(
      'SELECT user_id, email, role, password_hash, employeeID FROM users WHERE email = ? LIMIT 1',
      [email],
    );
    if (!rows.length) {
      ctx.error(401, 'Invalid credentials.');
      return;
    }
    const row = rows[0];
    const storedBuf = row.password_hash
      ? Buffer.from(row.password_hash)
      : Buffer.alloc(0);
    if (!storedBuf.length || isZeroBuffer(storedBuf)) {
      const newHash = hashPassword(password);
      await query('UPDATE users SET password_hash = ? WHERE user_id = ?', [
        newHash,
        row.user_id,
      ]);
    } else {
      const { ok, needsRehash } = verifyPassword(password, storedBuf);
      if (!ok) {
        ctx.error(401, 'Invalid credentials.');
        return;
      }
      if (needsRehash) {
        const upgraded = hashPassword(password);
        await query('UPDATE users SET password_hash = ? WHERE user_id = ?', [
          upgraded,
          row.user_id,
        ]);
      }
    }
    const token = signToken({ sub: row.user_id, role: row.role });
    ctx.ok({
      token,
      me: {
        email: row.email,
        role: row.role,
      },
    });
  });

  router.get('/me', requireAuth(async ctx => {
    ctx.ok({
      me: {
        email: ctx.authUser.email,
        role: ctx.authUser.role,
      },
    });
  }));

  router.get('/users', requireRole(['owner', 'admin'])(async ctx => {
    const roleFilter = String(ctx.query.role || '').trim();
    const params = [];
    let sql = 'SELECT user_id, email, role, employeeID, created_at FROM users';
    if (roleFilter) {
      sql += ' WHERE role = ?';
      params.push(roleFilter);
    }
    sql += ' ORDER BY created_at DESC';
    const rows = await query(sql, params);
    ctx.ok({
      data: rows.map(row => ({
        user_id: row.user_id,
        email: row.email,
        role: row.role,
        employeeID: row.employeeID,
        created_at: row.created_at,
      })),
    });
  }));

  router.post('/users', requireRole(['owner', 'admin', 'manager'])(async ctx => {
    const creatorRole = ctx.authUser.role;
    const email = String(ctx.body?.email || '').trim().toLowerCase();
    const password = String(ctx.body?.password || '').trim();
    const role = String(ctx.body?.role || '').trim();

    if (!email || !password || !role) {
      ctx.error(400, 'Email, password, and role are required.');
      return;
    }
    if (!CREATE_MATRIX[creatorRole]?.has(role)) {
      ctx.error(403, `Cannot create users with role "${role}".`);
      return;
    }
    const existing = await query(
      'SELECT user_id FROM users WHERE email = ? LIMIT 1',
      [email],
    );
    if (existing.length) {
      ctx.error(409, 'User already exists with that email.');
      return;
    }
    const hash = hashPassword(password);
    const result = await query(
      'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
      [email, hash, role],
    );
    ctx.created({
      data: {
        user_id: result.insertId,
        email,
        role,
      },
    });
  }));
}
