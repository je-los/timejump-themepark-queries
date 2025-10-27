import { useEffect, useState } from 'react'
import api from '../api/api.js'

export default function ParkingPage() {
  const [lots, setLots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/parking')
        setLots(res.data || [])
      } catch (e) {
        setError('Failed to load parking')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <p>Loading…</p>
  if (error) return <p>{error}</p>

  return (
    <section>
      <h2>Parking Availability</h2>
      <div className="grid">
        {lots.map((l) => (
          <div key={l.parking_lot_name} className="card">
            <h3>{l.parking_lot_name}</h3>
            <p>Spaces: {l.total_spaces}</p>
            <p>Available: {l.available}</p>
            <p>Price: ${Number(l.parking_price).toFixed(2)}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
