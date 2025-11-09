import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function RideView() {
  const { slug } = useParams();
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(()=>{
    if(!slug) return;
    let active = true;
    setLoading(true);
    fetch(`${import.meta.env.VITE_API_URL}/ride-library/rides/${slug}`)
      .then(r=> r.ok ? r.json() : Promise.reject(new Error('Ride not found')))
      .then(j=>{
        if(!active) return;
        setRide(j?.data?.ride || null);
        setError('');
      })
      .catch(err=>{
        if(!active) return;
        setError(err?.message || 'Unable to load ride.');
        setRide(null);
      })
      .finally(()=>active && setLoading(false));
    return ()=>{ active=false; };
  },[slug]);

  const description = ride?.description || '';
  const capacityPerExperience = ride?.capacity_per_experience
    ?? ride?.capacity_per_event
    ?? ride?.capacity
    ?? ride?.RidersPerVehicle
    ?? ride?.riders_per_vehicle
    ?? null;
  const capacityPerHour = Number.isFinite(ride?.estimated_capacity_per_hour)
    ? ride.estimated_capacity_per_hour
    : null;
  const audience = ride?.target_audience ?? ride?.audience ?? null;
  const thrill = ride?.experience_level ?? ride?.thrill_level ?? null;
  const duration = ride?.duration_minutes ?? ride?.duration ?? null;
  const bestTime = ride?.best_time_to_visit ?? ride?.best_time ?? null;
  const restrictions = ride?.additional_restrictions ?? ride?.restrictions ?? null;
  const highlights = normalizeList(ride?.highlights);

  return (
    <div className="page">
      <div className="page-box page-box--wide">
        {loading && <p className="text-sm text-gray-600">Loading ride details...</p>}
        {error && <p className="alert error">{error}</p>}
        {!loading && !error && ride && (
          <>
            <h1>{ride.Name || ride.name || 'Ride'}</h1>
            <p className="text-sm text-gray-700">
              Experience {ride.Name || ride.name || 'this attraction'}.
            </p>
            {description && (
              <p className="text-sm text-gray-700" style={{marginTop:8}}>
                {description}
              </p>
            )}
            <div className="grid" style={{gap:16}}>
              <div className="card">
                <h3>Ride Stats</h3>
                <ul className="ride-card__list" style={{paddingLeft:18, margin:0}}>
                  <li><strong>Theme:</strong> {ride.theme_name || 'Time Jump Theme Park'}</li>
                  <li><strong>Type:</strong> {ride.type || ride.TypeName || 'Attraction'}</li>
                  {capacityPerExperience !== null && (
                    <li><strong>Capacity:</strong> {capacityPerExperience} guests</li>
                  )}
                  {capacityPerHour && (
                    <li><strong>Estimated Capacity:</strong> {capacityPerHour.toLocaleString()} riders/hr</li>
                  )}
                </ul>
              </div>
              <div className="card">
                <h3>Who It's For</h3>
                <p className="text-sm text-gray-700">
                  {audience || 'Target audience details coming soon.'}
                </p>
                <p className="text-sm text-gray-700" style={{marginTop:12}}>
                  Experience Level: <strong>{thrill || 'Information coming soon.'}</strong>
                </p>
                {bestTime && (
                  <p className="text-sm text-gray-700" style={{marginTop:12}}>
                    Best time to ride: {bestTime}
                  </p>
                )}
              </div>
              <div className="card">
                <h3>Ride Highlights</h3>
                {highlights.length > 0 ? (
                  <ul className="ride-card__list" style={{paddingLeft:18, margin:0}}>
                    {highlights.map((item, idx)=>(
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-700">
                    Highlights will be added soon.
                  </p>
                )}
              </div>
              <div className="card">
                <h3>Accessibility & Restrictions</h3>
                <p className="text-sm text-gray-700">
                  {restrictions || 'Accessibility information coming soon. Please check back later.'}
                </p>
              </div>
            </div>
          </>
        )}
        {!loading && !error && !ride && (
          <p className="text-sm text-gray-600">Ride not found.</p>
        )}
      </div>
    </div>
  );
}

function normalizeList(value){
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(/[\n,]/)
      .map(item => item.trim())
      .filter(Boolean);
  }
  return [];
}
