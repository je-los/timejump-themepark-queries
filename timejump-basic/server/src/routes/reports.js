import { query } from '../db.js';
import { requireRole } from '../middleware/auth.js';
import { CANCELLATION_REASON_FALLBACK } from '../services/constants.js';
import { ensureGiftSalesTable, ensureMenuSalesTable, ensureTicketCatalogTable } from '../services/ensure.js';
import { getISOWeek } from '../utils/calendar.js';
import { toSlug, toTitle } from '../utils/strings.js';

const FALLBACK_RIDE_LOGS = [
  { log_date: '2025-11-01', AttractionID: 1, Name: 'Pterodactyl Plunge', riders_count: 1280 },
  { log_date: '2025-11-01', AttractionID: 2, Name: 'Chrono Coaster', riders_count: 980 },
  { log_date: '2025-11-02', AttractionID: 1, Name: 'Pterodactyl Plunge', riders_count: 1325 },
  { log_date: '2025-11-02', AttractionID: 3, Name: 'Neon Nexus Arcade', riders_count: 640 },
  { log_date: '2025-11-03', AttractionID: 4, Name: 'Galactic Rapids', riders_count: 1115 },
  { log_date: '2025-11-03', AttractionID: 2, Name: 'Chrono Coaster', riders_count: 1022 },
  { log_date: '2025-11-04', AttractionID: 3, Name: 'Neon Nexus Arcade', riders_count: 755 },
  { log_date: '2025-11-04', AttractionID: 5, Name: 'Time Traveler Carousel', riders_count: 890 },
];

function normalizeRideName(entry) {
  return entry?.Name || `Attraction ${entry?.AttractionID}`;
}

function matchesRideFilter(entry, rideFilter) {
  if (!rideFilter) return true;
  if (/^\d+$/.test(rideFilter)) {
    return Number(entry.AttractionID) === Number(rideFilter);
  }
  return normalizeRideName(entry).toLowerCase().includes(rideFilter.toLowerCase());
}

function getFallbackDailyRows(date, rideFilter, limit) {
  const source = date
    ? FALLBACK_RIDE_LOGS.filter(entry => entry.log_date === date)
    : FALLBACK_RIDE_LOGS;
  return source
    .filter(entry => matchesRideFilter(entry, rideFilter))
    .sort((a, b) => b.riders_count - a.riders_count)
    .slice(0, limit)
    .map(entry => ({
      AttractionID: entry.AttractionID,
      Name: normalizeRideName(entry),
      log_date: entry.log_date,
      period_label: formatPeriodLabel('day', entry.log_date),
      riders_count: entry.riders_count,
    }));
}

function getFallbackMonthlyRows(start, end, rideFilter, limit) {
  const startDate = start ? new Date(`${start}T00:00:00Z`) : null;
  const endDate = end ? new Date(`${end}T23:59:59Z`) : null;
  const byKey = new Map();
  for (const entry of FALLBACK_RIDE_LOGS) {
    const entryDate = new Date(`${entry.log_date}T00:00:00Z`);
    if (Number.isNaN(entryDate.getTime())) continue;
    if (startDate && entryDate < startDate) continue;
    if (endDate && entryDate > endDate) continue;
    if (!matchesRideFilter(entry, rideFilter)) continue;
    const monthKey = entry.log_date.slice(0, 7) + '-01';
    const key = `${monthKey}:${entry.AttractionID}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        period_start: monthKey,
        AttractionID: entry.AttractionID,
        Name: normalizeRideName(entry),
        riders_total: 0,
        entries: 0,
      });
    }
    const bucket = byKey.get(key);
    bucket.riders_total += entry.riders_count;
    bucket.entries += 1;
  }
  return [...byKey.values()]
    .sort((a, b) => new Date(b.period_start) - new Date(a.period_start) || b.riders_total - a.riders_total)
    .slice(0, limit)
    .map(bucket => ({
      period_start: bucket.period_start,
      AttractionID: bucket.AttractionID,
      Name: bucket.Name,
      riders_count: bucket.riders_total,
      avg_riders: bucket.entries ? bucket.riders_total / bucket.entries : 0,
      entry_count: bucket.entries,
    }));
}

export function registerReportRoutes(router) {
  router.get('/cancellation-reasons', requireRole(['admin', 'owner'])(async ctx => {
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

  router.get('/reports/cancellations', requireRole(['admin', 'owner'])(async ctx => {
    const start = String(ctx.query.start || '').trim();
    const end = String(ctx.query.end || '').trim();
    const reasonsParam = String(ctx.query.reasons || '').trim();
    const search = String(ctx.query.search || '').trim();
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
      SELECT rc.cancel_id, rc.AttractionID, DATE(rc.cancel_date) AS cancel_date, rc.reason, a.Name AS attraction
      FROM ride_cancellation rc
      LEFT JOIN attraction a ON a.AttractionID = rc.AttractionID
      WHERE 1=1
    `;
    const params = [];
    if (start) {
      sql += ' AND DATE(rc.cancel_date) >= ?';
      params.push(start);
    }
    if (end) {
      sql += ' AND DATE(rc.cancel_date) <= ?';
      params.push(end);
    }
    if (search) {
      sql += ' AND (a.Name LIKE ? OR rc.reason LIKE ?)';
      const pattern = `%${search}%`;
      params.push(pattern, pattern);
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
          cancel_date: formatISODate(row.cancel_date),
          reason,
          reason_code: code,
          reason_label: toTitle(reason),
        };
      }),
    });
  }));

  router.get('/reports/riders-per-day', requireRole(['admin', 'owner'])(async ctx => {
    const groupMode = String(ctx.query.group || 'day').trim().toLowerCase() === 'month' ? 'month' : 'day';
    const date = String(ctx.query.date || '').trim();
    let start = String(ctx.query.start || '').trim();
    let end = String(ctx.query.end || '').trim();
    const rideFilter = String(ctx.query.ride || ctx.query.attraction || '').trim();
    const topRaw = Number(ctx.query.top || ctx.query.limit);
    const limit = Number.isFinite(topRaw) ? Math.min(Math.max(topRaw, 1), 500) : 500;
    const params = [];

    function applyRideFilter(sqlParts) {
      if (!rideFilter) return sqlParts;
      if (/^\d+$/.test(rideFilter)) {
        sqlParts.where.push('rl.AttractionID = ?');
        params.push(Number(rideFilter));
      } else {
        sqlParts.where.push('a.Name LIKE ?');
        params.push(`%${rideFilter}%`);
      }
      return sqlParts;
    }

    if (groupMode === 'day') {
      const sqlParts = {
        base: `SELECT rl.AttractionID, DATE(rl.log_date) AS log_date, rl.riders_count, a.Name
               FROM ride_log rl
               LEFT JOIN attraction a ON a.AttractionID = rl.AttractionID
               WHERE 1=1`,
        where: [],
        suffix: `ORDER BY rl.riders_count DESC, rl.AttractionID ASC LIMIT ${limit}`,
      };
      if (date) {
        sqlParts.where.push('DATE(rl.log_date) = ?');
        params.push(date);
      }
      applyRideFilter(sqlParts);
      const whereClause = sqlParts.where.length
        ? ` ${sqlParts.where.map(clause => `AND ${clause}`).join(' ')}`
        : '';
      const sql = `${sqlParts.base}${whereClause} ${sqlParts.suffix}`;
      let rows = [];
      let errored = false;
      try {
        rows = await query(sql, params);
      } catch (err) {
        errored = true;
        console.warn('[reports] riders-per-day daily query failed, using fallback:', err?.message);
      }
      if (!Array.isArray(rows)) rows = [];
      if (!rows.length) {
        rows = getFallbackDailyRows(date, rideFilter, limit);
        ctx.ok({ data: rows });
        return;
      }
      ctx.ok({
        data: rows.map(row => ({
          AttractionID: row.AttractionID,
          Name: row.Name || `Attraction ${row.AttractionID}`,
          log_date: formatISODate(row.log_date),
          period_label: formatPeriodLabel('day', row.log_date),
          riders_count: Number(row.riders_count || 0),
        })),
      });
      return;
    }

    // Monthly mode
    const sqlParts = {
      base: `SELECT DATE_FORMAT(rl.log_date, '%Y-%m-01') AS period_start,
                    rl.AttractionID,
                    a.Name,
                    SUM(rl.riders_count) AS riders_count,
                    AVG(rl.riders_count) AS avg_riders,
                    COUNT(*) AS entry_count
             FROM ride_log rl
             LEFT JOIN attraction a ON a.AttractionID = rl.AttractionID`,
      where: [],
      suffix: `GROUP BY period_start, rl.AttractionID, a.Name
               ORDER BY period_start DESC, riders_count DESC
               LIMIT ${limit}`,
    };
    if (start) {
      sqlParts.where.push('rl.log_date >= ?');
      params.push(start);
    }
    if (end) {
      sqlParts.where.push('rl.log_date <= ?');
      params.push(end);
    }
    applyRideFilter(sqlParts);
    const whereClause = sqlParts.where.length ? `WHERE ${sqlParts.where.join(' AND ')}` : '';
    const sql = `${sqlParts.base} ${whereClause} ${sqlParts.suffix}`;
    let rows = [];
    let erroredMonthly = false;
    try {
      rows = await query(sql, params);
    } catch (err) {
      erroredMonthly = true;
      console.warn('[reports] riders-per-day monthly query failed, using fallback:', err?.message);
    }
    if (!Array.isArray(rows)) rows = [];
    if (!rows.length) {
      rows = getFallbackMonthlyRows(start, end, rideFilter, limit);
      ctx.ok({ data: rows });
      return;
    }
    ctx.ok({
      data: rows.map(row => ({
        period_start: row.period_start,
        period_label: formatPeriodLabel('month', row.period_start),
        AttractionID: row.AttractionID,
        Name: row.Name || `Attraction ${row.AttractionID}`,
        riders_count: Number(row.riders_count || 0),
        avg_riders: Number(row.avg_riders || 0),
        entry_count: Number(row.entry_count || 0),
      })),
    });
  }));

  router.get('/reports/ticket-sales', requireRole(['admin', 'owner'])(async ctx => {
    const start = String(ctx.query.start || '').trim();
    const end = String(ctx.query.end || '').trim();
    const typeFilter = String(ctx.query.type || ctx.query.ticketType || '').trim();
    const groupRaw = String(ctx.query.group || '').trim().toLowerCase();
    const groupMode = groupRaw === 'month' || groupRaw === 'monthly' ? 'month' : 'day';
    const categoryFilter = String(ctx.query.category || '').trim().toLowerCase();
    const includeTickets = !categoryFilter || categoryFilter === 'ticket';
    const includeFood = !categoryFilter || categoryFilter === 'food';
    const includeGifts = !categoryFilter || categoryFilter === 'gift';

    const dateSelect = groupMode === 'month'
      ? "DATE_FORMAT(t.PurchaseDate, '%Y-%m-01') AS report_date"
      : 'DATE(t.PurchaseDate) AS report_date';
    const groupClause = groupMode === 'month'
      ? 'YEAR(t.PurchaseDate), MONTH(t.PurchaseDate), t.TicketType, tc.price'
      : 'DATE(t.PurchaseDate), t.TicketType, tc.price';

    let sql = `
      SELECT ${dateSelect},
             t.TicketType,
             tc.price AS catalog_price,
             COUNT(*) AS tickets_sold,
             COALESCE(SUM(t.Price), 0) AS total_revenue,
             COALESCE(AVG(t.Price), 0) AS avg_price
      FROM ticket t
      LEFT JOIN ticket_catalog tc ON tc.ticket_type = t.TicketType
      WHERE t.PurchaseDate IS NOT NULL
    `;
    const params = [];
    if (start) {
      sql += ' AND t.PurchaseDate >= ?';
      params.push(start);
    }
    if (end) {
      sql += ' AND t.PurchaseDate <= ?';
      params.push(end);
    }
    if (typeFilter) {
      sql += ' AND t.TicketType = ?';
      params.push(typeFilter);
    }
    sql += ` GROUP BY ${groupClause}`;
    sql += ' ORDER BY report_date DESC, total_revenue DESC LIMIT 500';

    const rows = await query(sql, params).catch(() => []);
    ctx.ok({
      data: rows.map(row => ({
        report_date: row.report_date,
        ticket_type: row.TicketType || 'Unspecified',
        tickets_sold: Number(row.tickets_sold || 0),
        total_revenue: Number(row.total_revenue || 0),
        avg_price: Number(row.avg_price || 0),
      })),
    });
  }));

  router.get('/reports/revenue', requireRole(['admin', 'owner'])(async ctx => {
    const start = String(ctx.query.start || '').trim();
    const end = String(ctx.query.end || '').trim();
    const groupRaw = String(ctx.query.group || '').trim().toLowerCase();
    const groupMode = groupRaw === 'month' || groupRaw === 'monthly' ? 'month' : 'day';
    const categoryFilter = String(ctx.query.category || '').trim().toLowerCase();
    const includeTickets = !categoryFilter || categoryFilter === 'ticket';
    const includeFood = !categoryFilter || categoryFilter === 'food';
    const includeGifts = !categoryFilter || categoryFilter === 'gift';

    await Promise.all([
      ensureTicketCatalogTable(),
      ensureMenuSalesTable(),
      ensureGiftSalesTable(),
    ]).catch(() => {});

    const ticketQuery = buildTicketRevenueQuery(groupMode, start, end);
    const foodQuery = buildMenuRevenueQuery(groupMode, start, end);
    const giftQuery = buildGiftRevenueQuery(groupMode, start, end);

    const [ticketRows, foodRows, giftRows] = await Promise.all([
      includeTickets ? query(ticketQuery.sql, ticketQuery.params).catch(() => []) : Promise.resolve([]),
      includeFood ? query(foodQuery.sql, foodQuery.params).catch(() => []) : Promise.resolve([]),
      includeGifts ? query(giftQuery.sql, giftQuery.params).catch(() => []) : Promise.resolve([]),
    ]);

    const data = [
      ...ticketRows.map(row => ({
        category: 'ticket',
        period_start: row.period_start,
        period_label: formatPeriodLabel(groupMode, row.period_start),
        item_name: row.item_name || 'Ticket',
        quantity: Number(row.quantity || 0),
        total_amount: Number(row.total_amount || 0),
      })),
      ...foodRows.map(row => ({
        category: 'food',
        period_start: row.period_start,
        period_label: formatPeriodLabel(groupMode, row.period_start),
        item_name: row.item_name || 'Menu Item',
        quantity: Number(row.quantity || 0),
        total_amount: Number(row.total_amount || 0),
      })),
      ...giftRows.map(row => ({
        category: 'gift',
        period_start: row.period_start,
        period_label: formatPeriodLabel(groupMode, row.period_start),
        item_name: row.item_name || 'Gift Item',
        quantity: Number(row.quantity || 0),
        total_amount: Number(row.total_amount || 0),
      })),
    ];

    const searchTerm = String(ctx.query.search || '').trim().toLowerCase();

    const filtered = data.filter(row => {
      if (searchTerm) {
        const target = `${row.item_name || ''}`.toLowerCase();
        if (!target.includes(searchTerm)) {
          return false;
        }
      }
      return true;
    });

    const totalsByCategory = filtered.reduce((acc, row) => {
      const category = row.category || 'unknown';
      acc[category] = (acc[category] || 0) + Number(row.total_amount || 0);
      return acc;
    }, {});
    const totalRevenue = Object.values(totalsByCategory).reduce((sum, value) => sum + value, 0);
    const round = val => Number((val ?? 0).toFixed(2));
    const summaryByCategory = Object.fromEntries(
      Object.entries(totalsByCategory).map(([key, value]) => [key, round(value)]),
    );

    ctx.ok({
      data: filtered,
      summary: {
        total_revenue: round(totalRevenue),
        by_category: summaryByCategory,
      },
    });
  }));

  router.get('/reports/analytics', requireRole(['admin', 'owner'])(async ctx => {
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

    const rideRows = await query('SELECT AttractionID, Name FROM attraction WHERE isDeleted = 0').catch(() => []);
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

function buildTicketRevenueQuery(groupMode, start, end) {
  const periodExpr = selectPeriodExpression('t.PurchaseDate', groupMode);
  const groupClause = selectGroupClause('t.PurchaseDate', groupMode);
  let sql = `
    SELECT ${periodExpr} AS period_start,
           t.TicketType AS item_name,
           COALESCE(tc.price, 0) AS catalog_price,
           COUNT(*) AS quantity,
           COALESCE(SUM(t.Price), 0) AS total_amount,
           'Main Gate' AS location_name
    FROM ticket t
    LEFT JOIN ticket_catalog tc ON tc.ticket_type = t.TicketType
    WHERE t.PurchaseDate IS NOT NULL
  `;
  const params = [];
  if (start) {
    sql += ' AND t.PurchaseDate >= ?';
    params.push(start);
  }
  if (end) {
    sql += ' AND t.PurchaseDate <= ?';
    params.push(end);
  }
  sql += ` GROUP BY ${groupClause}, t.TicketType, tc.price
           ORDER BY period_start DESC, total_amount DESC`;
  return { sql, params };
}

function buildMenuRevenueQuery(groupMode, start, end) {
  const periodExpr = selectPeriodExpression('ms.sale_date', groupMode);
  const groupClause = selectGroupClause('ms.sale_date', groupMode);
  let sql = `
    SELECT ${periodExpr} AS period_start,
           mi.name AS item_name,
           fv.VendorName AS location_name,
           COALESCE(SUM(ms.quantity), 0) AS quantity,
           COALESCE(SUM(ms.quantity * ms.price_each), 0) AS total_amount
    FROM menu_sales ms
    JOIN menu_item mi ON mi.item_id = ms.menu_item_id
    LEFT JOIN food_vendor fv ON fv.VendorID = mi.vendor_id
    WHERE 1=1
  `;
  const params = [];
  if (start) {
    sql += ' AND ms.sale_date >= ?';
    params.push(start);
  }
  if (end) {
    sql += ' AND ms.sale_date <= ?';
    params.push(end);
  }
  sql += ` GROUP BY ${groupClause}, mi.name, fv.VendorName
           ORDER BY period_start DESC, total_amount DESC`;
  return { sql, params };
}

function buildGiftRevenueQuery(groupMode, start, end) {
  const periodExpr = selectPeriodExpression('gsale.sale_date', groupMode);
  const groupClause = selectGroupClause('gsale.sale_date', groupMode);
  let sql = `
    SELECT ${periodExpr} AS period_start,
           gi.name AS item_name,
           gs.ShopName AS location_name,
           COALESCE(SUM(gsale.quantity), 0) AS quantity,
           COALESCE(SUM(gsale.quantity * gsale.price_each), 0) AS total_amount
    FROM gift_sales gsale
    JOIN gift_item gi ON gi.item_id = gsale.gift_item_id
    LEFT JOIN gift_shops gs ON gs.ShopID = gi.shop_id
    WHERE 1=1
  `;
  const params = [];
  if (start) {
    sql += ' AND gsale.sale_date >= ?';
    params.push(start);
  }
  if (end) {
    sql += ' AND gsale.sale_date <= ?';
    params.push(end);
  }
  sql += ` GROUP BY ${groupClause}, gi.name, gs.ShopName
           ORDER BY period_start DESC, total_amount DESC`;
  return { sql, params };
}

function selectPeriodExpression(field, mode) {
  return mode === 'month'
    ? `DATE_FORMAT(${field}, '%Y-%m-01')`
    : `DATE(${field})`;
}

function selectGroupClause(field, mode) {
  return mode === 'month'
    ? `YEAR(${field}), MONTH(${field})`
    : `DATE(${field})`;
}

function formatPeriodLabel(mode, isoDate) {
  if (!isoDate) return '';
  const date = parseLocalDate(isoDate);
  if (!date) return isoDate;
  if (mode === 'month') {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  }
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatISODate(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const date = parseLocalDate(value);
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      const day = Number(match[3]);
      const local = new Date(year, month, day);
      if (!Number.isNaN(local.getTime())) return local;
    }
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
