import { requireAuth } from '../middleware/auth.js';
import { ensureUserProfileTable } from '../services/ensure.js';
import { query } from '../db.js';
import { hashPassword, verifyPassword } from '../auth.js';
import { isZeroBuffer } from '../utils/buffer.js';

function toISODate(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function normalizeBirthDate(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 10) return null;
  const area = digits.slice(0, 3);
  const prefix = digits.slice(3, 6);
  const line = digits.slice(6);
  return `(${area}) ${prefix}-${line}`;
}

export function registerProfileRoutes(router) {
  router.get('/profile/me', requireAuth(async ctx => {
    await ensureUserProfileTable();
    const rows = await query(
      'SELECT first_name, last_name, full_name, phone, date_of_birth, updated_at FROM user_profile WHERE user_id = ? LIMIT 1',
      [ctx.authUser.id],
    ).catch(() => []);
    const profile = rows.length
      ? {
          first_name: rows[0].first_name || '',
          last_name: rows[0].last_name || '',
          full_name: rows[0].full_name || [rows[0].first_name, rows[0].last_name].filter(Boolean).join(' ').trim(),
          phone: rows[0].phone || '',
          date_of_birth: toISODate(rows[0].date_of_birth) || '',
          updated_at: rows[0].updated_at || null,
        }
      : { first_name: '', last_name: '', full_name: '', phone: '', date_of_birth: '', updated_at: null };
    ctx.ok({
      profile,
      me: {
        email: ctx.authUser.email,
        role: ctx.authUser.role,
      },
    });
  }));

  router.put('/profile/me', requireAuth(async ctx => {
    await ensureUserProfileTable();
    const firstName = String(ctx.body?.first_name ?? ctx.body?.firstName ?? '').trim();
    const lastName = String(ctx.body?.last_name ?? ctx.body?.lastName ?? '').trim();
    const rawPhone = String(ctx.body?.phone ?? '').trim();
    const phone = normalizePhone(rawPhone);
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    if (!firstName || !lastName) {
      ctx.error(400, 'First and last name are required.');
      return;
    }
    if (!phone) {
      ctx.error(400, 'Phone number must include 10 digits.');
      return;
    }
    const [existing] = await query(
      'SELECT date_of_birth FROM user_profile WHERE user_id = ? LIMIT 1',
      [ctx.authUser.id],
    ).catch(() => []);
    const preservedDob = existing?.date_of_birth || null;
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
      [ctx.authUser.id, firstName || null, lastName || null, fullName || null, phone || null, preservedDob],
    );
    ctx.ok({
      profile: {
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        phone,
        date_of_birth: toISODate(preservedDob) || '',
      },
    });
  }));

  router.put('/profile/password', requireAuth(async ctx => {
    const currentPassword = String(ctx.body?.currentPassword || '').trim();
    const newPassword = String(ctx.body?.newPassword || '').trim();
    if (!currentPassword || !newPassword) {
      ctx.error(400, 'Current and new password are required.');
      return;
    }
    const rows = await query(
      'SELECT password_hash FROM users WHERE user_id = ? LIMIT 1',
      [ctx.authUser.id],
    );
    if (!rows.length) {
      ctx.error(404, 'User record not found.');
      return;
    }
    const storedBuf = rows[0].password_hash ? Buffer.from(rows[0].password_hash) : Buffer.alloc(0);
    if (!storedBuf.length || isZeroBuffer(storedBuf)) {
      ctx.error(400, 'Password cannot be updated right now.');
      return;
    }
    const { ok } = verifyPassword(currentPassword, storedBuf);
    if (!ok) {
      ctx.error(401, 'Current password is incorrect.');
      return;
    }
    const newHash = hashPassword(newPassword);
    await query('UPDATE users SET password_hash = ? WHERE user_id = ?', [newHash, ctx.authUser.id]);
    ctx.ok({ message: 'Password updated.' });
  }));
}
