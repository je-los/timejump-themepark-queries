import { query } from '../db.js';
import { requireRole } from '../middleware/auth.js';
import { ensureTicketPurchaseTables } from '../services/ensure.js';

function normalizeItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];
  return rawItems
    .map(item => ({
      id: String(item.id ?? '').trim(),
      name: String(item.name || '').trim(),
      kind: String(item.kind || '').trim(),
      price: Number(item.price ?? 0),
      qty: Number(item.qty ?? item.quantity ?? 1),
      meta: item.meta ?? null,
    }))
    .filter(item => item.name && item.kind && Number.isFinite(item.price) && item.price >= 0 && Number.isFinite(item.qty) && item.qty > 0);
}

export function registerOrderRoutes(router) {
  router.post('/checkout', requireRole(['customer'])(async ctx => {
    const items = normalizeItems(ctx.body?.items);
    if (!items.length) {
      ctx.error(400, 'Your cart is empty.');
      return;
    }
    await ensureTicketPurchaseTables();
    const userId = ctx.authUser.id;
    const now = new Date();
    const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    for (const item of items) {
      await query(
        'INSERT INTO ticket_purchase (user_id, item_name, item_type, quantity, price, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          userId,
          item.name,
          item.kind,
          item.qty,
          item.price,
          item.meta ? JSON.stringify(item.meta) : null,
          now,
        ],
      );
    }
    ctx.ok({
      message: 'Thanks! Your purchase is confirmed and the details have been saved to your account.',
      data: {
        total,
        items: items.length,
      },
    });
  }));

  router.get('/orders/me', requireRole(['customer'])(async ctx => {
    await ensureTicketPurchaseTables();
    const rows = await query(
      `SELECT purchase_id, item_name, item_type, quantity, price, details, created_at
       FROM ticket_purchase
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 200`,
      [ctx.authUser.id],
    ).catch(() => []);
    ctx.ok({
      data: rows.map(row => ({
        purchase_id: row.purchase_id,
        item_name: row.item_name,
        item_type: row.item_type,
        quantity: row.quantity,
        price: Number(row.price ?? 0),
        details: typeof row.details === 'string' ? safeParse(row.details) : row.details,
        created_at: row.created_at,
      })),
    });
  }));
}

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
