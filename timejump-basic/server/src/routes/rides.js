import {
  findRideBySlug,
  findThemeBySlug,
  listRides,
  listThemes,
} from '../services/rideLibrary.js';
import { query } from '../db.js';

export function registerRideRoutes(router) {
  router.get('/ride-library', async ctx => {
    const data = await buildLibrary();
    ctx.ok({ data });
  });

  router.get('/ride-library/themes/:slug', async ctx => {
    const slug = String(ctx.params.slug || '').trim();
    if (!slug) {
      ctx.error(400, 'Theme slug is required.');
      return;
    }
    const [theme, rides] = await Promise.all([
      findThemeBySlug(slug),
      listRides(),
    ]);
    if (!theme) {
      ctx.error(404, 'Theme not found.');
      return;
    }
    ctx.ok({
      data: {
        ...theme,
        rides: rides.filter(ride => ride.theme_slug === slug),
      },
    });
  });

  router.get('/ride-library/rides/:slug', async ctx => {
    const slug = String(ctx.params.slug || '').trim();
    if (!slug) {
      ctx.error(400, 'Ride slug is required.');
      return;
    }
    const ride = await findRideBySlug(slug);
    if (!ride) {
      ctx.error(404, 'Ride not found.');
      return;
    }
    ctx.ok({
      data: {
        ride,
      },
    });
  });
}

async function buildLibrary() {
  const [themes, rides] = await Promise.all([
    listThemes(),
    listRides(),
  ]);
  const themeMap = new Map(themes.map(theme => [theme.slug, { ...theme, rides: [] }]));

  rides.forEach(ride => {
    const theme = themeMap.get(ride.theme_slug);
    if (theme) {
      theme.rides.push(ride);
    }
  });

  // Build featured list from the database; prefer joined ride data, fallback to ID mapping
  let featuredList = [];

  try {
    featuredList = await query(`
      SELECT
        a.AttractionID    AS id,
        a.AttractionID    AS attraction_id,
        a.Name            AS name,
        a.AttractionTypeID AS type_id,
        at.TypeName       AS type,
        at.Description    AS type_description,
        a.ThemeID         AS theme_id,
        t.themeName       AS theme_name,
        t.themeName       AS themeName,
        a.Capacity        AS capacity_per_experience,
        a.Capacity        AS capacity,
        a.image_url,
        a.experience_level,
        a.target_audience,
        ac.StatusID       AS closure_status_id,
        cs.StatusName     AS closure_status_name,
        cs.Description    AS closure_status_description,
        NULL              AS closure_note,
        mr.RecordID       AS maintenance_record_id,
        mr.Description_of_work AS maintenance_description
      FROM featured_rides fr
      JOIN attraction a ON a.AttractionID = fr.AttractionID AND a.isDeleted = 0
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
      ORDER BY fr.flagged_at DESC
      LIMIT 6
    `);
  } catch {
    featuredList = [];
  }

  // Fallback if the joined query fails or returns nothing
  if (!Array.isArray(featuredList) || !featuredList.length) {
    const idRows = await query('SELECT AttractionID FROM featured_rides').catch(() => []);
    if (Array.isArray(idRows) && idRows.length) {
      const idSet = new Set(idRows.map(row => String(row.AttractionID)));
      featuredList = rides.filter(ride => {
        const key = String(ride.attraction_id ?? ride.AttractionID ?? ride.id ?? '');
        return key && idSet.has(key);
      });
    }
  }

  return {
    themes: Array.from(themeMap.values()),
    rides,
    featured: featuredList,
  };
}
