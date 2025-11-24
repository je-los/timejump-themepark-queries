import { query } from '../db.js';
import { toSlug } from '../utils/strings.js';
import {
  ensureAttractionExperienceColumns,
  ensureAttractionImageColumn,
  ensureThemeImageColumn,
} from './ensure.js';

function normalizeRide(row) {
  const slug = toSlug(row.Name);
  const capacityPerDispatch = Number(row.Capacity ?? 0);
  const dispatchesPerHour = 12;
  const estimatedCapacity = Number.isFinite(capacityPerDispatch) && capacityPerDispatch > 0
    ? capacityPerDispatch * dispatchesPerHour
    : null;
  const closureStatusId = Number.isFinite(Number(row.closure_status_id))
    ? Number(row.closure_status_id)
    : 0;
  const closureStatusName = (row.closure_status_name || '').toLowerCase();
  const hasActiveMaintenance = Boolean(row.maintenance_record_id);
  const isWeatherClosed = closureStatusId === 2 || closureStatusName === 'temporarily_closed_weather';
  let normalizedStatus = closureStatusName || (closureStatusId === 0 ? 'active' : 'temporarily_closed');
  let statusLabel;
  let statusNote = row.closure_note || row.closure_status_description || null;

  if (hasActiveMaintenance) {
    normalizedStatus = 'closed_for_maintenance';
    statusLabel = 'Closed for Maintenance';
    statusNote = row.maintenance_description || statusNote;
  } else if (isWeatherClosed) {
    normalizedStatus = 'closed_due_to_weather';
    statusLabel = 'Closed due to Weather';
  } else if (normalizedStatus === 'active') {
    statusLabel = 'Open';
  } else if (normalizedStatus === 'permanently_closed') {
    statusLabel = 'Permanently Closed';
  } else {
    statusLabel = 'Closed';
  }

  const statusCode = hasActiveMaintenance ? 2 : closureStatusId;
  const isOpen = normalizedStatus === 'active';

  return {
    id: row.AttractionID,
    attraction_id: row.AttractionID,
    name: row.Name,
    slug,
    theme_id: row.ThemeID,
    theme_name: row.themeName,
    theme_slug: toSlug(row.themeName),
    type_id: row.AttractionTypeID,
    type: row.TypeName || 'Attraction',
    type_description: row.typeDescription || '',
    description: row.typeDescription || '',
    capacity_per_experience: capacityPerDispatch || null,
    estimated_capacity_per_hour: estimatedCapacity,
    image_url: row.image_url || null,
    experience_level: row.experience_level || null,
    target_audience: row.target_audience || null,
    status_code: statusCode,
    status_name: normalizedStatus,
    status_label: statusLabel,
    status_note: statusNote || null,
    is_open: isOpen,
    is_closed: !isOpen,
    maintenance_active: hasActiveMaintenance,
    maintenance_note: row.maintenance_description || null,
  };
}

export async function listThemes() {
  await ensureThemeImageColumn();
  const rows = await query(`
    SELECT t.themeID,
           t.themeName,
           t.Description,
           t.image_url,
           COUNT(a.AttractionID) AS attraction_count
    FROM theme t
    LEFT JOIN attraction a ON a.ThemeID = t.themeID AND a.isDeleted = 0
    WHERE t.isDeleted = 0
    GROUP BY t.themeID, t.themeName, t.Description, t.image_url
    ORDER BY t.themeName ASC
  `).catch(() => []);

  return rows.map(row => ({
    id: row.themeID,
    themeID: row.themeID,
    name: row.themeName,
    slug: toSlug(row.themeName),
    description: row.Description || '',
    attraction_count: Number(row.attraction_count || 0),
    image_url: row.image_url || null,
  }));
}

export async function listRides() {
  await ensureAttractionImageColumn();
  await ensureAttractionExperienceColumns();
  const rows = await query(`
    SELECT
      a.AttractionID,
      a.Name,
      a.AttractionTypeID,
      at.TypeName,
      at.Description AS typeDescription,
      a.ThemeID,
      t.themeName,
      a.Capacity,
      a.image_url,
      a.experience_level,
      a.target_audience,
      ac.StatusID AS closure_status_id,
      cs.StatusName AS closure_status_name,
      cs.Description AS closure_status_description,
      ac.Note AS closure_note,
      mr.RecordID AS maintenance_record_id,
      mr.Description_of_work AS maintenance_description
    FROM attraction a
    LEFT JOIN theme t ON t.themeID = a.ThemeID AND t.isDeleted = 0
    LEFT JOIN attraction_type at ON at.AttractionTypeID = a.AttractionTypeID AND at.isDeleted = 0
    LEFT JOIN attraction_closure ac
      ON ac.ClosureID = (
        SELECT ac2.ClosureID
        FROM attraction_closure ac2
        WHERE ac2.AttractionID = a.AttractionID
          AND ac2.StartsAt <= NOW()
          AND (ac2.EndsAt IS NULL OR ac2.EndsAt >= NOW())
        ORDER BY ac2.StartsAt DESC
        LIMIT 1
      )
    LEFT JOIN cancellation_status cs ON cs.StatusID = ac.StatusID
    LEFT JOIN maintenance_records mr
      ON mr.RecordID = (
        SELECT mr2.RecordID
        FROM maintenance_records mr2
        WHERE mr2.AttractionID = a.AttractionID
          AND mr2.Date_broken_down <= CURRENT_DATE()
          AND (mr2.Date_fixed IS NULL OR mr2.Date_fixed > CURRENT_DATE())
        ORDER BY (mr2.Date_fixed IS NULL) DESC, mr2.Date_broken_down DESC
        LIMIT 1
      )
    WHERE a.isDeleted = 0
    ORDER BY t.themeName ASC, a.Name ASC
  `).catch(() => []);

  return rows.map(normalizeRide);
}

export async function findRideBySlug(slug) {
  if (!slug) return null;
  const rides = await listRides();
  return rides.find(ride => ride.slug === slug) || null;
}

export async function findThemeBySlug(slug) {
  if (!slug) return null;
  const themes = await listThemes();
  return themes.find(theme => theme.slug === slug) || null;
}

export async function listFeaturedRideRefs(limit = 6) {
  const safeLimit = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Number(limit) : 6;
  const rows = await query(
    'SELECT AttractionID, flagged_at FROM featured_rides ORDER BY flagged_at DESC LIMIT ?',
    [safeLimit],
  ).catch(() => []);
  return Array.isArray(rows) ? rows : [];
}

export function rideForecast(ride) {
  if (!ride) return null;
  const hourlyCapacity = ride.estimated_capacity_per_hour;
  if (!Number.isFinite(hourlyCapacity) || hourlyCapacity <= 0) return null;

  const operatingHours = 12; // 10:00 - 22:00
  const expectedDaily = Math.round(hourlyCapacity * operatingHours * 0.6); // assume 60% utilization

  const hourly_breakdown = Array.from({ length: operatingHours }, (_, idx) => ({
    hour: 10 + idx,
    expected_boardings: Math.round(expectedDaily / operatingHours),
  }));

  return {
    expected_daily_boardings: expectedDaily,
    capacity_cap: hourlyCapacity,
    failure_rate: 0.05, // placeholder until failure data exists
    operating_hours: operatingHours,
    hourly_breakdown,
  };
}
