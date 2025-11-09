import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

export default function RidesAndAttractions({ library, loading, error }) {
  const navigate = useNavigate();
  const themes = library?.themes || [];

  const allRides = useMemo(() => {
    const seen = new Set();
    const rides = [];
    themes.forEach(theme => {
      (theme.rides || []).forEach(ride => {
        const slug = ride.slug || ride.Name || ride.name;
        if (!slug || seen.has(slug)) return;
        seen.add(slug);
        rides.push({
          ...ride,
          themeName: theme.name,
          capacity: ride.capacity_per_experience ?? ride.capacity ?? ride.riders_per_vehicle ?? null,
        });
      });
    });
    return rides;
  }, [themes]);

  const spotlightRides = allRides.slice(0, 8);

  return (
    <div className="page rides-page">
      <div className="rides-shell">
        <section className="rides-hero">
          <div className="rides-hero__content">
            <p className="rides-eyebrow">Rides &amp; Attractions</p>
            <h1>Jump through eras, one thrill at a time.</h1>
            <p className="rides-hero__copy">
              Browse every land, queue up the can’t-miss coasters, and plan a full day of shows, dark rides,
              and immersive walkthroughs before you arrive.
            </p>
            <div className="rides-hero__cta">
              <button className="btn primary" onClick={() => navigate('/ticket-passes')}>
                Buy Tickets
              </button>
              <button className="btn" onClick={() => navigate('/things-to-do/dining')}>
                Visit Marketplace
              </button>
            </div>
          </div>
        </section>

        {loading && <p className="text-sm text-gray-600">Loading attractions…</p>}
        {error && <p className="alert error">{error}</p>}

        {!loading && !error && themes.length > 0 && (
          <>
            <section className="rides-themes">
              <div className="section-header rides-section-header">
                <div>
                  <h2>Choose a realm</h2>
                  <p>Hop between eras. Tap a land to see the full lineup of rides, dining, and live entertainment.</p>
                </div>
              </div>
              <div className="rides-themes__grid">
                {themes.map(theme => (
                  <article key={theme.slug} className="theme-card">
                    <div className="theme-card__header">
                      <h3>{theme.name}</h3>
                      <span>{(theme.rides || []).length} attractions</span>
                    </div>
                    {theme.description && (
                      <p className="theme-card__body">
                        {theme.description}
                      </p>
                    )}
                    <div className="theme-card__actions">
                      <button className="btn" onClick={() => navigate(`/theme/${theme.slug}`)}>
                        Explore
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rides-highlight">
              <div className="section-header rides-section-header">
                <div>
                  <h2>Spotlight attractions</h2>
                  <p>Fan favorites from every era—perfect for anchoring your itinerary.</p>
                </div>
              </div>
              {spotlightRides.length ? (
                <div className="rides-highlight__grid">
                  {spotlightRides.map(ride => (
                    <article key={ride.slug || ride.name} className="ride-feature-card">
                      <div className="ride-feature-card__meta">
                        <span>{ride.themeName}</span>
                        <span>{ride.type || 'Attraction'}</span>
                      </div>
                      <h3>{ride.name}</h3>
                      <p>{ride.description || ride.type_description || 'Details coming soon.'}</p>
                      <div className="ride-feature-card__stats">
                        {ride.capacity && (
                          <div>
                            <strong>{ride.capacity}</strong>
                            <span>guests per dispatch</span>
                          </div>
                        )}
                        {ride.estimated_capacity_per_hour && (
                          <div>
                            <strong>{ride.estimated_capacity_per_hour.toLocaleString()}</strong>
                            <span>guests per hour</span>
                          </div>
                        )}
                      </div>
                      <button className="btn" onClick={() => navigate(`/ride/${ride.slug}`)}>
                        View details
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600">Add rides in the admin console to populate the spotlight grid.</p>
              )}
            </section>
          </>
        )}

        {!loading && !error && themes.length === 0 && (
          <p className="text-sm text-gray-600">
            No attractions are ready yet. Add themes and rides in the admin console to populate this page.
          </p>
        )}
      </div>
    </div>
  );
}
