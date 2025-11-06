import { requireAuth } from '../middleware/auth.js';
import { ensureUserProfileTable } from '../services/ensure.js';
import { query } from '../db.js';

export function registerProfileRoutes(router) {
  router.get('/profile/me', requireAuth(async ctx => {
    await ensureUserProfileTable();
    const rows = await query(
      'SELECT full_name, phone, updated_at FROM user_profile WHERE user_id = ? LIMIT 1',
      [ctx.authUser.id],
    ).catch(() => []);
    const profile = rows.length
      ? {
          full_name: rows[0].full_name || '',
          phone: rows[0].phone || '',
          updated_at: rows[0].updated_at || null,
        }
      : { full_name: '', phone: '', updated_at: null };
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
    const fullName = String(ctx.body?.full_name ?? ctx.body?.fullName ?? '').trim();
    const phone = String(ctx.body?.phone ?? '').trim();
    await query(
      `
        INSERT INTO user_profile (user_id, full_name, phone)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
          full_name = VALUES(full_name),
          phone = VALUES(phone)
      `,
      [ctx.authUser.id, fullName || null, phone || null],
    );
    ctx.ok({
      profile: {
        full_name: fullName,
        phone,
      },
    });
  }));
}
