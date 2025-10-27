import React from 'react'
import './RideCard.css'

export default function RideCard({ ride }) {
  const img = `/assets/rides/${ride.AttractionID}.jpg`
  return (
    <article className="ride-card">
      <div className="ride-media">
        <img src={img} alt={ride.Name} onError={(e)=>{e.currentTarget.src='/assets/rides/placeholder.jpg'}}/>
        <div className="ride-overlay">
          <a className="btn btn-primary" href={`/attractions/${ride.AttractionID}`}>View Details</a>
        </div>
      </div>
      <div className="ride-body">
        <h3 className="ride-title">{ride.Name}</h3>
        <div className="ride-badges">
          <span className="badge badge-dark">{ride.Type || 'Attraction'}</span>
          <span className="badge badge-dark">{ride.Theme || 'Theme'}</span>
          <span className="tag">Min {ride.HeightRestriction}"</span>
          <span className="tag">{ride.RidersPerVehicle} / vehicle</span>
        </div>
      </div>
    </article>
  )
}
