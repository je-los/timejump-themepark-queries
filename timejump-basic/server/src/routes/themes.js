import { query } from '../db.js';
import { requireRole } from '../middleware/auth.js';
import { toSlug } from '../utils/strings.js';

export function registerThemeRoutes(router) {
  router.get('/themes', async ctx => {
    const rows = await query(`
      SELECT t.themeID,
             t.themeName,
             t.Description,
             COUNT(a.AttractionID) AS attraction_count
      FROM theme t
      LEFT JOIN attraction a ON a.ThemeID = t.themeID
      GROUP BY t.themeID, t.themeName, t.Description
      ORDER BY t.themeName ASC
    `).catch(() => []);
    ctx.ok({
      data: rows.map(row => ({
        themeID: row.themeID,
        name: row.themeName,
        description: row.Description,
        slug: toSlug(row.themeName),
        attraction_count: Number(row.attraction_count ?? 0),
      })),
    });
  });

  router.post('/themes', requireRole(['admin', 'owner'])(async ctx => {
    const name = String(ctx.body?.name || ctx.body?.themeName || '').trim();
    const description = String(ctx.body?.description || ctx.body?.Description || '').trim();
    if (!name) {
      ctx.error(400, 'Theme name is required.');
      return;
    }
    if (!description) {
      ctx.error(400, 'Theme description is required.');
      return;
    }
    const exists = await query(
      'SELECT themeID FROM theme WHERE themeName = ? LIMIT 1',
      [name],
    );
    if (exists.length) {
      ctx.error(409, 'A theme with that name already exists.');
      return;
    }
    const result = await query(
      'INSERT INTO theme (themeName, Description) VALUES (?, ?)',
      [name, description],
    );
    ctx.created({
      data: {
        themeID: result.insertId,
        name,
        description,
        slug: toSlug(name),
        attraction_count: 0,
      },
    });
  }));

  router.get('/attraction-types', async ctx => {
    const rows = await query(
      'SELECT AttractionTypeID, TypeName FROM attraction_type ORDER BY TypeName ASC',
    ).catch(() => []);
    ctx.ok({
      data: rows.map(row => ({
        id: row.AttractionTypeID,
        name: row.TypeName,
      })),
    });
  });

  router.post('/attractions', requireRole(['admin', 'owner'])(async ctx => {
    const name = String(ctx.body?.name || '').trim();
    const themeId = Number(ctx.body?.themeId || ctx.body?.themeID);
    const typeId = Number(ctx.body?.typeId || ctx.body?.attractionTypeId || ctx.body?.attractionType);
    const heightRestriction = Number(ctx.body?.heightRestriction ?? ctx.body?.HeightRestriction);
    const ridersPerVehicle = Number(ctx.body?.ridersPerVehicle ?? ctx.body?.RidersPerVehicle);

    if (!name || !themeId || !typeId) {
      ctx.error(400, 'Name, theme, and attraction type are required.');
      return;
    }
    if (!Number.isFinite(heightRestriction) || heightRestriction < 0) {
      ctx.error(400, 'Height restriction must be a non-negative number.');
      return;
    }
    if (!Number.isFinite(ridersPerVehicle) || ridersPerVehicle <= 0) {
      ctx.error(400, 'Riders per vehicle must be greater than zero.');
      return;
    }

    const themeExists = await query(
      'SELECT themeID FROM theme WHERE themeID = ? LIMIT 1',
      [themeId],
    );
    if (!themeExists.length) {
      ctx.error(400, 'Selected theme does not exist.');
      return;
    }
    const typeExists = await query(
      'SELECT AttractionTypeID FROM attraction_type WHERE AttractionTypeID = ? LIMIT 1',
      [typeId],
    );
    if (!typeExists.length) {
      ctx.error(400, 'Selected attraction type does not exist.');
      return;
    }

    const result = await query(
      'INSERT INTO attraction (Name, AttractionTypeID, ThemeID, HeightRestriction, RidersPerVehicle) VALUES (?, ?, ?, ?, ?)',
      [name, typeId, themeId, heightRestriction, ridersPerVehicle],
    );

    ctx.created({
      data: {
        attractionID: result.insertId,
        name,
        themeId,
        typeId,
        heightRestriction,
        ridersPerVehicle,
        slug: toSlug(name),
      },
    });
  }));
}
