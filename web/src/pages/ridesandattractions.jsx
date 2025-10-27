import React from 'react';

export default function RidesAndAttractions({ library, loading, error, onNavigate }) {
  const themes = library?.themes || [];
  return (
    <div className="page">
      <div className="page-box page-box--wide">
        <h1>Rides & Attractions</h1>
        <p className="text-sm text-gray-700">
          Explore each realm of Time Jump Theme Park. Choose a theme to see its full line-up or jump straight into a signature experience.
        </p>
        {loading && <p className="text-sm text-gray-600">Loading themes...</p>}
        {error && <p className="alert error">{error}</p>}
        {!loading && !error && (
          <div className="theme-grid">
            {themes.map(theme=>(
              <article key={theme.slug} className="theme-card">
                <header className="theme-card__header">
                  <h2>{theme.name}</h2>
                  <button className="btn" onClick={()=>onNavigate?.(`theme/${theme.slug}`)}>
                    View Theme
                  </button>
                </header>
                <p className="theme-card__description">{theme.description || 'Thrills await in this themed land.'}</p>
                <div className="theme-card__rides">
                  {theme.rides.slice(0,3).map(ride=>(
                    <button key={ride.slug} className="theme-card__ride" onClick={()=>onNavigate?.(`ride/${ride.slug}`)}>
                      <span>{ride.name}</span>
                      <small>{ride.type}</small>
                    </button>
                  ))}
                  {theme.rides.length > 3 && (
                    <div className="theme-card__more">+ {theme.rides.length - 3} more experiences</div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

