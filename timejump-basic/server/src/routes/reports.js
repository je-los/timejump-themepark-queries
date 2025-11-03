import { query } from '../db.js';
import { requireRole } from '../middleware/auth.js';
import { CANCELLATION_REASON_FALLBACK } from '../services/constants.js';
import { getISOWeek } from '../utils/calendar.js';
import { toSlug, toTitle } from '../utils/strings.js';

export function registerReportRoutes(router) {
  router.get('/cancellation-reasons', requireRole(['employee', 'manager', 'admin', 'owner'])(async ctx => {
    const rows = await query(
      'SELECT DISTINCT reason FROM ride_cancellation WHERE reason IS NOT NULL AND reason <> "" ORDER BY reason ASC',
    ).catch(() => []);
    if (!rows.length) {
      ctx.ok({
        data: CANCELLATION_REASON_FALLBACK.map((item, idx) => ({
          reason_id: idx + 1,
          code: item.code,
          label: item.label,
          reason: item.reason,
        })),
      });
      return;
    }
    ctx.ok({
      data: rows.map((row, idx) => {
        const reason = row.reason || 'Unknown';
        const code = toSlug(reason) || `reason-${idx + 1}`;
        return {
          reason_id: idx + 1,
          code,
          label: toTitle(reason),
          reason,
        };
      }),
    });
  }));

  router.get('/reports/cancellations', requireRole(['employee', 'manager', 'admin', 'owner'])(async ctx => {
    const start = String(ctx.query.start || '').trim();
    const end = String(ctx.query.end || '').trim();
    const reasonsParam = String(ctx.query.reasons || '').trim();
    const codes = reasonsParam ? reasonsParam.split(',').map(code => code.trim()).filter(Boolean) : [];

    const reasonRows = await query(
      'SELECT DISTINCT reason FROM ride_cancellation WHERE reason IS NOT NULL AND reason <> ""',
    ).catch(() => []);
    const reasonMap = new Map();
    for (const row of reasonRows) {
      const reason = row.reason || '';
      if (!reason) continue;
      reasonMap.set(toSlug(reason), reason);
    }
    for (const item of CANCELLATION_REASON_FALLBACK) {
      if (!reasonMap.has(item.code)) reasonMap.set(item.code, item.reason);
    }

    const reasonFilterValues = codes.length
      ? codes.map(code => reasonMap.get(code) || code)
      : [];

    let sql = `
      SELECT rc.cancel_id, rc.AttractionID, rc.cancel_date, rc.reason, a.Name AS attraction
      FROM ride_cancellation rc
      LEFT JOIN attraction a ON a.AttractionID = rc.AttractionID
      WHERE 1=1
    `;
    const params = [];
    if (start) {
      sql += ' AND rc.cancel_date >= ?';
      params.push(start);
    }
    if (end) {
      sql += ' AND rc.cancel_date <= ?';
      params.push(end);
    }
    if (reasonFilterValues.length) {
      sql += ` AND rc.reason IN (${reasonFilterValues.map(() => '?').join(',')})`;
      params.push(...reasonFilterValues);
    }
    sql += ' ORDER BY rc.cancel_date DESC, rc.cancel_id DESC LIMIT 500';

    const rows = await query(sql, params).catch(() => []);
    ctx.ok({
      data: rows.map(row => {
        const reason = row.reason || 'Unspecified';
        const code = toSlug(reason);
        return {
          cancel_id: row.cancel_id,
          attraction_id: row.AttractionID,
          attraction: row.attraction || `#${row.AttractionID}`,
          cancel_date: row.cancel_date,
          reason,
          reason_code: code,
          reason_label: toTitle(reason),
          notes: '',
        };
      }),
    });
  }));

  router.get('/reports/riders-per-day', requireRole(['employee', 'manager', 'admin', 'owner'])(async ctx => {
    const date = String(ctx.query.date || '').trim();
    if (!date) {
      ctx.error(400, 'Date is required.');
      return;
    }
    const rows = await query(
      `SELECT rl.AttractionID, rl.log_date, rl.riders_count, a.Name
       FROM ride_log rl
       LEFT JOIN attraction a ON a.AttractionID = rl.AttractionID
       WHERE rl.log_date = ?
       ORDER BY rl.riders_count DESC
       LIMIT 500`,
      [date],
    ).catch(() => []);
    ctx.ok({
      data: rows.map(row => ({
        AttractionID: row.AttractionID,
        Name: row.Name || `Attraction ${row.AttractionID}`,
        log_date: row.log_date,
        riders_count: Number(row.riders_count || 0),
      })),
    });
  }));

  router.get('/reports/analytics', requireRole(['employee', 'manager', 'admin', 'owner'])(async ctx => {
    const metricsParam = String(ctx.query.metrics || '').trim();
    if (!metricsParam) {
      ctx.ok({ data: [] });
      return;
    }
    const metrics = metricsParam.split(',').map(m => m.trim()).filter(Boolean);
    if (!metrics.length) {
      ctx.ok({ data: [] });
      return;
    }

    const groupByParam = String(ctx.query.groupBy || '').trim();
    const groupKeys = groupByParam ? groupByParam.split(',').map(g => g.trim()).filter(Boolean) : [];
    const useMonthly = groupKeys.includes('monthly');
    const useWeekly = groupKeys.includes('weekly');
    const useRide = groupKeys.includes('ride');

    const rideFilterRaw = String(ctx.query.ride || '').trim();
    const start = String(ctx.query.start || '').trim();
    const end = String(ctx.query.end || '').trim();

    const rideRows = await query('SELECT AttractionID, Name FROM attraction').catch(() => []);
    const rideNames = new Map([['all', 'All Rides']]);
    rideRows.forEach(row => {
      const idKey = String(row.AttractionID);
      rideNames.set(idKey, row.Name);
      rideNames.set(toSlug(row.Name), row.Name);
    });

    let rideFilterSet = null;
    if (rideFilterRaw) {
      const slug = toSlug(rideFilterRaw);
      rideFilterSet = new Set();
      rideRows.forEach(row => {
        if (toSlug(row.Name) === slug || String(row.AttractionID) === rideFilterRaw) {
          rideFilterSet.add(String(row.AttractionID));
        }
      });
      if (!rideFilterSet.size && rideNames.has(slug)) {
        rideFilterSet.add(slug);
      }
    }

    const results = new Map();
    function ensureEntry(dateStr, rideKeyValue) {
      const rideKey = useRide ? String(rideKeyValue ?? 'all') : 'all';
      if (useRide && rideFilterSet && rideFilterSet.size && rideKey !== 'all' && !rideFilterSet.has(rideKey)) {
        return null;
      }
      const dateObj = new Date(dateStr);
      if (Number.isNaN(dateObj.getTime())) return null;
      const year = dateObj.getUTCFullYear();
      const month = dateObj.getUTCMonth() + 1;
      const isoWeek = getISOWeek(dateObj);
      const dayKey = dateObj.toISOString().slice(0, 10);
      const keyParts = [`y:${year}`];
      if (useMonthly) keyParts.push(`m:${month}`);
      if (useWeekly) keyParts.push(`w:${isoWeek}`);
      if (!useMonthly && !useWeekly) keyParts.push(`d:${dayKey}`);
      if (useRide) keyParts.push(`r:${rideKey}`);
      const key = keyParts.join('|');
      if (!results.has(key)) {
        const entry = { year };
        if (!useMonthly && !useWeekly) entry.date = dayKey;
        if (useMonthly) entry.month = month;
        if (useWeekly) entry.week = isoWeek;
        if (useRide) {
          entry.ride_key = rideKey === 'all' ? null : rideKey;
          const name =
            rideNames.get(rideKey) ||
            rideNames.get(toSlug(rideKey)) ||
            rideNames.get(String(rideKey)) ||
            rideNames.get('all');
          entry.ride_name = name;
        }
        results.set(key, entry);
      }
      return results.get(key);
    }

    if (metrics.includes('customers')) {
      let sql = 'SELECT PurchaseDate AS date, COUNT(*) AS total FROM ticket WHERE 1=1';
      const params = [];
      if (start) {
        sql += ' AND PurchaseDate >= ?';
        params.push(start);
      }
      if (end) {
        sql += ' AND PurchaseDate <= ?';
        params.push(end);
      }
      sql += ' GROUP BY PurchaseDate';
      const rows = await query(sql, params).catch(() => []);
      rows.forEach(row => {
        const entry = ensureEntry(row.date, 'all');
        if (!entry) return;
        entry.customers = (entry.customers || 0) + Number(row.total || 0);
      });
    }

    if (metrics.includes('demand')) {
      let sql = 'SELECT PurchaseDate AS date, SUM(Price) AS revenue FROM ticket WHERE 1=1';
      const params = [];
      if (start) {
        sql += ' AND PurchaseDate >= ?';
        params.push(start);
      }
      if (end) {
        sql += ' AND PurchaseDate <= ?';
        params.push(end);
      }
      sql += ' GROUP BY PurchaseDate';
      const rows = await query(sql, params).catch(() => []);
      rows.forEach(row => {
        const entry = ensureEntry(row.date, 'all');
        if (!entry) return;
        entry.demand = (entry.demand || 0) + Number(row.revenue || 0);
      });
    }

    if (metrics.includes('rides')) {
      let sql = 'SELECT rl.log_date AS date, rl.AttractionID, SUM(rl.riders_count) AS total FROM ride_log rl WHERE 1=1';
      const params = [];
      if (start) {
        sql += ' AND rl.log_date >= ?';
        params.push(start);
      }
      if (end) {
        sql += ' AND rl.log_date <= ?';
        params.push(end);
      }
      if (rideFilterSet && rideFilterSet.size) {
        const placeholders = [...rideFilterSet].map(() => '?').join(',');
        sql += ` AND rl.AttractionID IN (${placeholders})`;
        params.push(...rideFilterSet);
      }
      sql += ' GROUP BY rl.log_date, rl.AttractionID';
      const rows = await query(sql, params).catch(() => []);
      rows.forEach(row => {
        const rideKey = useRide ? String(row.AttractionID) : 'all';
        const entry = ensureEntry(row.date, rideKey);
        if (!entry) return;
        entry.rides = (entry.rides || 0) + Number(row.total || 0);
      });
    }

    if (metrics.includes('maintenance')) {
      let sql = 'SELECT Date_broken_down AS date, AttractionID, COUNT(*) AS total FROM maintenance_records WHERE 1=1';
      const params = [];
      if (start) {
        sql += ' AND Date_broken_down >= ?';
        params.push(start);
      }
      if (end) {
        sql += ' AND Date_broken_down <= ?';
        params.push(end);
      }
      if (rideFilterSet && rideFilterSet.size) {
        const placeholders = [...rideFilterSet].map(() => '?').join(',');
        sql += ` AND AttractionID IN (${placeholders})`;
        params.push(...rideFilterSet);
      }
      sql += ' GROUP BY Date_broken_down, AttractionID';
      const rows = await query(sql, params).catch(() => []);
      rows.forEach(row => {
        const rideKey = useRide ? String(row.AttractionID || 'all') : 'all';
        const entry = ensureEntry(row.date, rideKey);
        if (!entry) return;
        entry.maintenance = (entry.maintenance || 0) + Number(row.total || 0);
      });
    }

    if (metrics.includes('rainouts')) {
      let sql = `SELECT cancel_date AS date, AttractionID, COUNT(*) AS total
                 FROM ride_cancellation WHERE reason LIKE 'rain%'`;
      const params = [];
      if (start) {
        sql += ' AND cancel_date >= ?';
        params.push(start);
      }
      if (end) {
        sql += ' AND cancel_date <= ?';
        params.push(end);
      }
      if (rideFilterSet && rideFilterSet.size) {
        const placeholders = [...rideFilterSet].map(() => '?').join(',');
        sql += ` AND AttractionID IN (${placeholders})`;
        params.push(...rideFilterSet);
      }
      sql += ' GROUP BY cancel_date, AttractionID';
      const rows = await query(sql, params).catch(() => []);
      rows.forEach(row => {
        const rideKey = useRide ? String(row.AttractionID || 'all') : 'all';
        const entry = ensureEntry(row.date, rideKey);
        if (!entry) return;
        entry.rainouts = (entry.rainouts || 0) + Number(row.total || 0);
      });
    }

    const data = Array.from(results.values()).sort((a, b) => {
      const aDate = a.date || `${a.year}-${String(a.month || 0).padStart(2, '0')}-${String(a.week || 0).padStart(2, '0')}`;
      const bDate = b.date || `${b.year}-${String(b.month || 0).padStart(2, '0')}-${String(b.week || 0).padStart(2, '0')}`;
      return aDate.localeCompare(bDate);
    });

    ctx.ok({ data });
  }));
}
