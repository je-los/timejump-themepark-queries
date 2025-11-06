import React, { useEffect, useState } from 'react';
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
  const isCustomer = user?.role === 'customer';

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
              <h2 style={{ margin: 0 }}>Ticket History</h2>
              <span className="muted" style={{ fontSize: 12 }}>
                Latest 200 purchases
              </span>
            </div>
            {historyLoading && <div className="muted">Loading history…</div>}
            {!historyLoading && orders.length === 0 && (
              <div className="muted" style={{ fontSize: 14 }}>
                You have not purchased any tickets yet.
              </div>
            )}
            {!historyLoading && orders.length > 0 && (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Type</th>
                      <th>Quantity</th>
                      <th>Price</th>
                      <th>Purchased</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order.purchase_id}>
                        <td>{order.item_name}</td>
                        <td>{order.item_type}</td>
                        <td>{order.quantity}</td>
                        <td>${Number(order.price || 0).toFixed(2)}</td>
                        <td>{formatDateTime(order.created_at)}</td>
                      </tr>
                    ))}
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
  return date.toLocaleString();
}
