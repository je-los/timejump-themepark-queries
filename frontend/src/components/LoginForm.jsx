import { useState } from 'react'

export default function LoginForm({ onSubmit, loading }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const submit = (e) => {
    e.preventDefault()
    onSubmit(email, password)
  }

  return (
    <form onSubmit={submit} className="card">
      <h3>Employee Login</h3>
      <div>
        <label>Email</label>
        <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="name@timejump.com" />
      </div>
      <div>
        <label>Password</label>
        <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
      </div>
      <button className="btn" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
    </form>
  )
}
