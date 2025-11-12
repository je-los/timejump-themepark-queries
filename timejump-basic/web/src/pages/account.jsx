import React, { useEffect, useState } from 'react';
import { api } from '../auth.js';
import { useAuth } from '../context/authcontext.jsx';

const emptyProfile = {
  first_name: '',
  last_name: '',
  date_of_birth: '',
  phone: '',
};

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

export default function Account() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(emptyProfile);
  const [form, setForm] = useState(emptyProfile);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [statusTone, setStatusTone] = useState('info');
  const [orders, setOrders] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const isCustomer = user?.role === 'customer';
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    api('/profile/me')
      .then(res => {
        if (cancelled) return;
        const data = res?.profile || emptyProfile;
        setProfile(data);
        setForm({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone: formatPhoneDisplay(data.phone || ''),
          date_of_birth: data.date_of_birth || '',
        });
      })
      .catch(err => {
        if (cancelled) return;
        setStatus(err?.message || 'Unable to load your profile right now.');
        setStatusTone('error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user || !isCustomer) return;
    let cancelled = false;
    setHistoryLoading(true);
    api('/orders/me')
      .then(res => {
        if (cancelled) return;
        setOrders(Array.isArray(res?.data) ? res.data : []);
      })
      .catch(() => {
        if (cancelled) return;
        setOrders([]);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, isCustomer]);

  async function handleSave(e) {
    e.preventDefault();
    if (!user || !editing) return;
    setSaving(true);
    setStatus('');
    try {
      const formattedPhone = formatPhoneFixed(form.phone);
      if (!formattedPhone) {
        setStatusTone('error');
        setStatus('Phone number must include 10 digits (e.g., (555) 123-4567).');
        setSaving(false);
        return;
      }
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: formattedPhone,
        date_of_birth: form.date_of_birth || '',
      };
      const res = await api('/profile/me', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      const updated = res?.profile || payload;
      setProfile({
        first_name: updated.first_name || '',
        last_name: updated.last_name || '',
        phone: updated.phone || '',
        date_of_birth: updated.date_of_birth || '',
      });
      setStatusTone('success');
      setStatus('Profile updated.');
      setEditing(false);
    } catch (err) {
      setStatusTone('error');
      setStatus(err?.message || 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <div className="page">
        <div className="page-box">
          <h1>Account</h1>
          <p>Please sign in to view your account and ticket history.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-box page-box--wide" style={{ display: 'grid', gap: 24 }}>
        <section className="panel">
          <h1 style={{ marginTop: 0 }}>Account Overview</h1>
          <div className="muted" style={{ fontSize: 14 }}>
            Signed in as <strong>{user.email || '—'}</strong> ({user.role})
          </div>
        </section>

        <section className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <h2 style={{ marginTop: 0 }}>Profile Details</h2>
            {!loading && (
              <div className="account-actions" style={{ display: 'flex', gap: 8 }}>
                {!editing ? (
                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      setForm({
                        first_name: profile.first_name || '',
                        last_name: profile.last_name || '',
                        phone: formatPhoneDisplay(profile.phone) || '',
                        date_of_birth: profile.date_of_birth || '',
                      });
                      setStatus('');
                      setStatusTone('info');
                      setEditing(true);
                    }}
                  >
                    Modify
                  </button>
                ) : (
                  <>
                    <button className="btn primary" form="profile-form" type="submit" disabled={saving}>
                      {saving ? 'Saving…' : 'Confirm'}
                    </button>
                    <button
                      className="btn"
                      type="button"
                      onClick={() => {
                      setForm({
                        first_name: profile.first_name || '',
                        last_name: profile.last_name || '',
                        phone: formatPhoneDisplay(profile.phone) || '',
                        date_of_birth: profile.date_of_birth || '',
                      });
                      setStatus('');
                      setStatusTone('info');
                      setEditing(false);
                    }}
                  >
                    Cancel
                  </button>
                  </>
                )}
              </div>
            )}
          </div>
          {loading && <div className="muted">Loading profile…</div>}
          {!loading && (
            <form className="account-form" id="profile-form" onSubmit={handleSave}>
              <label className="field">
                <span>First name</span>
                <input
                  className="input"
                  value={form.first_name}
                  onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                  disabled={!editing}
                  placeholder="First name"
                />
              </label>
              <label className="field">
                <span>Last name</span>
                <input
                  className="input"
                  value={form.last_name}
                  onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                  disabled={!editing}
                  placeholder="Last name"
                />
              </label>
              <label className="field">
                <span>Phone</span>
                <input
                  className="input"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: formatPhoneDisplay(e.target.value) }))}
                  disabled={!editing}
                  placeholder="(555) 123-4567"
                />
              </label>
              <label className="field">
                <span>Date of birth</span>
                <input
                  className="input"
                  type="date"
                  value={profile.date_of_birth || ''}
                  readOnly
                  disabled
                />
              </label>
              {status && (
                <div
                  className={`alert ${
                    statusTone === 'success' ? 'success' : statusTone === 'error' ? 'error' : 'info'
                  }`}
                >
                  {status}
                </div>
              )}
            </form>
          )}
        </section>

        <section className="panel">
          <h2 style={{ marginTop: 0 }}>Password</h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            Update your password to keep your account secure.
          </p>
          <PasswordForm />
        </section>

        {isCustomer && (
          <section className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
              <h2 style={{ margin: 0 }}>Purchase History</h2>
              <span className="muted" style={{ fontSize: 12 }}>
                Latest 200 orders (tickets, parking, dining, gifts)
              </span>
            </div>
            {historyLoading && <div className="muted">Loading history…</div>}
            {!historyLoading && orders.length === 0 && (
              <div className="muted" style={{ fontSize: 14 }}>
                You have not completed any purchases yet.
              </div>
            )}
            {!historyLoading && orders.length > 0 && (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Type</th>
                      <th>Visit Date</th>
                      <th>Quantity</th>
                      <th>Price</th>
                      <th>Purchased</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => {
                      const visitValue = order.visit_date || order.details?.visitDate;
                      return (
                      <tr key={order.purchase_id}>
                        <td>{order.item_name}</td>
                        <td>{order.item_type}</td>
                        <td>{formatVisitDate(visitValue)}</td>
                        <td>{order.quantity}</td>
                        <td>${Number(order.price || 0).toFixed(2)}</td>
                        <td>{formatDateTime(order.created_at)}</td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function PasswordForm() {
  const [current, setCurrent] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [tone, setTone] = useState('info');

  async function handlePasswordChange(e) {
    e.preventDefault();
    if (busy) return;
    if (!current || !nextPassword) {
      setTone('error');
      setStatus('Current and new password are required.');
      return;
    }
    if (nextPassword !== confirm) {
      setTone('error');
      setStatus('New password and confirmation do not match.');
      return;
    }
    setBusy(true);
    setStatus('');
    try {
      await api('/profile/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: current,
          newPassword: nextPassword,
        }),
      });
      setTone('success');
      setStatus('Password updated successfully.');
      setCurrent('');
      setNextPassword('');
      setConfirm('');
    } catch (err) {
      setTone('error');
      setStatus(err?.message || 'Unable to update password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handlePasswordChange} className="account-form">
      <label className="field">
        <span>Current password</span>
        <input
          className="input"
          type="password"
          value={current}
          onChange={e => setCurrent(e.target.value)}
          autoComplete="current-password"
        />
      </label>
      <label className="field">
        <span>New password</span>
        <input
          className="input"
          type="password"
          value={nextPassword}
          onChange={e => setNextPassword(e.target.value)}
          autoComplete="new-password"
          minLength={6}
        />
      </label>
      <label className="field">
        <span>Confirm password</span>
        <input
          className="input"
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          autoComplete="new-password"
          minLength={6}
        />
      </label>
      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Update Password'}
        </button>
        <button
          className="btn"
          type="button"
          onClick={() => {
            setCurrent('');
            setNextPassword('');
            setConfirm('');
            setStatus('');
          }}
        >
          Cancel
        </button>
      </div>
      {status && (
        <div className={`alert ${tone === 'success' ? 'success' : tone === 'error' ? 'error' : 'info'}`}>
          {status}
        </div>
      )}
    </form>
  );
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function formatVisitDate(value) {
  if (!value) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString(undefined, { dateStyle: 'medium' });
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

