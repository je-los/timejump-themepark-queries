import React, { useEffect, useMemo, useState } from 'react'
import RideCard from '../components/RideCard'
import './Attractions.css'

export default function Attractions(){
  const [rides, setRides] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // UI state
  const [query, setQuery] = useState('')
  const [type, setType]   = useState('All')
  const [sort, setSort]   = useState('name-asc')

  useEffect(()=>{
    setLoading(true)
    fetch('/api/attractions')
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data => { setRides(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  },[])

  const types = useMemo(()=>{
    const set = new Set(rides.map(r=>r.Type).filter(Boolean))
    return ['All', ...Array.from(set)]
  },[rides])

  const filtered = useMemo(()=>{
    let list = rides
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(r => r.Name.toLowerCase().includes(q) || (r.Type||'').toLowerCase().includes(q))
    }
    if (type !== 'All') {
      list = list.filter(r => r.Type === type)
    }
    switch (sort) {
      case 'name-asc':  list = [...list].sort((a,b)=>a.Name.localeCompare(b.Name)); break
      case 'name-desc': list = [...list].sort((a,b)=>b.Name.localeCompare(a.Name)); break
      case 'height-desc': list=[...list].sort((a,b)=>(b.HeightRestriction||0)-(a.HeightRestriction||0)); break
      case 'height-asc':  list=[...list].sort((a,b)=>(a.HeightRestriction||0)-(b.HeightRestriction||0)); break
      default: break
    }
    return list
  }, [rides, query, type, sort])

  if (loading) return <div className="container section"><p>Loading attractions…</p></div>
  if (error)   return <div className="container section"><p style={{color:'salmon'}}>Error: {error}</p></div>

  return (
    <div className="section">
      <div className="container">
        <header className="atx-header">
          <h2>Attractions</h2>
          <div className="atx-controls">
            <input
              className="atx-input"
              placeholder="Search rides…"
              value={query}
              onChange={e=>setQuery(e.target.value)}
            />
            <select className="atx-select" value={type} onChange={e=>setType(e.target.value)}>
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="atx-select" value={sort} onChange={e=>setSort(e.target.value)}>
              <option value="name-asc">Name A–Z</option>
              <option value="name-desc">Name Z–A</option>
              <option value="height-desc">Height (high→low)</option>
              <option value="height-asc">Height (low→high)</option>
            </select>
          </div>
        </header>

        {filtered.length === 0 ? (
          <p style={{color:'var(--muted)'}}>No attractions match your filters.</p>
        ) : (
          <div className="atx-grid">
            {filtered.map(ride => <RideCard key={ride.AttractionID} ride={ride} />)}
          </div>
        )}
      </div>
    </div>
  )
}
