import React, { useEffect, useState } from 'react';
import { api } from '../auth';
import { useAuth } from '../context/authcontext.jsx';
import RequireRole from '../components/requirerole.jsx';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return '--';
  const raw = String(value);
  const datePart = raw.includes('T') ? raw.split('T')[0] : raw;
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const date = new Date(`${datePart}T00:00:00`);
    if (!Number.isNaN(date.getTime())) return date.toLocaleDateString();
  }
  const fallback = new Date(raw);
  if (!Number.isNaN(fallback.getTime())) return fallback.toLocaleDateString();
  return raw;
}

export default function ManagerRideCancellations() {
  const { user } = useAuth();
  const [cancellations, setCancellations] = useState([]);
  const [attractions, setAttractions] = useState([]);
  const [form, setForm] = useState({ attractionId: '', cancelDate: todayISO(), reason: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const [attrsRes, cancRes] = await Promise.all([
        api('/attractions').catch(() => ({ data: [] })),
        api('/ride-cancellations?limit=200').catch(() => ({ data: [] })),
      ]);
      setAttractions(Array.isArray(attrsRes?.data) ? attrsRes.data : []);
      setCancellations(Array.isArray(cancRes?.data) ? cancRes.data : []);
    } catch (e) {
      setError(e?.message || 'Failed to load data.');
    }
  }

  async function logCancellation(e) {
    e.preventDefault();
    if (saving) return;
    if (!form.attractionId || !form.reason.trim()) {
      setError('Select attraction and reason.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api('/ride-cancellations', {
        method: 'POST',
        body: JSON.stringify({ attractionId: Number(form.attractionId), cancelDate: form.cancelDate, reason: form.reason.trim() }),
      });
      setMessage('Ride cancellation recorded.');
      setForm({ attractionId: '', cancelDate: todayISO(), reason: '' });
      await load();
    } catch (err) {
      setError(err?.message || 'Unable to log cancellation.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <RequireRole roles={["manager", "admin", "owner"]} fallback={<div className="page"><div className="panel">Managers or higher only.</div></div>}>
      <div className="container">
        <div className="panel">
          <h1>Ride Cancellations</h1>
          <p>Log ride cancellations for managers.</p>
          <form className="manager-form" onSubmit={logCancellation} style={{ marginBottom: 16 }}>
            <div className="field">
              <span>Attraction</span>
              <select className="border rounded-xl p-2" value={form.attractionId} onChange={e => setForm(f => ({ ...f, attractionId: e.target.value }))}>
                <option value="">Select attraction...</option>
                {attractions.map(opt => (
                  <option key={opt.AttractionID ?? opt.id} value={opt.AttractionID ?? opt.id}>{opt.Name ?? opt.name}</option>
                ))}
              </select>
            </div>
            <div className="manager-form__row">
              <label className="field" style={{ flex: 1, minWidth: 160 }}>
                <span>Date</span>
                <input className="input" type="date" value={form.cancelDate} onChange={e => setForm(f => ({ ...f, cancelDate: e.target.value }))} />
              </label>
              <label className="field" style={{ flex: 2 }}>
                <span>Reason</span>
                <input className="input" type="text" placeholder="e.g. Thunderstorm, lightning advisory..." value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
              </label>
            </div>
            <div className="manager-form__actions">
              <button className="btn primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Log Cancellation'}</button>
              {message && <div className="text-sm text-green-700">{message}</div>}
              {error && <div className="text-sm text-red-700">{error}</div>}
            </div>
          </form>

          <div className="manager-cancel-list">
            {!cancellations.length && <div className="text-sm text-gray-700">No cancellations logged yet.</div>}
            {!!cancellations.length && (
              <table className="manager-table">
                <thead>
                  <tr>
                    <th>Attraction</th>
                    <th>Date</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {cancellations.map(row => (
                    <tr key={row.cancel_id}>
                      <td>{row.attraction_name || `#${row.attraction_id}`}</td>
                      <td>{formatDate(row.cancel_date)}</td>
                      <td>{row.reason || '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </RequireRole>
  );
}
