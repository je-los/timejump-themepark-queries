import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

export default function AttractionDetails(){
  const { id } = useParams()
  const [ride, setRide] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(()=>{
    fetch('/api/attractions') // simple re-use; if you add /api/attractions/:id, switch to that
      .then(r => r.json())
      .then(list => setRide(list.find(x => String(x.AttractionID) === id) || null))
      .catch(e => setErr(e.message))
  }, [id])

  if (err) return <div className="container section"><p>Error: {err}</p></div>
  if (!ride) return <div className="container section"><p>Loading…</p></div>

  const img = `/assets/rides/${ride.AttractionID}.jpg`
  return (
    <div className="section">
      <div className="container" style={{display:'grid',gridTemplateColumns:'1.3fr .7fr', gap:24}}>
        <img src={img} alt={ride.Name} style={{width:'100%', borderRadius:12}}/>
        <div>
          <h2 style={{marginTop:0}}>{ride.Name}</h2>
          <p><strong>Type:</strong> {ride.Type || 'Attraction'}</p>
          <p><strong>Theme:</strong> {ride.Theme || 'Theme'}</p>
          <p><strong>Min Height:</strong> {ride.HeightRestriction}"</p>
          <p><strong>Riders per vehicle:</strong> {ride.RidersPerVehicle}</p>
          <div style={{marginTop:16}}>
            <a className="btn btn-primary" href="/tickets">Buy Tickets</a>
          </div>
        </div>
      </div>
    </div>
  )
}
