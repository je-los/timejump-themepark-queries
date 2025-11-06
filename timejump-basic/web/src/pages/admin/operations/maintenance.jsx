import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../../auth';
import { Panel, TableList } from '../shared.jsx';

export default function MaintenancePage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    attractionId: '',
    employeeId: '',
    dateBroken: '',
    dateFixed: '',
    type: '',
    severity: '',
    description: '',
  });

  const [attractions, setAttractions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [types, setTypes] = useState([]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api('/maintenance');
      setRecords(res?.data || []);
    } catch (err) {
      setError(err?.message || 'Unable to load maintenance records.');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMetadata = useCallback(async () => {
    try {
      const [attractionRes, employeeRes, typeRes] = await Promise.all([
        api('/attractions').catch(() => ({ data: [] })),
        api('/employees').catch(() => ({ data: [] })),
        api('/maintenance/types').catch(() => ({ data: [] })),
      ]);
      setAttractions((attractionRes.data || []).map(item => ({
        id: item.AttractionID ?? item.id ?? item.attractionID,
        name: item.Name ?? item.name,
      })));
      setEmployees((employeeRes.data || []).map(item => ({
        id: item.employeeID ?? item.id,
        name: item.name ?? `${item.first_name ?? ''} ${item.last_name ?? ''}`.trim(),
      })));
      setTypes((typeRes.data || []).map(item => ({
        id: item.id ?? item.code ?? item.type,
        name: item.label ?? item.name ?? item.type_name ?? item.type,
      })));
    } catch {
      setAttractions([]);
      setEmployees([]);
      setTypes([]);
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
    if (!form.attractionId) {
      setFormError('Attraction is required.');
      return;
    }
    if (!form.type) {
      setFormError('Repair type must be selected.');
      return;
    }
    if (!form.severity) {
      setFormError('Severity must be selected.');
      return;
    }
    if (!form.description.trim()) {
      setFormError('Description is required.');
      return;
    }
    setSaving(true);
    setStatus('');
    setFormError('');
    try {
      await api('/maintenance', {
        method: 'POST',
        body: JSON.stringify({
          attractionId: form.attractionId,
          employeeId: form.employeeId || null,
          dateBroken: form.dateBroken || null,
          dateFixed: form.dateFixed || null,
          type: form.type,
          severity: form.severity,
          description: form.description.trim(),
        }),
      });
      setStatus('Maintenance record logged.');
      setForm({
        attractionId: '',
        employeeId: '',
        dateBroken: '',
        dateFixed: '',
        type: '',
        severity: '',
        description: '',
      });
      loadRecords();
    } catch (err) {
      setFormError(err?.message || 'Failed to save maintenance record.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-maintenance">
      <div className="admin-maintenance__layout">
        <Panel className="admin-maintenance__panel">
          <h3 style={{ marginTop: 0 }}>Log Maintenance</h3>
          <form className="admin-form-grid" onSubmit={handleSubmit}>
            <label className="field">
              <span>Attraction</span>
              <select
                className="input"
                value={form.attractionId}
                onChange={e => setForm(f => ({ ...f, attractionId: e.target.value }))}
                disabled={saving}
              >
                <option value="">Select attraction...</option>
                {attractions.map(attraction => (
                  <option key={attraction.id} value={attraction.id}>
                    {attraction.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Assigned employee (optional)</span>
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
              <span>Date reported</span>
              <input
                className="input"
                type="date"
                value={form.dateBroken}
                onChange={e => setForm(f => ({ ...f, dateBroken: e.target.value }))}
                disabled={saving}
              />
            </label>
            <label className="field">
              <span>Date resolved</span>
              <input
                className="input"
                type="date"
                value={form.dateFixed}
                onChange={e => setForm(f => ({ ...f, dateFixed: e.target.value }))}
                disabled={saving}
              />
            </label>
            <label className="field">
              <span>Maintenance type</span>
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
              <span>Description</span>
              <textarea
                className="input"
                rows={4}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe the maintenance issue and any context."
                disabled={saving}
              />
            </label>
            <button
              className="btn primary"
              type="submit"
              disabled={saving}
              style={{ justifySelf: 'flex-start', width: 'auto' }}
            >
              {saving ? 'Saving...' : 'Log Maintenance'}
            </button>
          </form>
          <div style={{ marginTop: 12 }}>
            {status && <div className="alert success">{status}</div>}
            {formError && <div className="alert error">{formError}</div>}
          </div>
        </Panel>

        <Panel className="admin-maintenance__panel">
          <h3 style={{ marginTop: 0 }}>Recent Maintenance Records</h3>
          {loading && <div className="text-sm text-gray-600">Loading records...</div>}
          {!loading && error && <div className="alert error">{error}</div>}
          {!loading && !error && (
            <TableList
              rows={records}
              columns={[
                { key: 'attraction_name', label: 'Attraction' },
                { key: 'type_name', label: 'Type' },
                { key: 'severity', label: 'Severity' },
                { key: 'date_reported', label: 'Reported' },
                { key: 'date_resolved', label: 'Resolved' },
                { key: 'employee_name', label: 'Assigned To' },
              ]}
              emptyMessage="No maintenance records yet."
            />
          )}
        </Panel>
      </div>
    </div>
  );
}
