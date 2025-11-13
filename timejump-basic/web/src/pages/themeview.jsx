import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function ThemeView() {
  const { slug } = useParams();
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

  const hasData = !loading && !error && theme;
  const heroStyle = useMemo(() => {
    if (!theme) return undefined;
    const overrides = {
      'medieval-fantasy-zone': 'https://i.imgur.com/kd2HUy7.jpeg',
      'nova-crest-zone': 'https://i.imgur.com/Ip9FcpA.png',
      'wild-west-zone': 'https://i.imgur.com/MpTHGUm.jpeg',
    };
    const match = overrides[theme.slug];
    return match ? { '--theme-hero-image': `url(${match})` } : undefined;
  }, [theme]);
  return (
    <div className="page theme-page">
      {loading && (
        <div className="page-box page-box--wide">
          <p className="text-sm text-gray-600">Loading attractions...</p>
        </div>
      )}
      {error && !loading && (
        <div className="page-box page-box--wide">
          <p className="alert error">{error}</p>
        </div>
      )}
      {hasData && (
        <>
          <section
            className="theme-detail__hero"
            aria-label="Featured realm highlight"
            style={heroStyle}
          >
            <div className="theme-detail__copy">
              <p className="theme-detail__eyebrow">Featured realm</p>
              <h1>{theme.name}</h1>
              {theme.description && <p className="theme-detail__description">{theme.description}</p>}
              <p className="theme-detail__meta">
                {(theme.rides || []).length} attractions in this land.
              </p>
            </div>
          </section>

          <div className="page-box page-box--wide theme-page__grid">
            <div className="ride-grid ride-grid--detail">
              {(theme.rides || []).map(ride=>{
                const capacityPerExperience = ride.capacity_per_experience
                  ?? ride.capacity
                  ?? ride.riders_per_vehicle
                  ?? ride.RidersPerVehicle
                  ?? ride.details?.RidersPerVehicle
                  ?? null;
                const typeLabel = ride.type || ride.TypeName || 'Attraction';
                const audience = ride.target_audience ?? ride.audience ?? null;
                const thrill = ride.experience_level ?? ride.thrill_level ?? ride.type_description ?? ride.type;
                const duration = ride.duration_minutes ?? ride.duration ?? null;
                const statusName = (ride.status_name || '').toLowerCase();
                const derivedClosed = statusName ? statusName !== 'active' : false;
                const isMaintenance = statusName === 'closed_for_maintenance';
                const isClosed = ride.is_closed ?? derivedClosed;
                const statusClass = isMaintenance
                  ? 'ride-status--maintenance'
                  : isClosed
                    ? 'ride-status--closed'
                    : 'ride-status--open';
                const statusLabel = ride.status_label
                  || (isMaintenance ? 'Closed for Maintenance' : isClosed ? 'Closed' : 'Open');
                const statusNote = ride.status_note || ride.maintenance_note || ride.closure_note || null;
                const description =
                  ride.description && ride.description.trim().toLowerCase() === 'seated or street performance with scheduled times.'
                    ? ''
                    : ride.description;
                return (
                  <article key={ride.slug || ride.id} className="ride-card ride-card--theme">
                    <header className="ride-card__header">
                      <h2>{ride.name}</h2>
                      <span className={`ride-status ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </header>
                    {isClosed && statusNote && (
                      <p className={`ride-status__note ${isMaintenance ? 'ride-status__note--maintenance' : ''}`}>
                        {statusNote}
                      </p>
                    )}
                    <div className="ride-card__meta">
                      {typeLabel && <span className="ride-card__chip">{typeLabel}</span>}
                      {thrill && <span className="ride-card__chip ride-card__chip--accent">{thrill}</span>}
                    </div>
                    {ride.image_url && (
                      <div className="ride-card__media" style={{ backgroundImage: `url(${ride.image_url})` }} />
                    )}
                    {description && (
                      <p className="ride-card__body">
                        {description}
                      </p>
                    )}
                    <div className="ride-card__stats">
                      {capacityPerExperience !== undefined && capacityPerExperience !== null && (
                        <div>
                          <strong>{capacityPerExperience.toLocaleString()}</strong>
                          <span className="ride-card__stat-label">Capacity</span>
                        </div>
                      )}
                      {audience && (
                        <div>
                          <strong>{audience}</strong>
                          <span className="ride-card__stat-label">Audience</span>
                        </div>
                      )}
                      {duration && (
                        <div>
                          <strong>{duration} min</strong>
                          <span className="ride-card__stat-label">Duration</span>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </>
      )}
      {!loading && !error && !theme && (
        <div className="page-box page-box--wide">
          <p className="text-sm text-gray-600">Theme not found.</p>
        </div>
      )}
    </div>
  );
}
