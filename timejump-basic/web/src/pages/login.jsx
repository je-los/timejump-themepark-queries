import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { login, signup } from '../auth.js';
import { useAuth } from '../context/authcontext.jsx';
import { queueAuthToast } from '../hooks/useauthtoast.js';

const AUTH_TOAST_KEY = 'tj-auth-toast';

function queueAuthWelcomeToast() {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  window.sessionStorage.setItem(AUTH_TOAST_KEY, 'welcome');
}

export default function LoginPage() {
  const { user, refresh } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [statusTone, setStatusTone] = useState('error');
  const [busy, setBusy] = useState(false);

  const redirectTo = useMemo(() => {
    const redirectParam = searchParams.get('redirect');
    return redirectParam && redirectParam.startsWith('/') ? redirectParam : '/';
  }, [searchParams]);

  const mode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';

  useEffect(() => {
    if (user) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, redirectTo, navigate]);

  function switchMode(nextMode) {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      if (nextMode === 'signup') params.set('mode', 'signup');
      else params.delete('mode');
      if (redirectTo && redirectTo !== '/') params.set('redirect', redirectTo);
      else params.delete('redirect');
      return params;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');
    if (!email || !password) {
      setStatusTone('error');
      setStatus('Please provide both email and password.');
      return;
    }
    setBusy(true);
    setStatus('');
    try {
      if (mode === 'signup') {
        await signup(email, password);
      } else {
        await login(email, password);
      }
      queueAuthToast('in');
      await refresh();
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setStatusTone('error');
      setStatus(err?.message || 'Unable to complete request.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="page-box page-box--narrow auth-page">
        <header className="auth-page__header">
          <h1>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
          <p className="muted">
            {mode === 'signup'
              ? 'Register as a customer to purchase tickets and manage your visits.'
              : 'Sign in with the email and password you used when creating your account.'}
          </p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit}>
          {status && (
            <div className={`alert ${statusTone === 'error' ? 'error' : 'info'}`}>
              {status}
            </div>
          )}

          <label className="field">
            <span>Email</span>
            <input
              className="input"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              className="input"
              name="password"
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              minLength={6}
              required
            />
          </label>

          <button className="btn primary w-full" type="submit" disabled={busy}>
            {busy ? 'Please wait...' : mode === 'signup' ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <footer className="auth-page__footer">
          {mode === 'signup' ? (
            <p>
              Already have an account?{' '}
              <button type="button" className="link-button" onClick={() => switchMode('login')}>
                Sign in
              </button>
            </p>
          ) : (
            <p>
              New here?{' '}
              <button type="button" className="link-button" onClick={() => switchMode('signup')}>
                Create an account
              </button>
            </p>
          )}
          <p className="auth-page__back">
            <Link to={redirectTo && redirectTo !== '/' ? redirectTo : '/'}>
              {'<'} Back to site
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
