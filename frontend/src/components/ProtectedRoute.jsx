import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function ProtectedRoute() {
  const { user } = useAuth()
  if (!user || user.role !== 'employee') {
    return <Navigate to="/employee/login" replace />
  }
  return <Outlet />
}
