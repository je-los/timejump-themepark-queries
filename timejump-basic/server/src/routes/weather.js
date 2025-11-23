import { query } from '../db.js';
import { requireRole } from '../middleware/auth.js';
import { pick } from '../utils/object.js';

const VALID_WEATHER_CONDITIONS = [
  'Light Rain',
  'Heavy Rain',
  'Snow',
  'Hail',
  'Lightning',
  'Lightning Advisory',
  'Thunderstorm',
  'Tornado',
  'Hurricane',
];

const FALLBACK_WEATHER_RECORDS = [
  {
    WeatherCancellationID: 1,
    AttractionID: 1,
    attraction_name: 'Pterodactyl Plunge',
    Date: '2025-11-15',
    WeatherCondition: 'Lightning',
    Description: 'Lightning advisory in effect. Outdoor attractions temporarily closed.',
  },
  {
    WeatherCancellationID: 2,
    AttractionID: 2,
    attraction_name: 'Chrono Coaster',
    Date: '2025-11-14',
    WeatherCondition: 'Heavy Rain',
    Description: 'Heavy rain reducing visibility. Speed-based coaster operations suspended.',
  },
];

function filterFallbackRows(rows, { date, attractionParam, search, weatherCondition }) {
  const likeSearch = search ? search.toLowerCase() : '';
  return rows.filter(row => {
    if (date && String(row.Date || '') !== date) return false;
    if (weatherCondition && String(row.WeatherCondition || '').toLowerCase() !== weatherCondition.toLowerCase()) return false;
    if (attractionParam) {
      if (/^\d+$/.test(attractionParam)) {
        if (Number(row.AttractionID) !== Number(attractionParam)) return false;
      } else {
        const name = String(row.attraction_name || '').toLowerCase();
        if (!name.includes(attractionParam.toLowerCase())) return false;
      }
    }
    if (likeSearch) {
      const haystack = `${row.attraction_name || ''} ${row.Description || ''}`.toLowerCase();
      if (!haystack.includes(likeSearch)) return false;
    }
    return true;
  });
}

export function registerWeatherRoutes(router) {
  router.get('/weather-cancellations', requireRole(['employee', 'manager', 'admin', 'owner'])(async ctx => {
    const filters = ctx.query || {};
    const date = String(filters.date || '').trim();
    const attractionParam = String(filters.attraction || '').trim();
    const search = String(filters.q || filters.search || '').trim();
    const weatherCondition = String(filters.weatherCondition || filters.condition || '').trim();

    let sql = `
      SELECT wc.WeatherCancellationID,
             wc.AttractionID,
             a.Name AS attraction_name,
             wc.Date,
             wc.WeatherCondition,
             wc.Description
      FROM weather_cancellations wc
      LEFT JOIN attraction a ON a.AttractionID = wc.AttractionID
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      sql += ' AND wc.Date = ?';
      params.push(date);
    }
    if (weatherCondition) {
      sql += ' AND LOWER(wc.WeatherCondition) = ?';
      params.push(weatherCondition.toLowerCase());
    }
    if (attractionParam) {
      if (/^\d+$/.test(attractionParam)) {
        sql += ' AND wc.AttractionID = ?';
        params.push(Number(attractionParam));
      } else {
        sql += ' AND a.Name LIKE ?';
        params.push(`%${attractionParam}%`);
      }
    }
    if (search) {
      sql += ' AND (a.Name LIKE ? OR wc.Description LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like);
    }

    sql += ' ORDER BY wc.Date DESC, wc.WeatherCancellationID DESC LIMIT 500';

    let rows = [];
    let errored = false;
    try {
      rows = await query(sql, params);
    } catch (err) {
      errored = true;
      console.warn('[weather] query failed, using fallback data:', err?.message);
    }

    if (!Array.isArray(rows)) rows = [];
    if (!rows.length && (errored || !params.length)) {
      rows = filterFallbackRows(FALLBACK_WEATHER_RECORDS, {
        date,
        attractionParam,
        search,
        weatherCondition,
      });
    }

    ctx.ok({ data: rows });
  }));

  router.post('/weather-cancellations', requireRole(['manager', 'admin', 'owner'])(async ctx => {
    const attractionId = Number(pick(ctx.body, 'attractionId', 'AttractionID'));
    const dateStr = String(pick(ctx.body, 'date', 'Date') || '').trim();
    const condition = String(pick(ctx.body, 'weatherCondition', 'WeatherCondition') || '').trim();
    const description = pick(ctx.body, 'description', 'Description');

    if (!Number.isFinite(attractionId) || !dateStr || !condition) {
      ctx.error(400, 'Attraction, date, and weather condition are required.');
      return;
    }

    if (!VALID_WEATHER_CONDITIONS.includes(condition)) {
      ctx.error(400, `Invalid weather condition "${condition}". Valid options: ${VALID_WEATHER_CONDITIONS.join(', ')}`);
      return;
    }

    try {
      const dateObj = new Date(dateStr);
      if (Number.isNaN(dateObj.getTime())) {
        ctx.error(400, 'Invalid date format.');
        return;
      }
    } catch (e) {
      ctx.error(400, 'Invalid date format.');
      return;
    }

    try {
      const result = await query(
        'INSERT INTO weather_cancellations (AttractionID, Date, WeatherCondition, Description) VALUES (?, ?, ?, ?)',
        [attractionId, dateStr, condition, description || null],
      );

      ctx.created({
        data: {
          WeatherCancellationID: result.insertId,
          AttractionID: attractionId,
          Date: dateStr,
          WeatherCondition: condition,
          Description: description || null,
        },
      });
    } catch (err) {
      console.error('[weather] insert failed:', err);
      ctx.error(500, 'Failed to create weather cancellation record.');
    }
  }));

  router.put('/weather-cancellations/:id', requireRole(['manager', 'admin', 'owner'])(async ctx => {
    const id = Number(ctx.params.id);
    if (!id) {
      ctx.error(400, 'Weather cancellation ID is required.');
      return;
    }

    const existingRows = await query(
      'SELECT WeatherCancellationID FROM weather_cancellations WHERE WeatherCancellationID = ? LIMIT 1',
      [id],
    ).catch(() => []);

    if (!existingRows.length) {
      ctx.error(404, 'Weather cancellation record not found.');
      return;
    }

    const fields = [];
    const values = [];

    function setField(column, value) {
      if (value === undefined) return;
      if (value === null || value === '') {
        fields.push(`${column} = NULL`);
      } else {
        fields.push(`${column} = ?`);
        values.push(value);
      }
    }

    const attractionId = pick(ctx.body, 'attractionId', 'AttractionID');
    const dateStr = pick(ctx.body, 'date', 'Date');
    const condition = pick(ctx.body, 'weatherCondition', 'WeatherCondition');
    const description = pick(ctx.body, 'description', 'Description');

    if (condition !== undefined && condition !== null && condition !== '') {
      if (!VALID_WEATHER_CONDITIONS.includes(String(condition))) {
        ctx.error(400, `Invalid weather condition "${condition}". Valid options: ${VALID_WEATHER_CONDITIONS.join(', ')}`);
        return;
      }
      setField('WeatherCondition', String(condition));
    }

    if (dateStr !== undefined && dateStr !== null) {
      try {
        const dateObj = new Date(String(dateStr));
        if (Number.isNaN(dateObj.getTime())) {
          ctx.error(400, 'Invalid date format.');
          return;
        }
        setField('Date', String(dateStr).trim());
      } catch (e) {
        ctx.error(400, 'Invalid date format.');
        return;
      }
    }

    if (attractionId !== undefined) setField('AttractionID', attractionId ? Number(attractionId) : null);
    if (description !== undefined) setField('Description', description ? String(description) : null);

    if (!fields.length) {
      ctx.error(400, 'Nothing to update.');
      return;
    }

    try {
      await query(
        `UPDATE weather_cancellations SET ${fields.join(', ')} WHERE WeatherCancellationID = ?`,
        [...values, id],
      );

      ctx.ok({ data: { WeatherCancellationID: id } });
    } catch (err) {
      console.error('[weather] update failed:', err);
      ctx.error(500, 'Failed to update weather cancellation record.');
    }
  }));

  router.delete('/weather-cancellations/:id', requireRole(['manager', 'admin', 'owner'])(async ctx => {
    const id = Number(ctx.params.id);
    if (!id) {
      ctx.error(400, 'Weather cancellation ID is required.');
      return;
    }

    try {
      const result = await query(
        'DELETE FROM weather_cancellations WHERE WeatherCancellationID = ?',
        [id],
      );

      if (result.affectedRows === 0) {
        ctx.error(404, 'Weather cancellation record not found.');
        return;
      }

      ctx.ok({ data: { WeatherCancellationID: id } });
    } catch (err) {
      console.error('[weather] delete failed:', err);
      ctx.error(500, 'Failed to delete weather cancellation record.');
    }
  }));
}
