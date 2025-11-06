import { query } from '../db.js';
import { requireRole } from '../middleware/auth.js';
import {
  ensureDefaultFoodVendor,
  ensureDefaultGiftShop,
  ensureTicketCatalogTable,
} from '../services/ensure.js';

export function registerCatalogRoutes(router) {
  router.get('/ticket-types', async ctx => {
    try {
      await ensureTicketCatalogTable();
    } catch {
      // Table creation is best-effort; continue even if it fails for lack of permissions.
    }

    let catalogRows = await query(
      'SELECT ticket_type AS ticket_type, price FROM ticket_catalog ORDER BY ticket_type ASC',
    ).catch(err => {
      if (err?.code && err.code !== 'ER_NO_SUCH_TABLE') {
        console.error('ticket catalog query failed', err);
      }
      return [];
    });

    if (!Array.isArray(catalogRows)) catalogRows = [];

    if (!catalogRows.length) {
      const fallbackRows = await query(`
        SELECT DISTINCT TicketType AS ticket_type, AVG(Price) AS price
        FROM ticket
        WHERE TicketType IS NOT NULL AND TicketType <> ''
        GROUP BY TicketType
        ORDER BY TicketType ASC
      `).catch(() => []);

      const fallbackData = (fallbackRows || [])
        .map(row => ({
          name: row.ticket_type ?? row.TicketType ?? row.ticketType ?? '',
          price: Number(row.price ?? row.Price ?? 0),
        }))
        .filter(item => item.name);

      ctx.ok({ data: fallbackData });
      return;
    }

    const data = catalogRows
      .map(row => ({
        name: row.name ?? row.ticket_type ?? row.TicketType ?? row.ticketType ?? '',
        price: Number(row.price ?? row.Price ?? 0),
      }))
      .filter(item => item.name);

    ctx.ok({ data });
  });

  router.post('/ticket-types', requireRole(['owner', 'admin'])(async ctx => {
    const name = String(ctx.body?.name || '').trim();
    const price = Number(ctx.body?.price);
    if (!name) {
      ctx.error(400, 'Ticket name is required.');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      ctx.error(400, 'Ticket price must be a non-negative number.');
      return;
    }
    try {
      await ensureTicketCatalogTable();
    } catch {
      // continue even if table creation fails
    }
    await query(
      'INSERT INTO ticket_catalog (ticket_type, price) VALUES (?, ?)',
      [name, price],
    );
    ctx.created({ data: { name, price } });
  }));

  router.put('/ticket-types/:name', requireRole(['owner', 'admin'])(async ctx => {
    const name = String(ctx.params.name || '').trim();
    const price = Number(ctx.body?.price);
    if (!name) {
      ctx.error(400, 'Ticket name is required.');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      ctx.error(400, 'Ticket price must be a non-negative number.');
      return;
    }
    try {
      await ensureTicketCatalogTable();
    } catch {
      // continue even if table creation fails
    }
    const result = await query(
      'UPDATE ticket_catalog SET price = ? WHERE ticket_type = ?',
      [price, name],
    );
    if (!result.affectedRows) {
      ctx.error(404, 'Ticket type not found.');
      return;
    }
    ctx.ok({ data: { name, price } });
  }));

  router.delete('/ticket-types/:name', requireRole(['owner', 'admin'])(async ctx => {
    const name = String(ctx.params.name || '').trim();
    if (!name) {
      ctx.error(400, 'Ticket name is required.');
      return;
    }
    try {
      await ensureTicketCatalogTable();
    } catch {
      // continue even if table creation fails
    }
    const result = await query(
      'DELETE FROM ticket_catalog WHERE ticket_type = ?',
      [name],
    );
    if (!result.affectedRows) {
      ctx.error(404, 'Ticket type not found.');
      return;
    }
    ctx.noContent();
  }));

  router.get('/gift-items', requireRole(['employee', 'manager', 'admin', 'owner'])(async ctx => {
    const rows = await query(`
      SELECT gi.item_id, gi.name, gi.price, gi.shop_id, gs.ShopName AS shop_name
      FROM gift_item gi
      JOIN gift_shops gs ON gs.ShopID = gi.shop_id
      ORDER BY gs.ShopName, gi.name
    `).catch(() => []);
    ctx.ok({
      data: rows.map(row => ({
        item_id: row.item_id,
        name: row.name,
        price: Number(row.price ?? 0),
        shop_id: row.shop_id,
        shop_name: row.shop_name,
      })),
    });
  }));

  router.post('/gift-items', requireRole(['owner', 'admin'])(async ctx => {
    const name = String(ctx.body?.name || '').trim();
    const price = Number(ctx.body?.price);
    let shopId = ctx.body?.shopId ? Number(ctx.body.shopId) : null;
    if (!name) {
      ctx.error(400, 'Item name is required.');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      ctx.error(400, 'Price must be a non-negative number.');
      return;
    }
    if (!shopId) {
      shopId = await ensureDefaultGiftShop();
    } else {
      const exists = await query(
        'SELECT ShopID FROM gift_shops WHERE ShopID = ? LIMIT 1',
        [shopId],
      );
      if (!exists.length) {
        ctx.error(400, 'Invalid gift shop.');
        return;
      }
    }
    const result = await query(
      'INSERT INTO gift_item (shop_id, name, price, is_active) VALUES (?, ?, ?, 1)',
      [shopId, name, price],
    );
    ctx.created({
      data: { item_id: result.insertId, name, price, shop_id: shopId },
    });
  }));

  router.put('/gift-items/:id', requireRole(['owner', 'admin'])(async ctx => {
    const id = Number(ctx.params.id);
    const name = ctx.body?.name ? String(ctx.body.name).trim() : null;
    const price = ctx.body?.price !== undefined ? Number(ctx.body.price) : null;
    if (!id) {
      ctx.error(400, 'Item id is required.');
      return;
    }
    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      ctx.error(400, 'Price must be a non-negative number.');
      return;
    }
    const fields = [];
    const values = [];
    if (name) {
      fields.push('name = ?');
      values.push(name);
    }
    if (price !== null) {
      fields.push('price = ?');
      values.push(price);
    }
    if (!fields.length) {
      ctx.error(400, 'Nothing to update.');
      return;
    }
    values.push(id);
    const result = await query(
      `UPDATE gift_item SET ${fields.join(', ')} WHERE item_id = ?`,
      values,
    );
    if (!result.affectedRows) {
      ctx.error(404, 'Gift item not found.');
      return;
    }
    ctx.ok({ data: { item_id: id, name, price } });
  }));

  router.delete('/gift-items/:id', requireRole(['owner', 'admin'])(async ctx => {
    const id = Number(ctx.params.id);
    if (!id) {
      ctx.error(400, 'Item id is required.');
      return;
    }
    const result = await query(
      'DELETE FROM gift_item WHERE item_id = ?',
      [id],
    );
    if (!result.affectedRows) {
      ctx.error(404, 'Gift item not found.');
      return;
    }
    ctx.noContent();
  }));

  router.get('/food-items', requireRole(['employee', 'manager', 'admin', 'owner'])(async ctx => {
    const rows = await query(`
      SELECT mi.item_id, mi.name, mi.price, mi.vendor_id, fv.VendorName AS vendor_name
      FROM menu_item mi
      JOIN food_vendor fv ON fv.VendorID = mi.vendor_id
      ORDER BY fv.VendorName, mi.name
    `).catch(() => []);
    ctx.ok({
      data: rows.map(row => ({
        item_id: row.item_id,
        name: row.name,
        price: Number(row.price ?? 0),
        vendor_id: row.vendor_id,
        vendor_name: row.vendor_name,
      })),
    });
  }));

  router.post('/food-items', requireRole(['owner', 'admin'])(async ctx => {
    const name = String(ctx.body?.name || '').trim();
    const price = Number(ctx.body?.price);
    let vendorId = ctx.body?.vendorId ? Number(ctx.body.vendorId) : null;
    if (!name) {
      ctx.error(400, 'Item name is required.');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      ctx.error(400, 'Price must be a non-negative number.');
      return;
    }
    if (!vendorId) {
      vendorId = await ensureDefaultFoodVendor();
    } else {
      const exists = await query(
        'SELECT VendorID FROM food_vendor WHERE VendorID = ? LIMIT 1',
        [vendorId],
      );
      if (!exists.length) {
        ctx.error(400, 'Invalid food vendor.');
        return;
      }
    }
    const result = await query(
      'INSERT INTO menu_item (vendor_id, name, price, is_active) VALUES (?, ?, ?, 1)',
      [vendorId, name, price],
    );
    ctx.created({
      data: { item_id: result.insertId, name, price, vendor_id: vendorId },
    });
  }));

  router.put('/food-items/:id', requireRole(['owner', 'admin'])(async ctx => {
    const id = Number(ctx.params.id);
    const name = ctx.body?.name ? String(ctx.body.name).trim() : null;
    const price = ctx.body?.price !== undefined ? Number(ctx.body.price) : null;
    if (!id) {
      ctx.error(400, 'Item id is required.');
      return;
    }
    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      ctx.error(400, 'Price must be a non-negative number.');
      return;
    }
    const fields = [];
    const values = [];
    if (name) {
      fields.push('name = ?');
      values.push(name);
    }
    if (price !== null) {
      fields.push('price = ?');
      values.push(price);
    }
    if (!fields.length) {
      ctx.error(400, 'Nothing to update.');
      return;
    }
    values.push(id);
    const result = await query(
      `UPDATE menu_item SET ${fields.join(', ')} WHERE item_id = ?`,
      values,
    );
    if (!result.affectedRows) {
      ctx.error(404, 'Menu item not found.');
      return;
    }
    ctx.ok({ data: { item_id: id, name, price } });
  }));

  router.delete('/food-items/:id', requireRole(['owner', 'admin'])(async ctx => {
    const id = Number(ctx.params.id);
    if (!id) {
      ctx.error(400, 'Item id is required.');
      return;
    }
    const result = await query(
      'DELETE FROM menu_item WHERE item_id = ?',
      [id],
    );
    if (!result.affectedRows) {
      ctx.error(404, 'Menu item not found.');
      return;
    }
    ctx.noContent();
  }));

  async function loadParkingLots() {
    let viewRows = [];
    try {
      viewRows = await query(`
        SELECT parking_lot_id, lot_name, base_price, service_date, passes_today
        FROM v_parking_lots_prices
        ORDER BY lot_name
      `);
    } catch (err) {
      if (!['ER_NO_SUCH_TABLE', 'ER_VIEW_INVALID'].includes(err?.code)) {
        throw err;
      }
    }

    let tableRows = [];
    try {
      tableRows = await query(`
        SELECT parking_lot_id, lot_name, base_price
        FROM parking_lot
        ORDER BY lot_name
      `);
    } catch {
      tableRows = [];
    }

    const merged = new Map();
    const addRow = raw => {
      if (!raw) return;
      const idValue = raw.parking_lot_id ?? raw.lotId ?? raw.id;
      if (idValue === undefined || idValue === null) return;
      const lotId = Number(idValue);
      const lotName = raw.lot_name ?? raw.lot ?? '';
      merged.set(lotId, {
        parking_lot_id: lotId,
        lot_name: lotName,
        base_price: raw.base_price ?? raw.price ?? 0,
        service_date: raw.service_date ?? raw.serviceDate ?? null,
        passes_today: raw.passes_today ?? raw.passesToday ?? null,
      });
    };

    tableRows.forEach(addRow);
    viewRows.forEach(addRow);

    return Array.from(merged.values())
      .sort((a, b) => String(a.lot_name || '').localeCompare(String(b.lot_name || '')))
      .map(row => ({
        lotId: row.parking_lot_id,
        lot: row.lot_name,
        price: Number(row.base_price ?? 0),
        serviceDate: row.service_date
          ? (row.service_date instanceof Date
            ? row.service_date.toISOString().slice(0, 10)
            : String(row.service_date))
          : null,
        passesToday: row.passes_today !== undefined && row.passes_today !== null
          ? Number(row.passes_today)
          : null,
      }));
  }

  router.get('/parking-lots', requireRole(['employee', 'manager', 'admin', 'owner'])(async ctx => {
    const data = await loadParkingLots();
    ctx.ok({ data });
  }));

  router.get('/parking/options', async ctx => {
    const data = await loadParkingLots();
    ctx.ok({ data });
  });

  router.post('/parking-lots', requireRole(['owner', 'admin'])(async ctx => {
    const lotName = String(ctx.body?.lot_name || ctx.body?.lotName || ctx.body?.lot || '').trim();
    const basePriceRaw = ctx.body?.base_price ?? ctx.body?.price;
    const basePrice = Number(basePriceRaw);

    if (!lotName) {
      ctx.error(400, 'Lot name is required.');
      return;
    }
    if (!Number.isFinite(basePrice) || basePrice < 0) {
      ctx.error(400, 'Base price must be a non-negative number.');
      return;
    }

    const exists = await query(
      'SELECT parking_lot_id FROM parking_lot WHERE lot_name = ? LIMIT 1',
      [lotName],
    );
    if (exists.length) {
      ctx.error(409, 'A parking lot already exists with that name.');
      return;
    }

    const result = await query(
      'INSERT INTO parking_lot (lot_name, base_price) VALUES (?, ?)',
      [lotName, basePrice],
    );

    ctx.created({
      data: {
        parking_lot_id: result.insertId,
        lot_name: lotName,
        base_price: basePrice,
      },
    });
  }));
}
