import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import jurasticTJ from '../assets/JurasticTJ.jpg';

export default function ThemeView() {
  const { slug } = useParams();
  const navigate = useNavigate();
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
            {theme.description && ( 
              <p className="text-sm text-gray-700">{theme.description}</p>
            )}

            <div className="theme-artwork">
              <img
                src={jurasticTJ}
                alt="Jurassic Theme Artwork"
                className="w-full h-auto rounded-lg shadow-md mb-6"
              />
            </div>

            <div className="ride-grid">
              {theme.rides.map(ride=>{
                const capacityPerExperience = ride.capacity_per_experience
                  ?? ride.capacity
                  ?? ride.riders_per_vehicle
                  ?? ride.RidersPerVehicle
                  ?? ride.details?.RidersPerVehicle
                  ?? null;
                const capacity = Number.isFinite(ride.estimated_capacity_per_hour) ? ride.estimated_capacity_per_hour : null;
                const audience = ride.target_audience ?? ride.audience ?? null;
                const thrill = ride.experience_level ?? ride.thrill_level ?? ride.type_description ?? ride.type;
                const duration = ride.duration_minutes ?? ride.duration ?? null;
                return (
                  <article key={ride.slug || ride.id} className="ride-card">
                    <header className="ride-card__header">
                      <h2>{ride.name}</h2>
                      <button className="btn" onClick={()=>navigate(`/ride/${ride.slug}`)}>View Ride</button>
                    </header>
                    {ride.description && (
                      <p className="text-sm text-gray-700" style={{marginTop:8}}>
                        {ride.description}
                      </p>
                    )}
                    <ul className="ride-card__list">
                      <li><strong>Type:</strong> {ride.type || 'Attraction'}</li>
                      {capacityPerExperience !== undefined && capacityPerExperience !== null && (
                        <li><strong>Capacity:</strong> {capacityPerExperience} guests</li>
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
