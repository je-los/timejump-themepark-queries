import { useEffect, useState } from 'react'
import api from '../../api/api.js'

export default function ScheduleManagementPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/schedules')
        setRows(res.data || [])
      } catch (e) {
        setError('Failed to load schedules')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <p>Loading…</p>
  if (error) return <p>{error}</p>

  return (
    <section>
      <h2>Schedules</h2>
      <div className="card">
        <table>
          <thead>
            <tr><th>Date</th><th>Start</th><th>End</th><th>AttractionID</th><th>EmployeeID</th></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.ScheduleID}>
                <td>{r.Shift_date?.slice(0,10)}</td>
                <td>{r.Start_time}</td>
                <td>{r.End_time}</td>
                <td>{r.AttractionID}</td>
                <td>{r.EmployeeID}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
