import { useEffect, useState } from 'react'
import api from '../../api/api.js'

export default function MaintenanceLoggingPage() {
  const [list, setList] = useState([])
  const [form, setForm] = useState({ AttractionID: '', Issue_reported: '', Severity_of_report: 'low', type_of_maintenance: 'inspection' })
  const [status, setStatus] = useState(null)

  const load = async () => {
    const res = await api.get('/maintenance-records')
    setList(res.data || [])
  }

  useEffect(() => { load() }, [])

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setStatus('Submitting…')
    try {
      await api.post('/maintenance-records', form)
      setStatus('Logged!')
      setForm({ AttractionID: '', Issue_reported: '', Severity_of_report: 'low', type_of_maintenance: 'inspection' })
      await load()
    } catch (e) {
      setStatus('Error: could not log maintenance.')
    }
  }

  return (
    <section>
      <h2>Maintenance</h2>
      <form onSubmit={submit} className="card">
        <div>
          <label>AttractionID</label>
          <input name="AttractionID" value={form.AttractionID} onChange={onChange} />
        </div>
        <div>
          <label>Issue</label>
          <textarea name="Issue_reported" value={form.Issue_reported} onChange={onChange} />
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
          <div>
            <label>Severity</label>
            <select name="Severity_of_report" value={form.Severity_of_report} onChange={onChange}>
              <option>low</option><option>medium</option><option>high</option><option>critical</option>
            </select>
          </div>
          <div>
            <label>Type</label>
            <select name="type_of_maintenance" value={form.type_of_maintenance} onChange={onChange}>
              <option>inspection</option><option>repair</option><option>cleaning</option><option>software</option><option>calibration</option><option>emergency</option>
            </select>
          </div>
        </div>
        <button className="btn" type="submit">Log</button>
        {status && <p className="muted">{status}</p>}
      </form>

      <div className="grid" style={{marginTop: '16px'}}>
        {list.map(m => (
          <div key={m.RecordID} className="card">
            <h4>Record #{m.RecordID}</h4>
            <p>Attraction: {m.AttractionID}</p>
            <p>Issue: {m.Issue_reported}</p>
            <p>Severity: {m.Severity_of_report}</p>
            <p>Type: {m.type_of_maintenance}</p>
            <p>Date broken: {m.Date_broken_down?.slice(0,10)}</p>
            {m.Date_fixed && <p>Fixed: {m.Date_fixed?.slice(0,10)}</p>}
          </div>
        ))}
      </div>
    </section>
  )
}
