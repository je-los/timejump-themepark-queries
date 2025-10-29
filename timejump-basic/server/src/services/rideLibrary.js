import { query } from '../db.js';
import { toSlug } from '../utils/strings.js';

function normalizeRide(row) {
  const slug = toSlug(row.Name);
  const riders = Number(row.RidersPerVehicle ?? 0);
  const dispatchesPerHour = 12;
  const estimatedCapacity = Number.isFinite(riders) && riders > 0 ? riders * dispatchesPerHour : null;
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
    height_restriction: row.HeightRestriction,
    riders_per_vehicle: row.RidersPerVehicle,
    estimated_capacity_per_hour: estimatedCapacity,
  };
}

export async function listThemes() {
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

  return rows.map(row => ({
    id: row.themeID,
    themeID: row.themeID,
    name: row.themeName,
    slug: toSlug(row.themeName),
    description: row.Description || '',
    attraction_count: Number(row.attraction_count || 0),
  }));
}

export async function listRides() {
  const rows = await query(`
    SELECT
      a.AttractionID,
      a.Name,
      a.AttractionTypeID,
      at.TypeName,
      at.Description AS typeDescription,
      a.ThemeID,
      t.themeName,
      a.HeightRestriction,
      a.RidersPerVehicle
    FROM attraction a
    LEFT JOIN theme t ON t.themeID = a.ThemeID
    LEFT JOIN attraction_type at ON at.AttractionTypeID = a.AttractionTypeID
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
