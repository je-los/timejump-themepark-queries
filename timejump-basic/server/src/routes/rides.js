import {
  findRideBySlug,
  findThemeBySlug,
  listFeaturedRideRefs,
  listRides,
  listThemes,
} from '../services/rideLibrary.js';

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
  const [themes, rides, featuredRefs] = await Promise.all([
    listThemes(),
    listRides(),
    listFeaturedRideRefs(),
  ]);
  const themeMap = new Map(themes.map(theme => [theme.slug, { ...theme, rides: [] }]));

  rides.forEach(ride => {
    const theme = themeMap.get(ride.theme_slug);
    if (theme) {
      theme.rides.push(ride);
    }
  });

  const featured = featuredRefs
    .map(ref => {
      const ride = rides.find(r => r.id === ref.AttractionID);
      if (!ride) return null;
      return { ...ride, flagged_at: ref.flagged_at };
    })
    .filter(Boolean);

  return {
    themes: Array.from(themeMap.values()),
    rides,
    featured,
  };
}
