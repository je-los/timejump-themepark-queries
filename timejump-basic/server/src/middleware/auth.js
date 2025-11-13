import { verifyToken } from '../auth.js';
import { query } from '../db.js';

export async function resolveAuthUser(authHeader) {
  if (!authHeader || typeof authHeader !== 'string') return null;
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : authHeader;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload?.sub) return null;
  const rows = await query(
    'SELECT user_id, email, role, employeeID FROM users WHERE user_id = ? LIMIT 1',
    [payload.sub],
  );
  if (!rows.length) return null;
  const row = rows[0];
  const employeeId = row.employeeID ?? null;
  return {
    id: row.user_id,
    email: row.email,
    role: row.role,
    employeeId,
    EmployeeID: employeeId,
  };
}

export function requireAuth(handler) {
  return async ctx => {
    if (!ctx.authUser) {
      ctx.error(401, 'Authentication required.');
      return;
    }
    return handler(ctx);
  };
}

export function requireRole(roles) {
  const allow = Array.isArray(roles) ? roles : [roles];
  return handler => async ctx => {
    if (!ctx.authUser) {
      ctx.error(401, 'Authentication required.');
      return;
    }
    if (!allow.includes(ctx.authUser.role)) {
      ctx.error(403, 'Insufficient permissions.');
      return;
    }
    return handler(ctx);
  };
}
