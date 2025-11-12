import { query } from '../db.js';
import { requireRole } from '../middleware/auth.js';
import {
  ensureDefaultGiftShop,
  ensureFoodVendorThemeColumn,
  ensureGiftItemImageColumn,
  ensureMenuItemImageColumn,
  ensureTicketCatalogTable,
} from '../services/ensure.js';

const FALLBACK_MENU_ITEMS = [
  {
    id: 1,
    name: 'Dino Nuggies',
    price: 12.0,
    image_url: null,
    vendor_name: 'Dino Diner',
    theme_name: 'Jurassic Zone',
  },
  {
    id: 2,
    name: 'Meteor Meatballs',
    price: 14.5,
    image_url: null,
    vendor_name: 'Dino Diner',
    theme_name: 'Jurassic Zone',
  },
  {
    id: 9,
    name: 'Photon Power Bowl',
    price: 13.0,
    image_url: null,
    vendor_name: 'Photon Fuel Hub',
    theme_name: 'Neon City',
  },
  {
    id: 12,
    name: 'Dragonfire Noodles',
    price: 15.75,
    image_url: null,
    vendor_name: "Dragon's Hearth Tavern",
    theme_name: 'Mythic Frontier',
  },
  {
    id: 17,
    name: 'Frontier Frybread Taco',
    price: 11.25,
    image_url: null,
    vendor_name: "Cactus Jack's Cantina",
    theme_name: 'Desert Frontier',
  },
];

export function registerCatalogRoutes(router) {
  function cleanImageUrl(value) {
    const trimmed = String(value || '').trim();
    return trimmed || null;
  }

  async function ensureThemeExists(themeId) {
    if (!themeId) return null;
    const rows = await query('SELECT themeID FROM theme WHERE themeID = ? LIMIT 1', [themeId]);
    return rows.length ? Number(rows[0].themeID ?? rows[0].ThemeID ?? themeId) : null;
  }

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
    const currentName = String(ctx.params.name || '').trim();
    const price = Number(ctx.body?.price);
    const nextNameRaw = ctx.body?.newName ?? ctx.body?.name;
    const nextName = nextNameRaw ? String(nextNameRaw).trim() : null;
    if (!currentName) {
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

    const updates = ['price = ?'];
    const values = [price];
    if (nextName && nextName !== currentName) {
      const duplicate = await query(
        'SELECT ticket_type FROM ticket_catalog WHERE ticket_type = ? LIMIT 1',
        [nextName],
      );
      if (duplicate.length) {
        ctx.error(409, 'Another ticket type already uses that name.');
        return;
      }
      updates.push('ticket_type = ?');
      values.push(nextName);
    }
    values.push(currentName);

    const result = await query(
      `UPDATE ticket_catalog SET ${updates.join(', ')} WHERE ticket_type = ?`,
      values,
    );
    if (!result.affectedRows) {
      ctx.error(404, 'Ticket type not found.');
      return;
    }
    ctx.ok({ data: { name: nextName || currentName, price } });
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
    await ensureGiftItemImageColumn();
    const rows = await query(`
      SELECT gi.item_id,
             gi.name,
             gi.price,
             gi.shop_id,
             gi.image_url,
             gs.ShopName AS shop_name,
             t.themeName AS theme_name
      FROM gift_item gi
      JOIN gift_shops gs ON gs.ShopID = gi.shop_id
      LEFT JOIN theme t ON t.themeID = gs.ThemeID
      ORDER BY gs.ShopName, gi.name
    `).catch(() => []);
    ctx.ok({
      data: rows.map(row => ({
        item_id: row.item_id,
        name: row.name,
        price: Number(row.price ?? 0),
        shop_id: row.shop_id,
        shop_name: row.shop_name,
        image_url: row.image_url || null,
        theme_name: row.theme_name || null,
      })),
    });
  }));

  router.get('/gift-shops', requireRole(['employee', 'manager', 'admin', 'owner'])(async ctx => {
    const rows = await query(`
      SELECT gs.ShopID, gs.ShopName, gs.ThemeID, t.themeName
      FROM gift_shops gs
      LEFT JOIN theme t ON t.themeID = gs.ThemeID
      ORDER BY gs.ShopName ASC
    `).catch(() => []);
    ctx.ok({
      data: rows.map(row => ({
        shop_id: row.ShopID,
        name: row.ShopName,
        theme_id: row.ThemeID,
        theme_name: row.themeName || null,
      })),
    });
  }));

  router.post('/gift-items', requireRole(['owner', 'admin'])(async ctx => {
    await ensureGiftItemImageColumn();
    const name = String(ctx.body?.name || '').trim();
    const price = Number(ctx.body?.price);
    const shopId = ctx.body?.shopId ? Number(ctx.body.shopId) : null;
    const imageUrl = cleanImageUrl(ctx.body?.imageUrl ?? ctx.body?.image_url);
    if (!name) {
      ctx.error(400, 'Item name is required.');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      ctx.error(400, 'Price must be a non-negative number.');
      return;
    }
    if (!shopId) {
      ctx.error(400, 'Gift shop is required.');
      return;
    }
    const exists = await query(
      'SELECT ShopID FROM gift_shops WHERE ShopID = ? LIMIT 1',
      [shopId],
    );
    if (!exists.length) {
      ctx.error(400, 'Invalid gift shop.');
      return;
    }
    const result = await query(
      'INSERT INTO gift_item (shop_id, name, price, image_url, is_active) VALUES (?, ?, ?, ?, 1)',
      [shopId, name, price, imageUrl],
    );
    ctx.created({
      data: { item_id: result.insertId, name, price, shop_id: shopId, image_url: imageUrl },
    });
  }));

  router.post('/gift-shops', requireRole(['owner', 'admin'])(async ctx => {
    const name = String(ctx.body?.name || ctx.body?.shopName || '').trim();
    const themeId = Number(ctx.body?.themeId || ctx.body?.ThemeID);
    const openDate = ctx.body?.openDate ? String(ctx.body.openDate).trim() : null;
    if (!name) {
      ctx.error(400, 'Shop name is required.');
      return;
    }
    if (!themeId) {
      ctx.error(400, 'Theme is required.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(openDate || '')) {
      ctx.error(400, 'Open date must be provided in YYYY-MM-DD format.');
      return;
    }
    const themeExists = await query(
      'SELECT themeID FROM theme WHERE themeID = ? LIMIT 1',
      [themeId],
    );
    if (!themeExists.length) {
      ctx.error(400, 'Theme not found.');
      return;
    }
    const exists = await query(
      'SELECT ShopID FROM gift_shops WHERE ShopName = ? LIMIT 1',
      [name],
    );
    if (exists.length) {
      ctx.error(409, 'A shop already exists with that name.');
      return;
    }
    const result = await query(
      'INSERT INTO gift_shops (ThemeID, ShopName, Revenue, OpenDate) VALUES (?, ?, NULL, ?)',
      [themeId, name, openDate],
    );
    ctx.created({
      data: {
        shop_id: result.insertId,
        name,
        theme_id: themeId,
        open_date: openDate,
      },
    });
  }));

  router.put('/gift-shops/:id', requireRole(['owner', 'admin'])(async ctx => {
    const shopId = Number(ctx.params?.id);
    if (!shopId) {
      ctx.error(400, 'Valid shop ID is required.');
      return;
    }
    const name = ctx.body?.name ? String(ctx.body.name).trim() : null;
    const themeId = ctx.body?.themeId !== undefined ? Number(ctx.body.themeId) : null;
    const closeDate = ctx.body?.closeDate ? String(ctx.body.closeDate).trim() : undefined;
    const fields = [];
    const values = [];
    if (name) {
      fields.push('ShopName = ?');
      values.push(name);
    }
    if (themeId) {
      const themeExists = await query(
        'SELECT themeID FROM theme WHERE themeID = ? LIMIT 1',
        [themeId],
      );
      if (!themeExists.length) {
        ctx.error(400, 'Theme not found.');
        return;
      }
      fields.push('ThemeID = ?');
      values.push(themeId);
    }
    if (closeDate !== undefined) {
      fields.push('CloseDate = ?');
      values.push(closeDate || null);
    }
    if (!fields.length) {
      ctx.error(400, 'Nothing to update.');
      return;
    }
    values.push(shopId);
    const result = await query(
      `UPDATE gift_shops SET ${fields.join(', ')} WHERE ShopID = ?`,
      values,
    );
    if (!result.affectedRows) {
      ctx.error(404, 'Gift shop not found.');
      return;
    }
    ctx.ok({ data: { shop_id: shopId, name, theme_id: themeId, close_date: closeDate } });
  }));

  router.delete('/gift-shops/:id', requireRole(['owner', 'admin'])(async ctx => {
    const shopId = Number(ctx.params?.id);
    if (!shopId) {
      ctx.error(400, 'Valid shop ID is required.');
      return;
    }
    const attached = await query(
      'SELECT item_id FROM gift_item WHERE shop_id = ? LIMIT 1',
      [shopId],
    );
    if (attached.length) {
      ctx.error(400, 'Reassign or delete gift items before removing this shop.');
      return;
    }
    const result = await query(
      'DELETE FROM gift_shops WHERE ShopID = ?',
      [shopId],
    );
    if (!result.affectedRows) {
      ctx.error(404, 'Gift shop not found.');
      return;
    }
    ctx.noContent();
  }));

  router.put('/gift-items/:id', requireRole(['owner', 'admin'])(async ctx => {
    await ensureGiftItemImageColumn();
    const id = Number(ctx.params.id);
    const name = ctx.body?.name ? String(ctx.body.name).trim() : null;
    const price = ctx.body?.price !== undefined ? Number(ctx.body.price) : null;
    const imageUrl = ctx.body?.imageUrl !== undefined || ctx.body?.image_url !== undefined
      ? cleanImageUrl(ctx.body.imageUrl ?? ctx.body.image_url)
      : undefined;
    const shopId = ctx.body?.shopId ? Number(ctx.body.shopId) : null;
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
    if (imageUrl !== undefined) {
      fields.push('image_url = ?');
      values.push(imageUrl);
    }
    if (shopId) {
      const exists = await query(
        'SELECT ShopID FROM gift_shops WHERE ShopID = ? LIMIT 1',
        [shopId],
      );
      if (!exists.length) {
        ctx.error(400, 'Invalid gift shop.');
        return;
      }
      fields.push('shop_id = ?');
      values.push(shopId);
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
    ctx.ok({ data: { item_id: id, name, price, image_url: imageUrl, shop_id: shopId } });
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
    await ensureMenuItemImageColumn();
    await ensureFoodVendorThemeColumn();
    const rows = await query(`
      SELECT mi.item_id,
             mi.name,
             mi.price,
             mi.vendor_id,
             mi.image_url,
             fv.VendorName AS vendor_name,
             fv.ThemeID AS vendor_theme_id,
             t.themeName AS theme_name
      FROM menu_item mi
      JOIN food_vendor fv ON fv.VendorID = mi.vendor_id
      LEFT JOIN theme t ON t.themeID = fv.ThemeID
      ORDER BY fv.VendorName, mi.name
    `).catch(() => []);
    ctx.ok({
      data: rows.map(row => ({
        item_id: row.item_id,
        name: row.name,
        price: Number(row.price ?? 0),
        vendor_id: row.vendor_id,
        vendor_name: row.vendor_name,
        theme_id: row.vendor_theme_id || null,
        theme_name: row.theme_name || null,
        image_url: row.image_url || null,
      })),
    });
  }));

  router.get('/food-vendors', requireRole(['employee', 'manager', 'admin', 'owner'])(async ctx => {
    await ensureFoodVendorThemeColumn();
    const rows = await query(`
      SELECT fv.VendorID,
             fv.VendorName,
             fv.ThemeID,
             t.themeName
      FROM food_vendor fv
      LEFT JOIN theme t ON t.themeID = fv.ThemeID
      ORDER BY fv.VendorName ASC
    `).catch(() => []);
    ctx.ok({
      data: rows.map(row => ({
        vendor_id: row.VendorID,
        name: row.VendorName,
        theme_id: row.ThemeID ?? null,
        theme_name: row.themeName || null,
      })),
    });
  }));

  router.post('/food-vendors', requireRole(['owner', 'admin'])(async ctx => {
    await ensureFoodVendorThemeColumn();
    const name = String(ctx.body?.name || ctx.body?.vendorName || '').trim();
    const themeIdRaw = Number(ctx.body?.themeId || ctx.body?.themeID);
    if (!name) {
      ctx.error(400, 'Vendor name is required.');
      return;
    }
    if (!themeIdRaw) {
      ctx.error(400, 'Theme is required.');
      return;
    }
    const themeId = await ensureThemeExists(themeIdRaw);
    if (!themeId) {
      ctx.error(400, 'Theme not found.');
      return;
    }
    const existing = await query(
      'SELECT VendorID, ThemeID FROM food_vendor WHERE VendorName = ? LIMIT 1',
      [name],
    );
    if (existing.length) {
      const vendor = existing[0];
      if (vendor.ThemeID && vendor.ThemeID !== themeId) {
        ctx.error(409, 'Vendor already assigned to another theme.');
        return;
      }
      if (!vendor.ThemeID) {
        await query('UPDATE food_vendor SET ThemeID = ? WHERE VendorID = ?', [themeId, vendor.VendorID]);
      }
      ctx.ok({
        data: {
          vendor_id: vendor.VendorID,
          name,
          theme_id: themeId,
        },
      });
      return;
    }
    const result = await query(
      'INSERT INTO food_vendor (VendorName, ThemeID) VALUES (?, ?)',
      [name, themeId],
    );
    ctx.created({
      data: {
        vendor_id: result.insertId,
        name,
        theme_id: themeId,
      },
    });
  }));

  router.post('/food-items', requireRole(['owner', 'admin'])(async ctx => {
    await ensureMenuItemImageColumn();
    await ensureFoodVendorThemeColumn();
    const name = String(ctx.body?.name || '').trim();
    const price = Number(ctx.body?.price);
    const vendorId = ctx.body?.vendorId ? Number(ctx.body.vendorId) : null;
    const imageUrl = cleanImageUrl(ctx.body?.imageUrl ?? ctx.body?.image_url);
    if (!name) {
      ctx.error(400, 'Item name is required.');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      ctx.error(400, 'Price must be a non-negative number.');
      return;
    }
    if (!vendorId) {
      ctx.error(400, 'Vendor is required.');
      return;
    }
    const vendorRows = await query(
      'SELECT VendorID FROM food_vendor WHERE VendorID = ? LIMIT 1',
      [vendorId],
    );
    if (!vendorRows.length) {
      ctx.error(400, 'Invalid food vendor.');
      return;
    }
    const result = await query(
      'INSERT INTO menu_item (vendor_id, name, price, image_url, is_active) VALUES (?, ?, ?, ?, 1)',
      [vendorId, name, price, imageUrl],
    );
    ctx.created({
      data: { item_id: result.insertId, name, price, vendor_id: vendorId, image_url: imageUrl },
    });
  }));

  router.put('/food-items/:id', requireRole(['owner', 'admin'])(async ctx => {
    await ensureMenuItemImageColumn();
    await ensureFoodVendorThemeColumn();
    const id = Number(ctx.params.id);
    const name = ctx.body?.name ? String(ctx.body.name).trim() : null;
    const price = ctx.body?.price !== undefined ? Number(ctx.body.price) : null;
    const imageUrl = ctx.body?.imageUrl !== undefined || ctx.body?.image_url !== undefined
      ? cleanImageUrl(ctx.body.imageUrl ?? ctx.body.image_url)
      : undefined;
    const vendorIdInput = ctx.body?.vendorId ? Number(ctx.body.vendorId) : null;
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
    if (imageUrl !== undefined) {
      fields.push('image_url = ?');
      values.push(imageUrl);
    }
    if (vendorIdInput) {
      let vendorId = vendorIdInput;
      const vendorRows = await query(
        'SELECT VendorID FROM food_vendor WHERE VendorID = ? LIMIT 1',
        [vendorId],
      );
      if (!vendorRows.length) {
        ctx.error(400, 'Invalid food vendor.');
        return;
      }
      fields.push('vendor_id = ?');
      values.push(vendorId);
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
    ctx.ok({ data: { item_id: id, name, price, image_url: imageUrl } });
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

  router.put('/food-vendors/:id', requireRole(['owner', 'admin'])(async ctx => {
    await ensureFoodVendorThemeColumn();
    const vendorId = Number(ctx.params?.id);
    if (!vendorId) {
      ctx.error(400, 'Valid vendor ID is required.');
      return;
    }
    const name = ctx.body?.name ? String(ctx.body.name).trim() : null;
    const themeIdRaw = ctx.body?.themeId ?? ctx.body?.ThemeID;
    const themeId = themeIdRaw !== undefined && themeIdRaw !== null && String(themeIdRaw).trim() !== ''
      ? Number(themeIdRaw)
      : null;

    if (!name && themeId === null) {
      ctx.error(400, 'Nothing to update.');
      return;
    }

    const fields = [];
    const values = [];

    if (name) {
      const duplicate = await query(
        'SELECT VendorID FROM food_vendor WHERE VendorName = ? AND VendorID <> ? LIMIT 1',
        [name, vendorId],
      );
      if (duplicate.length) {
        ctx.error(409, 'Another vendor already uses that name.');
        return;
      }
      fields.push('VendorName = ?');
      values.push(name);
    }

    if (themeId !== null) {
      const themeExists = await ensureThemeExists(themeId);
      if (!themeExists) {
        ctx.error(400, 'Theme not found.');
        return;
      }
      fields.push('ThemeID = ?');
      values.push(themeId);
    }

    values.push(vendorId);
    const result = await query(
      `UPDATE food_vendor SET ${fields.join(', ')} WHERE VendorID = ?`,
      values,
    );
    if (!result.affectedRows) {
      ctx.error(404, 'Food vendor not found.');
      return;
    }
    ctx.ok({ data: { vendor_id: vendorId, name, theme_id: themeId } });
  }));

  router.delete('/food-vendors/:id', requireRole(['owner', 'admin'])(async ctx => {
    const vendorId = Number(ctx.params?.id);
    if (!vendorId) {
      ctx.error(400, 'Valid vendor ID is required.');
      return;
    }
    const attached = await query(
      'SELECT item_id FROM menu_item WHERE vendor_id = ? LIMIT 1',
      [vendorId],
    );
    if (attached.length) {
      ctx.error(400, 'Reassign or delete menu items before removing this vendor.');
      return;
    }
    const result = await query(
      'DELETE FROM food_vendor WHERE VendorID = ?',
      [vendorId],
    );
    if (!result.affectedRows) {
      ctx.error(404, 'Food vendor not found.');
      return;
    }
    ctx.noContent();
  }));

  router.get('/giftshop/items', async ctx => {
    await ensureGiftItemImageColumn();
    const rows = await query(`
      SELECT gi.item_id AS id,
             gi.name,
             gi.price,
             gi.image_url,
             gs.ShopName AS shop_name,
             t.themeName AS theme_name
      FROM gift_item gi
      JOIN gift_shops gs ON gs.ShopID = gi.shop_id
      LEFT JOIN theme t ON t.themeID = gs.ThemeID
      WHERE gi.is_active = 1
      ORDER BY gs.ShopName, gi.name
    `).catch(() => []);
    const items = rows.map(row => ({
      id: row.id,
      name: row.name,
      price: Number(row.price ?? 0),
      image_url: row.image_url || null,
      shop_name: row.shop_name || null,
      theme_name: row.theme_name || null,
    }));
    ctx.ok({ items });
  });

  router.get('/food/items', async ctx => {
    await ensureMenuItemImageColumn();
    await ensureFoodVendorThemeColumn();
    let rows = [];
    let errored = false;
    try {
      rows = await query(`
        SELECT mi.item_id AS id,
               mi.name,
               mi.price,
               mi.image_url,
               fv.VendorName AS vendor_name,
               t.themeName AS theme_name
        FROM menu_item mi
        JOIN food_vendor fv ON fv.VendorID = mi.vendor_id
        LEFT JOIN theme t ON t.themeID = fv.ThemeID
        WHERE mi.is_active = 1
        ORDER BY fv.VendorName, mi.name
      `);
    } catch (err) {
      errored = true;
      console.warn('[food/items] query failed, using fallback menu items:', err?.message);
    }
    if (!Array.isArray(rows)) rows = [];
    if (!rows.length) {
      ctx.ok({ items: FALLBACK_MENU_ITEMS });
      return;
    }
    const items = rows.map(row => ({
      id: row.id,
      name: row.name,
      price: Number(row.price ?? 0),
      image_url: row.image_url || null,
      vendor_name: row.vendor_name || null,
      theme_name: row.theme_name || null,
    }));
    ctx.ok({ items });
  });

  async function loadParkingLots() {
    let viewRows = [];
    try {
      viewRows = await query(`
        SELECT parking_lot_id, lot_name, base_price, passes_today
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

  router.put('/parking-lots/:id', requireRole(['owner', 'admin'])(async ctx => {
    const lotId = Number(ctx.params?.id);
    if (!lotId) {
      ctx.error(400, 'Valid parking lot ID is required.');
      return;
    }
    const lotNameRaw = ctx.body?.lot_name ?? ctx.body?.lotName ?? ctx.body?.lot;
    const basePriceRaw = ctx.body?.base_price ?? ctx.body?.price;

    if (
      (lotNameRaw === undefined || lotNameRaw === null || String(lotNameRaw).trim() === '') &&
      (basePriceRaw === undefined || basePriceRaw === null || String(basePriceRaw).trim() === '')
    ) {
      ctx.error(400, 'Nothing to update.');
      return;
    }

    const fields = [];
    const values = [];

    if (lotNameRaw !== undefined && lotNameRaw !== null) {
      const lotName = String(lotNameRaw).trim();
      if (!lotName) {
        ctx.error(400, 'Lot name cannot be empty.');
        return;
      }
      const exists = await query(
        'SELECT parking_lot_id FROM parking_lot WHERE lot_name = ? AND parking_lot_id <> ? LIMIT 1',
        [lotName, lotId],
      );
      if (exists.length) {
        ctx.error(409, 'Another parking lot already uses that name.');
        return;
      }
      fields.push('lot_name = ?');
      values.push(lotName);
    }

    if (basePriceRaw !== undefined && basePriceRaw !== null && String(basePriceRaw).trim() !== '') {
      const basePrice = Number(basePriceRaw);
      if (!Number.isFinite(basePrice) || basePrice < 0) {
        ctx.error(400, 'Base price must be a non-negative number.');
        return;
      }
      fields.push('base_price = ?');
      values.push(basePrice);
    }

    if (!fields.length) {
      ctx.error(400, 'Nothing to update.');
      return;
    }

    values.push(lotId);
    const result = await query(
      `UPDATE parking_lot SET ${fields.join(', ')} WHERE parking_lot_id = ?`,
      values,
    );
    if (!result.affectedRows) {
      ctx.error(404, 'Parking lot not found.');
      return;
    }
    ctx.ok({ data: { parking_lot_id: lotId } });
  }));

  router.delete('/parking-lots/:id', requireRole(['owner', 'admin'])(async ctx => {
    const lotId = Number(ctx.params?.id);
    if (!lotId) {
      ctx.error(400, 'Valid parking lot ID is required.');
      return;
    }
    const result = await query(
      'DELETE FROM parking_lot WHERE parking_lot_id = ?',
      [lotId],
    );
    if (!result.affectedRows) {
      ctx.error(404, 'Parking lot not found.');
      return;
    }
    ctx.noContent();
  }));
}
