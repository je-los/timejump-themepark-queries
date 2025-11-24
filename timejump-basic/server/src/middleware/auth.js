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
  let employeeId = row.employeeID ?? null;
  const needsEmployeeLookup = !employeeId && row.role && row.role !== 'customer';
  if (needsEmployeeLookup) {
    const [employee] = await query(
      'SELECT employeeID FROM employee WHERE email = ? AND is_deleted = 0 LIMIT 1',
      [row.email],
    ).catch(() => []);
    if (employee?.employeeID) {
      employeeId = employee.employeeID;
      await query(
        'UPDATE users SET employeeID = ? WHERE user_id = ?',
        [employeeId, row.user_id],
      ).catch(() => {});
    }
  }
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
