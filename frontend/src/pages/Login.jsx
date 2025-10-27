import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    fetch('/api/employee/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        // For demo: just navigate
        navigate('/dashboard');
      })
      .catch(err => setError(err.message));
  }

  return (
    <div style={{ padding: '40px 20px' }}>
      <h2>Employee Login</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <label>Email: <input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label><br/><br/>
        <button type="submit">Log in</button>
      </form>
    </div>
  );
}
