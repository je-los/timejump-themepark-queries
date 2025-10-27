import React, { useEffect, useState } from 'react';

export default function RideView({ slug }) {
  const [data, setData] = useState(null);
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
        setData(j?.data || null);
        setError('');
      })
      .catch(err=>{
        if(!active) return;
        setError(err?.message || 'Unable to load ride.');
        setData(null);
      })
      .finally(()=>active && setLoading(false));
    return ()=>{ active=false; };
  },[slug]);

  const ride = data?.ride;
  const config = data?.config;
  const forecast = data?.forecast;

  return (
    <div className="page">
      <div className="page-box page-box--wide">
        {loading && <p className="text-sm text-gray-600">Loading ride details...</p>}
        {error && <p className="alert error">{error}</p>}
        {!loading && !error && ride && (
          <>
            <h1>{ride.Name || config?.name || 'Ride'}</h1>
            <p className="text-sm text-gray-700">
              Experience {ride.Name || config?.name}. Built by {ride.Manufacturer || 'Time Jump Imagineering'}.
            </p>
            <div className="grid" style={{gap:16}}>
              <div className="card">
                <h3>Ride Stats</h3>
                <ul className="ride-card__list" style={{paddingLeft:18, margin:0}}>
                  <li><strong>Type:</strong> {ride.AttractionType || config?.type || 'Attraction'}</li>
                  {ride.HeightRestriction && <li><strong>Height Restriction:</strong> {ride.HeightRestriction}"</li>}
                  {ride.Duration && <li><strong>Duration:</strong> {ride.Duration}</li>}
                  {ride.RidersPerRow && <li><strong>Riders per Row:</strong> {ride.RidersPerRow}</li>}
                  {ride.RidersPerVehicle && <li><strong>Riders per Vehicle:</strong> {ride.RidersPerVehicle}</li>}
                </ul>
              </div>
              {forecast && (
                <>
                  <div className="card">
                    <h3>Forecasted Throughput</h3>
                    <p className="text-sm text-gray-700">
                      Expected riders per day: <strong>{forecast.expected_daily_boardings.toLocaleString()}</strong>
                    </p>
                    <p className="ride-card__footer">
                      Capacity cap: {forecast.capacity_cap.toLocaleString()} riders/hr. Failure probability {(forecast.failure_rate * 100).toFixed(1)}%.
                    </p>
                  </div>
                  <div className="card">
                    <h3>Peak Hours</h3>
                    <ul className="ride-card__list" style={{paddingLeft:18, margin:0}}>
                      {forecast.hourly_breakdown
                        .slice()
                        .sort((a,b)=>b.expected_boardings - a.expected_boardings)
                        .slice(0,4)
                        .map(hour => (
                          <li key={hour.hour}>
                            {formatHour(hour.hour)} – {hour.expected_boardings.toLocaleString()} riders (est.)
                          </li>
                        ))}
                    </ul>
                  </div>
                </>
              )}
              <div className="card">
                <h3>Ride Tips</h3>
                <p className="text-sm text-gray-700">
                  For the smoothest experience, arrive within the first hour of park opening or use the mobile queue feature in the afternoon.
                </p>
              </div>
              <div className="card">
                <h3>Accessibility</h3>
                <p className="text-sm text-gray-700">
                  Accessible boarding options are available. Service animals may rest at the designated kennel near the loading zone.
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

function formatHour(hour){
  const h = hour % 24;
  const period = h >= 12 ? 'PM' : 'AM';
  const display = h % 12 || 12;
  return `${display}:00 ${period}`;
}

