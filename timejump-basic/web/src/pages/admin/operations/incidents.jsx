import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../../auth';
import { Panel, TableList } from '../shared.jsx';

export default function IncidentPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    type: '',
    employeeId: '',
    ticketId: '',
    occurredAt: '',
    location: '',
    severity: '',
    details: '',
  });

  const [types, setTypes] = useState([]);
  const [employees, setEmployees] = useState([]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api('/incidents');
      setRecords(res?.data || []);
    } catch (err) {
      setError(err?.message || 'Unable to load incidents.');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMetadata = useCallback(async () => {
    try {
      const [typeRes, employeeRes] = await Promise.all([
        api('/incidents/types').catch(() => ({ data: [] })),
        api('/employees').catch(() => ({ data: [] })),
      ]);
      setTypes((typeRes.data || []).map(item => ({
        id: item.id ?? item.code ?? item.type,
        name: item.label ?? item.name ?? item.type_name ?? item.type,
      })));
      setEmployees((employeeRes.data || []).map(item => ({
        id: item.employeeID ?? item.id,
        name: item.name ?? `${item.first_name ?? ''} ${item.last_name ?? ''}`.trim(),
      })));
    } catch {
      setTypes([]);
      setEmployees([]);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    if (!form.type) {
      setFormError('Incident type is required.');
      return;
    }
    if (!form.severity) {
      setFormError('Severity must be selected.');
      return;
    }
    if (!form.occurredAt) {
      setFormError('Occurred at is required.');
      return;
    }
    if (!form.location.trim()) {
      setFormError('Location is required.');
      return;
    }
    if (!form.details.trim()) {
      setFormError('Details are required.');
      return;
    }
    setSaving(true);
    setStatus('');
    setFormError('');
    try {
      await api('/incidents', {
        method: 'POST',
        body: JSON.stringify({
          type: form.type,
          employeeId: form.employeeId || null,
          ticketId: form.ticketId || null,
          occurredAt: form.occurredAt,
          location: form.location.trim(),
          severity: form.severity,
          details: form.details.trim(),
        }),
      });
      setStatus('Incident logged.');
      setForm({
        type: '',
        employeeId: '',
        ticketId: '',
        occurredAt: '',
        location: '',
        severity: '',
        details: '',
      });
      loadRecords();
    } catch (err) {
      setFormError(err?.message || 'Failed to log incident.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-incidents">
      <div className="admin-incidents__layout">
        <Panel className="admin-incidents__panel">
          <h3 style={{ marginTop: 0 }}>Log Incident</h3>
          <form className="admin-form-grid" onSubmit={handleSubmit}>
            <label className="field">
              <span>Incident type</span>
              <select
                className="input"
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                disabled={saving}
              >
                <option value="">Select type...</option>
                {types.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Reported by (optional)</span>
              <select
                className="input"
                value={form.employeeId}
                onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
                disabled={saving}
              >
                <option value="">Unassigned</option>
                {employees.map(employee => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name || employee.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Ticket ID (optional)</span>
              <input
                className="input"
                value={form.ticketId}
                onChange={e => setForm(f => ({ ...f, ticketId: e.target.value }))}
                placeholder="If a guest ticket is involved"
                disabled={saving}
              />
            </label>
            <label className="field">
              <span>Occurred at</span>
              <input
                className="input"
                type="datetime-local"
                value={form.occurredAt}
                onChange={e => setForm(f => ({ ...f, occurredAt: e.target.value }))}
                disabled={saving}
              />
            </label>
            <label className="field">
              <span>Location</span>
              <input
                className="input"
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="Zone or attraction"
                disabled={saving}
              />
            </label>
            <label className="field">
              <span>Severity</span>
              <select
                className="input"
                value={form.severity}
                onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                disabled={saving}
              >
                <option value="">Select severity...</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label className="field" style={{ gridColumn: '1 / -1' }}>
              <span>Details</span>
              <textarea
                className="input"
                rows={4}
                value={form.details}
                onChange={e => setForm(f => ({ ...f, details: e.target.value }))}
                placeholder="Describe what happened."
                disabled={saving}
              />
            </label>
            <button
              className="btn primary"
              type="submit"
              disabled={saving}
              style={{ justifySelf: 'flex-start', width: 'auto' }}
            >
              {saving ? 'Saving...' : 'Log Incident'}
            </button>
          </form>
          <div style={{ marginTop: 12 }}>
            {status && <div className="alert success">{status}</div>}
            {formError && <div className="alert error">{formError}</div>}
          </div>
        </Panel>

        <Panel className="admin-incidents__panel">
          <h3 style={{ marginTop: 0 }}>Recent Incidents</h3>
          {loading && <div className="text-sm text-gray-600">Loading incidents...</div>}
          {!loading && error && <div className="alert error">{error}</div>}
          {!loading && !error && (
            <TableList
              rows={records}
              columns={[
                { key: 'type_name', label: 'Type' },
                { key: 'location', label: 'Location' },
                { key: 'severity', label: 'Severity' },
                { key: 'occurred_at', label: 'Occurred At' },
                { key: 'employee_name', label: 'Reported By' },
                { key: 'details', label: 'Details' },
              ]}
              emptyMessage="No incidents logged."
            />
          )}
        </Panel>
      </div>
    </div>
  );
}
