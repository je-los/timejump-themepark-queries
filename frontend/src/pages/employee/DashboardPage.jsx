import { useAuth } from '../../context/AuthContext.jsx'
import { Link } from 'react-router-dom'

export default function DashboardPage() {
  const { user } = useAuth()
  return (
    <section className="card">
      <h2>Employee Dashboard</h2>
      <p className="muted">Welcome, {user?.name || user?.email || 'Employee'}.</p>
      <div style={{display:'flex', gap:'12px', marginTop:'12px'}}>
        <Link className="btn" to="/employee/schedule">View Schedule</Link>
        <Link className="btn" to="/employee/maintenance">Maintenance</Link>
        <Link className="btn" to="/employee/visitors">Visitor Lookup</Link>
      </div>
    </section>
  )
}
