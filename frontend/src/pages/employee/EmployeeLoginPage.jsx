import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import LoginForm from '../../components/LoginForm.jsx'

export default function EmployeeLoginPage() {
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const nav = useNavigate()

  const onSubmit = async (email, password) => {
    setLoading(true); setError(null)
    try {
      await login(email, password)
      nav('/employee/dashboard')
    } catch (e) {
      setError('Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <LoginForm onSubmit={onSubmit} loading={loading} />
      {error && <p className="muted">{error}</p>}
    </section>
  )
}
