import { query } from '../db.js';
import { requireRole } from '../middleware/auth.js';
import {
  ensureGiftSalesTable,
  ensureMenuSalesTable,
  ensureTicketPurchaseTables,
} from '../services/ensure.js';

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

function normalizeVisitDate(meta) {
  if (!meta || typeof meta !== 'object') return null;
  const raw = meta.visitDate || meta.visit_date;
  if (!raw || typeof raw !== 'string') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export function registerOrderRoutes(router) {
  router.post('/checkout', requireRole(['customer'])(async ctx => {
    const items = normalizeItems(ctx.body?.items);
    if (!items.length) {
      ctx.error(400, 'Your cart is empty.');
      return;
    }
    await Promise.all([
      ensureTicketPurchaseTables(),
      ensureMenuSalesTable(),
      ensureGiftSalesTable(),
    ]);
    const userId = ctx.authUser.id;
    const now = new Date();
    const saleDate = now.toISOString().slice(0, 19).replace('T', ' ');
    const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    for (const item of items) {
      const visitDate = normalizeVisitDate(item.meta);
      await query(
        'INSERT INTO ticket_purchase (user_id, item_name, item_type, quantity, price, visit_date, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          userId,
          item.name,
          item.kind,
          item.qty,
          item.price,
          visitDate,
          item.meta ? JSON.stringify(item.meta) : null,
          now,
        ],
      );
      const numericId = Number(item.id);
      if (item.kind === 'food' && Number.isInteger(numericId) && numericId > 0) {
        await query(
          'INSERT INTO menu_sales (menu_item_id, quantity, sale_date, price_each) VALUES (?, ?, ?, ?)',
          [numericId, item.qty, saleDate, item.price],
        ).catch(() => {});
      }
      if (item.kind === 'gift' && Number.isInteger(numericId) && numericId > 0) {
        await query(
          'INSERT INTO gift_sales (gift_item_id, quantity, sale_date, price_each) VALUES (?, ?, ?, ?)',
          [numericId, item.qty, saleDate, item.price],
        ).catch(() => {});
      }
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
      `SELECT purchase_id, item_name, item_type, quantity, price, visit_date, details, created_at
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
        visit_date: row.visit_date,
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
