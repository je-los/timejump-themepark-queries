import { query } from '../db.js';
import { requireRole } from '../middleware/auth.js';
import { toSlug } from '../utils/strings.js';
import {
  ensureAttractionExperienceColumns,
  ensureAttractionImageColumn,
  ensureAttractionTypeDescriptionColumn,
  ensureThemeImageColumn,
} from '../services/ensure.js';

function cleanImageUrl(value) {
  const trimmed = String(value || '').trim();
  return trimmed || null;
}

function cleanOptionalText(value) {
  if (value === undefined) return undefined;
  const trimmed = String(value || '').trim();
  return trimmed || null;
}

export function registerThemeRoutes(router) {
  router.get('/themes', async ctx => {
    await ensureThemeImageColumn();
    const rows = await query(`
      SELECT t.themeID,
             t.themeName,
             t.Description,
             t.image_url,
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
        image_url: row.image_url || null,
        slug: toSlug(row.themeName),
        attraction_count: Number(row.attraction_count ?? 0),
      })),
    });
  });

  router.post('/themes', requireRole(['admin', 'owner'])(async ctx => {
    await ensureThemeImageColumn();
    const name = String(ctx.body?.name || ctx.body?.themeName || '').trim();
    const description = String(ctx.body?.description || ctx.body?.Description || '').trim();
    const imageUrl = cleanImageUrl(ctx.body?.imageUrl ?? ctx.body?.image_url);
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
      'INSERT INTO theme (themeName, Description, image_url) VALUES (?, ?, ?)',
      [name, description, imageUrl],
    );
    ctx.created({
      data: {
        themeID: result.insertId,
        name,
        description,
        image_url: imageUrl,
        slug: toSlug(name),
        attraction_count: 0,
      },
    });
  }));

  router.put('/themes/:id', requireRole(['admin', 'owner'])(async ctx => {
    await ensureThemeImageColumn();
    const themeId = Number(ctx.params?.id);
    if (!themeId) {
      ctx.error(400, 'Valid theme ID is required.');
      return;
    }
    const name = ctx.body?.name ? String(ctx.body.name).trim() : null;
    const description = ctx.body?.description ? String(ctx.body.description).trim() : null;
    const imageUrlRaw = ctx.body?.imageUrl ?? ctx.body?.image_url;
    const imageUrl = imageUrlRaw !== undefined ? cleanImageUrl(imageUrlRaw) : undefined;

    if (!name && !description && imageUrl === undefined) {
      ctx.error(400, 'Nothing to update.');
      return;
    }
    if (name) {
      const exists = await query(
        'SELECT themeID FROM theme WHERE themeName = ? AND themeID <> ? LIMIT 1',
        [name, themeId],
      );
      if (exists.length) {
        ctx.error(409, 'Another theme already uses that name.');
        return;
      }
    }

    const fields = [];
    const values = [];
    if (name) {
      fields.push('themeName = ?');
      values.push(name);
    }
    if (description) {
      fields.push('Description = ?');
      values.push(description);
    }
    if (imageUrl !== undefined) {
      fields.push('image_url = ?');
      values.push(imageUrl);
    }
    values.push(themeId);

    const result = await query(
      `UPDATE theme SET ${fields.join(', ')} WHERE themeID = ?`,
      values,
    );
    if (!result.affectedRows) {
      ctx.error(404, 'Theme not found.');
      return;
    }
    ctx.ok({
      data: {
        themeID: themeId,
        name,
        description,
        image_url: imageUrl,
        slug: name ? toSlug(name) : undefined,
      },
    });
  }));

  router.delete('/themes/:id', requireRole(['admin', 'owner'])(async ctx => {
    const themeId = Number(ctx.params?.id);
    if (!themeId) {
      ctx.error(400, 'Valid theme ID is required.');
      return;
    }
    const attachment = await query(
      'SELECT AttractionID FROM attraction WHERE ThemeID = ? LIMIT 1',
      [themeId],
    );
    if (attachment.length) {
      ctx.error(400, 'Remove or reassign attractions before deleting this theme.');
      return;
    }
    const result = await query(
      'DELETE FROM theme WHERE themeID = ?',
      [themeId],
    );
    if (!result.affectedRows) {
      ctx.error(404, 'Theme not found.');
      return;
    }
    ctx.noContent();
  }));

  router.get('/attraction-types', async ctx => {
    await ensureAttractionTypeDescriptionColumn();
    const rows = await query(
      'SELECT AttractionTypeID, TypeName, Description FROM attraction_type ORDER BY TypeName ASC',
    ).catch(() => []);
    ctx.ok({
      data: rows.map(row => ({
        id: row.AttractionTypeID,
        name: row.TypeName,
        description: row.Description ?? row.description ?? '',
      })),
    });
  });

  router.post('/attraction-types', requireRole(['admin', 'owner'])(async ctx => {
    await ensureAttractionTypeDescriptionColumn();
    const name = String(ctx.body?.name || ctx.body?.typeName || '').trim();
    const description = ctx.body?.description !== undefined
      ? String(ctx.body.description).trim()
      : null;
    if (!name) {
      ctx.error(400, 'Attraction type name is required.');
      return;
    }

    const exists = await query(
      'SELECT AttractionTypeID FROM attraction_type WHERE TypeName = ? LIMIT 1',
      [name],
    );
    if (exists.length) {
      ctx.error(409, 'That attraction type already exists.');
      return;
    }

    const result = await query(
      'INSERT INTO attraction_type (TypeName, Description) VALUES (?, ?)',
      [name, description || null],
    );

    ctx.created({
      data: {
        id: result.insertId,
        name,
        description: description || null,
      },
    });
  }));

  router.put('/attraction-types/:id', requireRole(['admin', 'owner'])(async ctx => {
    await ensureAttractionTypeDescriptionColumn();
    const typeId = Number(ctx.params?.id);
    if (!Number.isInteger(typeId) || typeId <= 0) {
      ctx.error(400, 'Valid attraction type id is required.');
      return;
    }
    const name = String(ctx.body?.name || ctx.body?.typeName || '').trim();
    const description = ctx.body?.description !== undefined
      ? String(ctx.body.description).trim()
      : null;
    if (!name) {
      ctx.error(400, 'Attraction type name is required.');
      return;
    }

    const exists = await query(
      'SELECT AttractionTypeID FROM attraction_type WHERE TypeName = ? AND AttractionTypeID <> ? LIMIT 1',
      [name, typeId],
    );
    if (exists.length) {
      ctx.error(409, 'That attraction type already exists.');
      return;
    }

    const result = await query(
      'UPDATE attraction_type SET TypeName = ?, Description = ? WHERE AttractionTypeID = ?',
      [name, description || null, typeId],
    );
    if (!result.affectedRows) {
      ctx.error(404, 'Attraction type not found.');
      return;
    }

    ctx.ok({
      data: {
        id: typeId,
        name,
        description: description || null,
      },
    });
  }));

  router.delete('/attraction-types/:id', requireRole(['admin', 'owner'])(async ctx => {
    const typeId = Number(ctx.params?.id);
    if (!Number.isInteger(typeId) || typeId <= 0) {
      ctx.error(400, 'Valid attraction type id is required.');
      return;
    }
    const attachment = await query(
      'SELECT AttractionID FROM attraction WHERE AttractionTypeID = ? LIMIT 1',
      [typeId],
    );
    if (attachment.length) {
      ctx.error(400, 'Remove or reassign attractions before deleting this type.');
      return;
    }

    const result = await query(
      'DELETE FROM attraction_type WHERE AttractionTypeID = ?',
      [typeId],
    );
    if (!result.affectedRows) {
      ctx.error(404, 'Attraction type not found.');
      return;
    }
    ctx.noContent();
  }));

  router.post('/attractions', requireRole(['admin', 'owner'])(async ctx => {
    await ensureAttractionImageColumn();
    await ensureAttractionExperienceColumns();
    const name = String(ctx.body?.name || '').trim();
    const themeId = Number(ctx.body?.themeId || ctx.body?.themeID);
    const typeId = Number(ctx.body?.typeId || ctx.body?.attractionTypeId || ctx.body?.attractionType);
    const capacity = Number(ctx.body?.capacity ?? ctx.body?.Capacity ?? ctx.body?.ridersPerVehicle);
    const imageUrl = cleanImageUrl(ctx.body?.imageUrl ?? ctx.body?.image_url);
    const experienceLevel = cleanOptionalText(ctx.body?.experienceLevel ?? ctx.body?.experience_level);
    const targetAudience = cleanOptionalText(ctx.body?.targetAudience ?? ctx.body?.target_audience);

    if (!name || !themeId || !typeId) {
      ctx.error(400, 'Name, theme, and attraction type are required.');
      return;
    }
    if (!Number.isFinite(capacity) || capacity <= 0) {
      ctx.error(400, 'Capacity must be greater than zero.');
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
      `INSERT INTO attraction (Name, AttractionTypeID, ThemeID, Capacity, image_url, experience_level, target_audience)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, typeId, themeId, capacity, imageUrl, experienceLevel ?? null, targetAudience ?? null],
    );

    ctx.created({
      data: {
        attractionID: result.insertId,
        name,
        themeId,
        typeId,
        capacity,
        image_url: imageUrl,
        experience_level: experienceLevel ?? null,
        target_audience: targetAudience ?? null,
        slug: toSlug(name),
      },
    });
  }));

  router.put('/attractions/:id', requireRole(['admin', 'owner'])(async ctx => {
    await ensureAttractionImageColumn();
    await ensureAttractionExperienceColumns();
    const attractionId = Number(ctx.params?.id);
    if (!attractionId) {
      ctx.error(400, 'Valid attraction ID is required.');
      return;
    }
    const name = ctx.body?.name ? String(ctx.body.name).trim() : null;
    const themeId = ctx.body?.themeId || ctx.body?.ThemeID ? Number(ctx.body.themeId ?? ctx.body.ThemeID) : null;
    const typeId = ctx.body?.typeId || ctx.body?.attractionTypeId || ctx.body?.attractionType
      ? Number(ctx.body.typeId ?? ctx.body.attractionTypeId ?? ctx.body.attractionType)
      : null;
    const capacityInput = ctx.body?.capacity ?? ctx.body?.Capacity ?? ctx.body?.ridersPerVehicle;
    const imageUrlRaw = ctx.body?.imageUrl ?? ctx.body?.image_url;
    const imageUrl = imageUrlRaw !== undefined ? cleanImageUrl(imageUrlRaw) : undefined;
    const experienceLevel = cleanOptionalText(ctx.body?.experienceLevel ?? ctx.body?.experience_level);
    const targetAudience = cleanOptionalText(ctx.body?.targetAudience ?? ctx.body?.target_audience);

    const fields = [];
    const values = [];

    if (name) {
      fields.push('Name = ?');
      values.push(name);
    }
    if (themeId) {
      const themeExists = await query(
        'SELECT themeID FROM theme WHERE themeID = ? LIMIT 1',
        [themeId],
      );
      if (!themeExists.length) {
        ctx.error(400, 'Selected theme does not exist.');
        return;
      }
      fields.push('ThemeID = ?');
      values.push(themeId);
    }
    if (typeId) {
      const typeExists = await query(
        'SELECT AttractionTypeID FROM attraction_type WHERE AttractionTypeID = ? LIMIT 1',
        [typeId],
      );
      if (!typeExists.length) {
        ctx.error(400, 'Selected attraction type does not exist.');
        return;
      }
      fields.push('AttractionTypeID = ?');
      values.push(typeId);
    }
    if (capacityInput !== undefined) {
      const capacityValue = Number(capacityInput);
      if (!Number.isFinite(capacityValue) || capacityValue <= 0) {
        ctx.error(400, 'Capacity must be greater than zero.');
        return;
      }
      fields.push('Capacity = ?');
      values.push(capacityValue);
    }
    if (imageUrl !== undefined) {
      fields.push('image_url = ?');
      values.push(imageUrl);
    }
    if (experienceLevel !== undefined) {
      fields.push('experience_level = ?');
      values.push(experienceLevel);
    }
    if (targetAudience !== undefined) {
      fields.push('target_audience = ?');
      values.push(targetAudience);
    }

    if (!fields.length) {
      ctx.error(400, 'Nothing to update.');
      return;
    }
    values.push(attractionId);

    const result = await query(
      `UPDATE attraction SET ${fields.join(', ')} WHERE AttractionID = ?`,
      values,
    );
    if (!result.affectedRows) {
      ctx.error(404, 'Attraction not found.');
      return;
    }
    ctx.ok({
      data: {
        attractionID: attractionId,
        name,
        themeId,
        typeId,
        image_url: imageUrl,
        capacity: capacityInput,
        experience_level: experienceLevel,
        target_audience: targetAudience,
      },
    });
  }));

  router.delete('/attractions/:id', requireRole(['admin', 'owner'])(async ctx => {
    const attractionId = Number(ctx.params?.id);
    if (!attractionId) {
      ctx.error(400, 'Valid attraction ID is required.');
      return;
    }
    const result = await query(
      'DELETE FROM attraction WHERE AttractionID = ?',
      [attractionId],
    );
    if (!result.affectedRows) {
      ctx.error(404, 'Attraction not found.');
      return;
    }
    ctx.noContent();
  }));
}
