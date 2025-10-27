import { useState } from 'react'
import api from '../../api/api.js'

export default function VisitorLookupPage() {
  const [q, setQ] = useState('')
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState(null)

  const search = async (e) => {
    e.preventDefault()
    setStatus('Searching…')
    try {
      const res = await api.get('/visitors', { params: { q } })
      setResult(res.data || null)
      setStatus(null)
    } catch (e) {
      setStatus('Not found')
      setResult(null)
    }
  }

  return (
    <section>
      <h2>Visitor Lookup</h2>
      <form onSubmit={search} className="card">
        <label>Search by TicketID or Email</label>
        <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="e.g. 10000001 or jane@doe.com" />
        <button className="btn" type="submit">Search</button>
        {status && <p className="muted">{status}</p>}
      </form>
      {result && (
        <div className="card" style={{marginTop:'16px'}}>
          <h3>Visitor</h3>
          <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </section>
  )
}
