import React, { useEffect, useState } from 'react';
import { api } from '../../../auth';
import { useAuth } from '../../../context/authcontext.jsx';
import { Panel, TableList } from '../shared.jsx';

function formatDateOnly(value) {
  if (!value) return '--';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function createEmptyForm() {
  return { attractionId: '', cancelDate: '', reason: '' };
}

export default function RideCancellationsAdmin() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [attractions, setAttractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(() => createEmptyForm());
  const [status, setStatus] = useState('');

  useEffect(() => {
    loadAttractions();
    loadRecords();
  }, []);

  async function loadAttractions() {
    try {
      const res = await api('/attractions');
      const rows = Array.isArray(res?.data) ? res.data : res?.attractions || [];
      setAttractions(rows);
    } catch (e) {
      // ignore
    }
  }

  async function loadRecords() {
    setLoading(true);
    setError('');
    try {
      const res = await api('/ride-cancellations?limit=200');
      const rows = Array.isArray(res?.data) ? res.data : [];
      setRecords(rows);
    } catch (err) {
      setError(err?.message || 'Failed to load cancellations.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    const attractionId = Number(form.attractionId);
    if (!attractionId || !form.reason.trim()) {
      setError('Select an attraction and provide a reason.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api('/ride-cancellations', {
        method: 'POST',
        body: JSON.stringify({ attractionId, cancelDate: form.cancelDate || undefined, reason: form.reason.trim() }),
      });
      setStatus('Ride cancellation recorded.');
      setForm(createEmptyForm());
      await loadRecords();
    } catch (err) {
      setError(err?.message || 'Unable to save cancellation.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-maintenance">
      <div className="admin-maintenance__layout">
        <Panel className="admin-maintenance__panel">
          <h3 style={{ marginTop: 0 }}>Log Ride Cancellation</h3>
          <form className="admin-form-grid" onSubmit={handleSubmit}>
            <label className="field">
              <span>Attraction</span>
              <select className="input" value={form.attractionId} onChange={e => setForm(f => ({ ...f, attractionId: e.target.value }))}>
                <option value="">Select attraction...</option>
                {attractions.map(a => (
                  <option key={a.AttractionID ?? a.id} value={a.AttractionID ?? a.id}>{a.Name ?? a.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Date</span>
              <input className="input" type="date" value={form.cancelDate} onChange={e => setForm(f => ({ ...f, cancelDate: e.target.value }))} />
            </label>
            <label className="field" style={{ gridColumn: '1 / -1' }}>
              <span>Reason</span>
              <input className="input" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Log Cancellation'}</button>
              {status && <div className="alert success">{status}</div>}
              {error && <div className="alert error">{error}</div>}
            </div>
          </form>
        </Panel>

        <Panel className="admin-maintenance__panel">
          <h3 style={{ marginTop: 0 }}>Recent Ride Cancellations</h3>
          {loading && <div className="text-sm text-gray-600">Loading...</div>}
          {!loading && error && <div className="alert error">{error}</div>}
          {!loading && !error && (
            <TableList
              rows={records}
              columns={[
                { key: 'attraction_name', label: 'Attraction' },
                { key: 'cancel_date', label: 'Date', render: v => formatDateOnly(v) },
                { key: 'reason', label: 'Reason' },
              ]}
              emptyMessage="No cancellations logged yet."
            />
          )}
        </Panel>
      </div>
    </div>
  );
}
