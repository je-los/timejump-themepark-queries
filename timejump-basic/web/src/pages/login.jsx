import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { login, signup } from '../auth.js';
import { useAuth } from '../context/authcontext.jsx';
import { queueAuthToast } from '../hooks/useauthtoast.js';

function formatPhoneDisplay(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 10);
  if (!digits) return '';
  if (digits.length < 4) return `(${digits}`;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function formatPhoneFixed(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 10) return null;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function LoginPage() {
  const { user, refresh } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [statusTone, setStatusTone] = useState('error');
  const [busy, setBusy] = useState(false);
  const [signupPhone, setSignupPhone] = useState('');

  const redirectTo = useMemo(() => {
    const redirectParam = searchParams.get('redirect');
    return redirectParam && redirectParam.startsWith('/') ? redirectParam : '/';
  }, [searchParams]);

  const mode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';

  useEffect(() => {
    if (mode !== 'signup') {
      setSignupPhone('');
    }
  }, [mode]);

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
        const firstName = String(formData.get('firstName') || '').trim();
        const lastName = String(formData.get('lastName') || '').trim();
        const dateOfBirth = String(formData.get('dateOfBirth') || '').trim();
        const phone = formatPhoneFixed(signupPhone);
        if (!firstName || !lastName || !dateOfBirth || !phone) {
          setStatusTone('error');
          setStatus('First name, last name, date of birth, and a valid 10-digit phone are required.');
          setBusy(false);
          return;
        }
        await signup({ email, password, firstName, lastName, dateOfBirth, phone });
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

          {mode === 'signup' && (
            <>
              <label className="field">
                <span>First name</span>
                <input
                  className="input"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  required={mode === 'signup'}
                  placeholder="First name"
                />
              </label>

              <label className="field">
                <span>Last name</span>
                <input
                  className="input"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  required={mode === 'signup'}
                  placeholder="Last name"
                />
              </label>

              <label className="field">
                <span>Date of birth</span>
                <input
                  className="input"
                  name="dateOfBirth"
                  type="date"
                  required={mode === 'signup'}
                />
              </label>

              <label className="field">
                <span>Phone number</span>
                <input
                  className="input"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={signupPhone}
                  onChange={e => setSignupPhone(formatPhoneDisplay(e.target.value))}
                  required={mode === 'signup'}
                  placeholder="(555) 123-4567"
                />
              </label>
            </>
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
