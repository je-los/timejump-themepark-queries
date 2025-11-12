import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../auth.js';
import { useAuth } from '../context/authcontext.jsx';

export default function Account() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({ full_name: '', phone: '' });
  const [form, setForm] = useState({ full_name: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [statusTone, setStatusTone] = useState('info');
  const [orders, setOrders] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [hoursWorked, setHoursWorked] = useState(0);
  const isCustomer = user?.role === 'customer';
  const isEmployee = useMemo(() => ['employee', 'manager'].includes(user?.role) && (user?.EmployeeID || user?.employeeID), [user]);
  const biweeklyDateRange = useMemo(() => {
    if (!isEmployee) return '';
    const today = new Date();
    const priorDate = new Date(new Date().setDate(today.getDate() - 13));
    const options = { month: 'short', day: 'numeric' };
    return `${priorDate.toLocaleDateString(undefined, options)} - ${today.toLocaleDateString(undefined, options)}`;
  }, [isEmployee]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    api('/profile/me')
      .then(res => {
        if (cancelled) return;
        const data = res?.profile || { full_name: '', phone: '' };
        setProfile(data);
        setForm({
          full_name: data.full_name || '',
          phone: data.phone || '',
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

  useEffect(() => {
    if (!isEmployee) return;
    let cancelled = false;
    api('/schedules/hours').then(res => {
      if (!cancelled) setHoursWorked(res.data?.total_hours ?? 0);
    }).catch(() => {
      if (!cancelled) setHoursWorked(0);
    });
  }, [isEmployee]);

  async function handleSave(e) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setStatus('');
    try {
      const payload = {
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
      };
      const res = await api('/profile/me', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setProfile(res?.profile || payload);
      setStatusTone('success');
      setStatus('Profile updated.');
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
          
          {isEmployee && hoursWorked !== null && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ marginTop: 0, marginBottom: 4, fontSize: '1rem' }}>Hours Worked</h3>
              <div className="muted" style={{ fontSize: '0.75rem', marginBottom: 4 }}>
                {biweeklyDateRange}
              </div>
              <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
                {hoursWorked} <span style={{ fontSize: '1rem', fontWeight: 400, color: '#666' }}>hours</span>
              </p>
            </div>
          )}
        </section>

        <section className="panel">
          <h2 style={{ marginTop: 0 }}>Profile Details</h2>
          {loading && <div className="muted">Loading profile…</div>}
          {!loading && (
            <form className="account-form" onSubmit={handleSave}>
              <label className="field">
                <span>Full name</span>
                <input
                  className="input"
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="Add your name"
                />
              </label>
              <label className="field">
                <span>Phone</span>
                <input
                  className="input"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                />
              </label>
              <button className="btn primary" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
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

function formatDate(value) {
  if (!value) return 'Date TBD';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function formatTime(value) {
  if (!value) return '—';
  if (typeof value === 'string' && value.includes(':')) {
    const [h, m] = value.split(':');
    const date = new Date();
    date.setHours(Number(h), Number(m || 0));
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return String(value);
}

