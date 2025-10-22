import React, { useState } from 'react';

export default function LoginModal({ initialMode='login', onClose }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'signup'
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');

  async function submit(e){
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try{
      // Hook up to your backend later; for now, just close on “success”
      onClose();
    }catch(err){
      setError(err?.message || 'Failed');
    }finally{
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal auth-modal" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <h3>{mode==='signup' ? 'Create Account' : 'Login'}</h3>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        <form className="modal-body" onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:10}}>
          {error && <div className="alert error">{error}</div>}
          <label className="field">
            <span>Email</span>
            <input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
          </label>
          <label className="field">
            <span>Password</span>
            <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
          </label>
          <button className="btn primary w-full" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : (mode==='signup' ? 'Sign Up' : 'Login')}
          </button>
          <div className="switchline">
            {mode==='signup' ? (
              <>Already have an account?{' '}
                <a href="#" onClick={(e)=>{e.preventDefault(); setMode('login');}}>Login</a>
              </>
            ) : (
              <>New here?{' '}
                <a href="#" onClick={(e)=>{e.preventDefault(); setMode('signup');}}>Create one</a>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
