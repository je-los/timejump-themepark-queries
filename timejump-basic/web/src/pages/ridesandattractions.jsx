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

  const showRides = useMemo(() => {
    return allRides.filter(ride => {
      const typeLabel = (ride.type || ride.TypeName || '').toLowerCase();
      return typeLabel.includes('show');
    });
  }, [allRides]);

  const ridesByType = useMemo(() => {
    const grouped = new Map();
    showRides.forEach(ride => {
      const key = (ride.type || ride.TypeName || 'Shows').trim();
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(ride);
    });
    return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [showRides]);

  const featuredShows = useMemo(
    () => showRides.slice(0, 12),
    [showRides],
  );

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
                  <h2>Featured entertainment</h2>
                </div>
              </div>
              {featuredShows.length ? (
                <div className="rides-highlight__grid">
                  {featuredShows.map(ride => {
                    const experience = ride.experience_level
                      ?? ride.experienceLevel
                      ?? ride.thrill_level
                      ?? ride.type_description
                      ?? null;
                    const audience = ride.target_audience
                      ?? ride.targetAudience
                      ?? ride.audience
                      ?? null;
                    const descriptionRaw = ride.description || ride.type_description || '';
                    const description =
                      descriptionRaw && descriptionRaw.trim().toLowerCase() === 'seated or street performance with scheduled times.'
                        ? ''
                        : descriptionRaw;
                    const statusName = (ride.status_name || '').toLowerCase();
                    const derivedClosed = statusName ? statusName !== 'active' : false;
                    const isMaintenance = statusName === 'closed_for_maintenance';
                    const isWeatherClosed = statusName === 'closed_due_to_weather';
                    const isClosed = ride.is_closed ?? derivedClosed;
                    const statusClass = isMaintenance
                      ? 'ride-status--maintenance'
                      : isWeatherClosed
                        ? 'ride-status--weather'
                        : isClosed
                          ? 'ride-status--closed'
                          : 'ride-status--open';
                    const statusLabel = ride.status_label
                      || (isMaintenance ? 'Closed for Maintenance' : isWeatherClosed ? 'Closed due to Weather' : isClosed ? 'Closed' : 'Open');
                    const statusNote = ride.status_note || ride.maintenance_note || ride.closure_note || null;
                    return (
                      <article key={ride.slug || ride.name} className="ride-feature-card ride-feature-card--show">
                        {ride.image_url && (
                          <div className="ride-feature-card__image" style={{ backgroundImage: `url(${ride.image_url})` }} />
                        )}
                        <div className="ride-feature-card__meta">
                          <span>{ride.themeName}</span>
                          <span className={`ride-status ${statusClass}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <h3>{ride.name}</h3>
                        {isClosed && statusNote && (
                          <p className={`ride-status__note ${isMaintenance ? 'ride-status__note--maintenance' : ''}`}>
                            {statusNote}
                          </p>
                        )}
                        {description && <p>{description}</p>}
                        <div className="ride-feature-card__stats">
                          {ride.capacity && (
                            <div>
                              <strong>{ride.capacity.toLocaleString()}</strong>
                              <span className="ride-feature-card__stat-label">Capacity</span>
                            </div>
                          )}
                          {experience && (
                            <div>
                              <strong>{experience}</strong>
                              <span className="ride-feature-card__stat-label">Experience</span>
                            </div>
                          )}
                          {audience && (
                            <div>
                              <strong>{audience}</strong>
                              <span className="ride-feature-card__stat-label">Audience</span>
                            </div>
                          )}
                        </div>
                        <div className="ride-feature-card__cta">
                          <span>Included in {ride.themeName}</span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-600">Add live entertainment in the admin console to populate this section.</p>
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
