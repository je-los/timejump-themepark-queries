import React from 'react';

export default function RidesAndAttractions({ library, loading, error, onNavigate }) {
  const themes = library?.themes || [];
  const allRides = themes.flatMap(theme => (theme?.rides || []).map(ride => ({ ...ride, themeName: theme.name, themeSlug: theme.slug })));

  return (
    <div className="page">
      <div className="page-box page-box--wide">
        <header className="section-header">
          <h1>Rides &amp; Attractions</h1>
          <p>
            Discover every ride Time Jump has to offer. Pick a land to browse its lineup, or tap into an attraction card to view details.
          </p>
        </header>

        {loading && <p className="text-sm text-gray-600">Loading attractions…</p>}
        {error && <p className="alert error">{error}</p>}

        {!loading && !error && themes.length > 0 && (
          <div className="rides-zones">
            {themes.map(theme=>(
              <section key={theme.slug} className="rides-zone">
                <div className="rides-zone__header">
                  <div>
                    <h2>{theme.name}</h2>
                    {theme.description && <p>{theme.description}</p>}
                  </div>
                  <button className="btn" onClick={()=>onNavigate?.(`theme/${theme.slug}`)}>
                    View {theme.name}
                  </button>
                </div>
                <div className="rides-zone__grid">
                  {(theme.rides || []).map(ride=>(
                    <article key={ride.slug} className="ride-card-tile" onClick={()=>onNavigate?.(`ride/${ride.slug}`)}>
                      <h3>{ride.name}</h3>
                      <p>{ride.description || ride.type || 'Attraction details coming soon.'}</p>
                      <div className="ride-card-tile__meta">
                        <span>{ride.type || 'Attraction'}</span>
                        {ride.height_restriction !== undefined && ride.height_restriction !== null && (
                          <span>{ride.height_restriction}" min height</span>
                        )}
                      </div>
                    </article>
                  ))}
                  {(!theme.rides || theme.rides.length === 0) && (
                    <div className="rides-zone__empty">
                      No attractions recorded yet for {theme.name}.
                    </div>
                  )}
                </div>
              </section>
            ))}
          </div>
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
