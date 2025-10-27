import React, { useEffect, useState } from 'react';

export default function ThemeView({ slug, onNavigate }) {
  const [theme, setTheme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(()=>{
    if(!slug) return;
    let active = true;
    setLoading(true);
    fetch(`${import.meta.env.VITE_API_URL}/ride-library/themes/${slug}`)
      .then(r=> r.ok ? r.json() : Promise.reject(new Error('Theme not found')))
      .then(j=>{
        if(!active) return;
        setTheme(j?.data || null);
        setError('');
      })
      .catch(err=>{
        if(!active) return;
        setError(err?.message || 'Unable to load theme.');
        setTheme(null);
      })
      .finally(()=>active && setLoading(false));
    return ()=>{ active=false; };
  },[slug]);

  return (
    <div className="page">
      <div className="page-box page-box--wide">
        {loading && <p className="text-sm text-gray-600">Loading attractions...</p>}
        {error && <p className="alert error">{error}</p>}
        {!loading && !error && theme && (
          <>
            <h1>{theme.name}</h1>
            {theme.description && <p className="text-sm text-gray-700">{theme.description}</p>}
            <div className="ride-grid">
              {theme.rides.map(ride=>{
                const stats = ride.details || {};
                return (
                  <article key={ride.slug} className="ride-card">
                    <header className="ride-card__header">
                      <h2>{ride.name}</h2>
                      <button className="btn" onClick={()=>onNavigate?.(`ride/${ride.slug}`)}>View Ride</button>
                    </header>
                    <ul className="ride-card__list">
                      <li><strong>Type:</strong> {ride.type}</li>
                      {stats.HeightRestriction && <li><strong>Height Restriction:</strong> {stats.HeightRestriction}"</li>}
                      {stats.Duration && <li><strong>Duration:</strong> {stats.Duration}</li>}
                      {stats.Manufacturer && <li><strong>Manufacturer:</strong> {stats.Manufacturer}</li>}
                      <li><strong>Max Capacity:</strong> {ride.capacity_cap.toLocaleString()} riders/hr</li>
                    </ul>
                    <p className="ride-card__footer">
                      Chance of maintenance alert: {(ride.failure_rate * 100).toFixed(1)}% daily.
                    </p>
                  </article>
                );
              })}
            </div>
          </>
        )}
        {!loading && !error && !theme && (
          <p className="text-sm text-gray-600">Theme not found.</p>
        )}
      </div>
    </div>
  );
}

