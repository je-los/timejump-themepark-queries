import { query } from '../db.js';
import { requireRole } from '../middleware/auth.js';

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeStatus(value, fallback = 'open') {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized || fallback;
}

function recentlyUpdatedTimestamp(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function getMaintenanceStats() {
  const [countRows, recentRows] = await Promise.all([
    query(`
      SELECT
        SUM(
          CASE
            WHEN (Status IS NULL OR LCASE(Status) <> 'fixed') OR Date_fixed IS NULL THEN 1
            ELSE 0
          END
        ) AS open_total
      FROM maintenance_records
    `).catch(() => []),
    query(`
      SELECT RecordID,
             AttractionID,
             Status,
             Date_broken_down,
             Date_fixed,
             type_of_maintenance,
             Description_of_work
      FROM maintenance_records
      ORDER BY COALESCE(Date_fixed, Date_broken_down) DESC
      LIMIT 8
    `).catch(() => []),
  ]);

  const open = toNumber(countRows?.[0]?.open_total);
  const recentChanges = (recentRows || []).map(row => ({
    resourceType: 'maintenance',
    resourceId: row.RecordID,
    status: (row.Status || (row.Date_fixed ? 'fixed' : 'not fixed')).toLowerCase(),
    updatedAt: recentlyUpdatedTimestamp(row.Date_fixed || row.Date_broken_down),
    details: row.Description_of_work || row.type_of_maintenance || '',
  }));

  return { open, recentChanges };
}

async function getAttractionStats() {
  const rows = await query(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN IFNULL(TRIM(image_url), '') = '' THEN 1 ELSE 0 END) AS missing_media
    FROM attraction
  `).catch(() => []);
  const total = toNumber(rows?.[0]?.total);
  const missingMedia = toNumber(rows?.[0]?.missing_media);
  return {
    activeRides: total,
    inactiveAssets: missingMedia,
  };
}

async function getUserStats() {
  const rows = await query('SELECT COUNT(*) AS total FROM users').catch(() => []);
  return { totalUsers: toNumber(rows?.[0]?.total) };
}

async function getIncidentStats() {
  const CLOSED_STATUSES = ['closed', 'resolved', 'dismissed', 'complete', 'completed', 'archived'];
  const placeholders = CLOSED_STATUSES.map(() => '?').join(',');
  const [countRows, recentRows] = await Promise.all([
    query(
      `
        SELECT COUNT(*) AS total
        FROM incidents i
        LEFT JOIN incident_status ist ON ist.StatusID = i.StatusID
        WHERE i.StatusID IS NULL
           OR LCASE(TRIM(COALESCE(ist.StatusName, ''))) NOT IN (${placeholders})
      `,
      CLOSED_STATUSES,
    ).catch(() => []),
    query(`
      SELECT i.IncidentID,
             i.StatusID,
             ist.StatusName,
             i.OccurredAt,
             i.Severity,
             i.Location
      FROM incidents i
      LEFT JOIN incident_status ist ON ist.StatusID = i.StatusID
      ORDER BY i.OccurredAt DESC, i.IncidentID DESC
      LIMIT 8
    `).catch(() => []),
  ]);

  const open = toNumber(countRows?.[0]?.total);
  const recentChanges = (recentRows || []).map(row => ({
    resourceType: 'incident',
    resourceId: row.IncidentID,
    status: normalizeStatus(row.StatusName ?? (row.StatusID ? '' : 'open')),
    updatedAt: recentlyUpdatedTimestamp(row.OccurredAt),
    details: row.Location || (row.Severity ? `Severity ${row.Severity}` : ''),
  }));

  return { open, recentChanges };
}

export function registerDashboardRoutes(router) {
  router.get('/admin/insights', requireRole(['manager', 'admin', 'owner'])(async ctx => {
    const [maintenance, attractions, users, incidents] = await Promise.all([
      getMaintenanceStats(),
      getAttractionStats(),
      getUserStats(),
      getIncidentStats(),
    ]);

    const metrics = {
      openIncidents: incidents.open,
      openMaintenance: maintenance.open,
      activeRides: attractions.activeRides,
      inactiveAssets: attractions.inactiveAssets,
      totalUsers: users.totalUsers,
    };

    const alerts = [];
    if (metrics.openIncidents > 0) {
      alerts.push({
        level: 'critical',
        message: `${metrics.openIncidents} incident(s) need attention.`,
        target: '/reports',
      });
    }
    if (metrics.openMaintenance > 0) {
      alerts.push({
        level: 'warning',
        message: `${metrics.openMaintenance} maintenance task(s) pending.`,
        target: '/admin/maintenance?status=open',
      });
    }
    if (metrics.inactiveAssets > 0) {
      alerts.push({
        level: 'info',
        message: `${metrics.inactiveAssets} attraction(s) missing media.`,
        target: '/admin/attractions',
      });
    }

    const recentChanges = [...incidents.recentChanges, ...maintenance.recentChanges]
      .map(item => ({
        ...item,
        updatedAt: item.updatedAt || null,
      }))
      .sort((a, b) => {
        const aTime = a.updatedAt ? Date.parse(a.updatedAt) || 0 : 0;
        const bTime = b.updatedAt ? Date.parse(b.updatedAt) || 0 : 0;
        return bTime - aTime;
      })
      .slice(0, 8);

    ctx.ok({
      data: {
        metrics,
        alerts,
        recentChanges,
      },
    });
  }));
}
