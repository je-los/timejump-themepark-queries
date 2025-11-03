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
                const height = ride.height_restriction ?? ride.HeightRestriction ?? ride.details?.HeightRestriction;
                const ridersPerVehicle = ride.riders_per_vehicle ?? ride.RidersPerVehicle ?? ride.details?.RidersPerVehicle;
                const capacity = Number.isFinite(ride.estimated_capacity_per_hour) ? ride.estimated_capacity_per_hour : null;
                const audience = ride.target_audience ?? ride.audience ?? null;
                const thrill = ride.experience_level ?? ride.thrill_level ?? ride.type_description ?? ride.type;
                const duration = ride.duration_minutes ?? ride.duration ?? null;
                return (
                  <article key={ride.slug || ride.id} className="ride-card">
                    <header className="ride-card__header">
                      <h2>{ride.name}</h2>
                      <button className="btn" onClick={()=>onNavigate?.(`ride/${ride.slug}`)}>View Ride</button>
                    </header>
                    {ride.description && (
                      <p className="text-sm text-gray-700" style={{marginTop:8}}>
                        {ride.description}
                      </p>
                    )}
                    <ul className="ride-card__list">
                      <li><strong>Type:</strong> {ride.type || 'Attraction'}</li>
                      {height !== undefined && height !== null && (
                        <li><strong>Height Restriction:</strong> {height}"</li>
                      )}
                      {ridersPerVehicle !== undefined && ridersPerVehicle !== null && (
                        <li><strong>Riders per Vehicle:</strong> {ridersPerVehicle}</li>
                      )}
                      <li>
                        <strong>Estimated Capacity:</strong>{' '}
                        {capacity ? `${capacity.toLocaleString()} riders/hr` : 'Not available'}
                      </li>
                      <li>
                        <strong>Who It's For:</strong>{' '}
                        {audience || 'Details coming soon.'}
                      </li>
                      <li>
                        <strong>Experience Level:</strong>{' '}
                        {thrill || 'Information coming soon.'}
                      </li>
                      {duration && (
                        <li>
                          <strong>Ride Duration:</strong> {duration} min
                        </li>
                      )}
                    </ul>
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
