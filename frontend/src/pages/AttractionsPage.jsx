import { useEffect, useState } from 'react'
import api from '../api/api.js'
import AttractionCard from '../components/AttractionCard.jsx'

export default function AttractionsPage() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/attractions')
        setList(res.data || [])
      } catch (e) {
        setError('Failed to load attractions')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <p>Loading…</p>
  if (error) return <p>{error}</p>

  return (
    <section>
      <h2>Attractions</h2>
      <div className="grid">
        {list.map((a) => <AttractionCard key={a.AttractionID} a={a} />)}
      </div>
    </section>
  )
}
