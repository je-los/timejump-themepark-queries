import { query } from '../db.js';
import { requireRole } from '../middleware/auth.js';
import {
  ensureGiftSalesTable,
  ensureMenuSalesTable,
} from '../services/ensure.js';
import { sendTicketPurchaseEmail } from '../services/mailer.js';

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
      ensureMenuSalesTable(),
      ensureGiftSalesTable(),
    ]);
    const userId = ctx.authUser.id;
    const userEmail = ctx.authUser.email || null;
    const now = new Date();
    const saleDate = now.toISOString().slice(0, 19).replace('T', ' ');
    const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    for (const item of items) {
      const visitDate = normalizeVisitDate(item.meta);
      const numericId = Number(item.id);
      if (item.kind === 'food' && Number.isInteger(numericId) && numericId > 0) {
        await query(
          'INSERT INTO menu_sales (menu_item_id, quantity, sale_date, price_each, UserID, CustomerEmail) VALUES (?, ?, ?, ?, ?, ?)',
          [numericId, item.qty, saleDate, item.price, userId, userEmail],
        ).catch(() => {});
      }
      if (item.kind === 'gift' && Number.isInteger(numericId) && numericId > 0) {
        await query(
          'INSERT INTO gift_sales (gift_item_id, quantity, sale_date, price_each, UserID, CustomerEmail) VALUES (?, ?, ?, ?, ?, ?)',
          [numericId, item.qty, saleDate, item.price, userId, userEmail],
        ).catch(() => {});
      }
      if (item.kind === 'ticket') {
        for (let i = 0; i < item.qty; i += 1) {
          await query(
            'INSERT INTO ticket (TicketType, UserID, CustomerEmail, sale_date, Price, PurchaseDate, VisitDate) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
              item.name,
              userId,
              userEmail,
              saleDate,
              item.price,
              saleDate.slice(0, 10),
              visitDate,
            ],
          ).catch(() => {});
        }
      }
      if (item.kind === 'parking') {
        const lotId = Number.isInteger(numericId) && numericId > 0 ? numericId : null;
        await query(
          'INSERT INTO parking_sale (parking_lot_id, lot_name, quantity, sale_date, visit_date, UserID, CustomerEmail, price_each) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [lotId, item.name, item.qty, saleDate, visitDate, userId, userEmail, item.price],
        ).catch(() => {});
      }
    }
    const ticketItems = items.filter(item => item.kind === 'ticket');
    if (ticketItems.length && ctx.authUser?.email) {
      sendTicketPurchaseEmail({
        to: ctx.authUser.email,
        items: ticketItems,
        total: ticketItems.reduce((sum, item) => sum + item.price * item.qty, 0),
        purchaseDate: now,
      }).catch(err => {
        console.warn('[orders] Failed to queue ticket email', err?.message || err);
      });
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
    const userId = ctx.authUser.id;
    const ticketRows = await query(
      `SELECT TicketID AS id, 'ticket' AS kind, TicketType AS item_name, 1 AS quantity, Price AS price,
              sale_date, VisitDate AS visit_date, NULL AS details
       FROM ticket
       WHERE UserID = ?
       ORDER BY sale_date DESC
       LIMIT 200`,
      [userId],
    ).catch(() => []);
    const foodRows = await query(
      `SELECT SaleID AS id, 'food' AS kind, mi.name AS item_name, ms.quantity, ms.price_each AS price,
              ms.sale_date, NULL AS visit_date, NULL AS details
       FROM menu_sales ms
       JOIN menu_item mi ON mi.item_id = ms.menu_item_id
       WHERE ms.UserID = ?
       ORDER BY ms.sale_date DESC
       LIMIT 200`,
      [userId],
    ).catch(() => []);
    const giftRows = await query(
      `SELECT SaleID AS id, 'gift' AS kind, gi.name AS item_name, gs.quantity, gs.price_each AS price,
              gs.sale_date, NULL AS visit_date, NULL AS details
       FROM gift_sales gs
       JOIN gift_item gi ON gi.item_id = gs.gift_item_id
       WHERE gs.UserID = ?
       ORDER BY gs.sale_date DESC
       LIMIT 200`,
      [userId],
    ).catch(() => []);
    const parkingRows = await query(
      `SELECT SaleID AS id, 'parking' AS kind, COALESCE(pl.lot_name, ps.lot_name, 'Parking') AS item_name,
              ps.quantity, ps.price_each AS price, ps.sale_date, ps.visit_date, NULL AS details
       FROM parking_sale ps
       LEFT JOIN parking_lot pl ON pl.parking_lot_id = ps.parking_lot_id
       WHERE ps.UserID = ?
       ORDER BY ps.sale_date DESC
       LIMIT 200`,
      [userId],
    ).catch(() => []);

    const combined = [...ticketRows, ...foodRows, ...giftRows, ...parkingRows]
      .map(row => ({
        purchase_id: row.id,
        item_name: row.item_name,
        item_type: row.kind,
        quantity: Number(row.quantity || 0),
        price: Number(row.price || 0),
        visit_date: row.visit_date,
        details: row.details,
        created_at: row.sale_date,
      }))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 200);

    ctx.ok({ data: combined });
  }));
}

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
