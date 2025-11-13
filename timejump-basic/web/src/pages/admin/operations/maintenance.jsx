import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../../auth';
import { useAuth } from '../../../context/authcontext.jsx';
import { Panel, TableList } from '../shared.jsx';

const DEFAULT_SEVERITIES = ['low', 'medium', 'high', 'critical'];

function formatDateOnly(value) {
  if (!value) return '--';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export default function MaintenancePage() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [formError, setFormError] = useState('');
  const [actionStatus, setActionStatus] = useState('');
  const [actionError, setActionError] = useState('');
  const [resolveError, setResolveError] = useState('');
  const [confirmingId, setConfirmingId] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const [form, setForm] = useState({
    attractionId: '',
    dateBroken: '',
    dateFixed: '',
    type: '',
    severity: '',
    description: '',
  });

  const [attractions, setAttractions] = useState([]);
  const [types, setTypes] = useState([]);
  const [severities, setSeverities] = useState(DEFAULT_SEVERITIES);
  const canApprove = ['manager', 'admin', 'owner'].includes(user?.role);

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
      const [attractionRes, metaRes] = await Promise.all([
        api('/attractions').catch(() => ({ data: [] })),
        api('/maintenance/meta').catch(() => ({ data: {} })),
      ]);
      setAttractions((attractionRes.data || []).map(item => ({
        id: item.AttractionID ?? item.id ?? item.attractionID,
        name: item.Name ?? item.name,
      })));
      const meta = metaRes.data || {};
      const normalizedTypes = (meta.types || []).map(value => {
        const label = typeof value === 'string'
          ? value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
          : String(value);
        return { id: value, name: label };
      });
      setTypes(normalizedTypes);
      const normalizedSeverities = (meta.severities || []).length
        ? (meta.severities || []).map(value => String(value).toLowerCase())
        : DEFAULT_SEVERITIES;
      setSeverities(normalizedSeverities);
    } catch {
      setAttractions([]);
      setEmployees([]);
      setTypes([]);
      setSeverities(DEFAULT_SEVERITIES);
    }
  }, []);

  const handleApprove = useCallback(async (recordId) => {
    if (!canApprove || !recordId) return;
    setActionStatus('');
    setActionError('');
    setConfirmingId(recordId);
    try {
      await api(`/maintenance/${recordId}/confirm`, { method: 'POST' });
      setActionStatus('Maintenance record approved.');
      await loadRecords();
    } catch (err) {
      setActionError(err?.message || 'Unable to confirm maintenance record.');
    } finally {
      setConfirmingId(null);
    }
  }, [canApprove, loadRecords]);

  const handleResolve = useCallback(async (record) => {
    if (!record?.RecordID) return;
    setResolveError('');
    const defaultDate = record?.Date_fixed || new Date().toISOString().slice(0, 10);
    const input = typeof window !== 'undefined'
      ? window.prompt('Enter resolved date (YYYY-MM-DD)', defaultDate)
      : defaultDate;
    if (!input) return;
    const date = input.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setResolveError('Resolved date must be in YYYY-MM-DD format.');
      return;
    }
    setResolvingId(record.RecordID);
    try {
      await api(`/maintenance/${record.RecordID}`, {
        method: 'PUT',
        body: JSON.stringify({ dateFixed: date }),
      });
      setActionStatus('Maintenance marked resolved.');
      await loadRecords();
    } catch (err) {
      setResolveError(err?.message || 'Unable to mark maintenance resolved.');
    } finally {
      setResolvingId(null);
    }
  }, [loadRecords]);

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
    if (!form.dateBroken) {
      setFormError('Date reported is required.');
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
      const attractionId = form.attractionId ? Number(form.attractionId) : null;
      const dateReported = form.dateBroken || null;
      await api('/maintenance', {
        method: 'POST',
        body: JSON.stringify({
          attractionId,
          dateBroken: dateReported,
          dateBrokenDown: dateReported,
          dateFixed: form.dateFixed || null,
          type: form.type,
          severity: form.severity,
          description: form.description.trim(),
        }),
      });
      setStatus('Maintenance record logged.');
      setForm({
        attractionId: '',
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
                {severities.map(severity => (
                  <option key={severity} value={severity}>
                    {severity.replace(/\b\w/g, ch => ch.toUpperCase())}
                  </option>
                ))}
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
          {!loading && resolveError && <div className="alert error">{resolveError}</div>}
          {!loading && !error && (
            <TableList
              rows={records}
              columns={[
                { key: 'attraction_name', label: 'Attraction' },
                { key: 'type_of_maintenance', label: 'Type' },
                { key: 'Severity_of_report', label: 'Severity' },
                {
                  key: 'Date_broken_down',
                  label: 'Reported',
                  render: value => formatDateOnly(value),
                },
                {
                  key: 'Date_fixed',
                  label: 'Resolved',
                  render: value => formatDateOnly(value),
                },
                {
                  key: 'status_label',
                  label: 'Status',
                  render: (value, row) => (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: '#eef2ff',
                          fontSize: 12,
                          fontWeight: 500,
                          textTransform: 'capitalize',
                          width: 'fit-content',
                        }}
                      >
                        {value || 'Unknown'}
                      </span>
                      {row.status_code === 'reported' && (
                        <button
                          type="button"
                          className="btn"
                          style={{ padding: '2px 8px', fontSize: 12 }}
                          onClick={() => handleResolve(row)}
                          disabled={resolvingId === row.RecordID}
                        >
                          {resolvingId === row.RecordID ? 'Saving...' : 'Mark Resolved'}
                        </button>
                      )}
                      {canApprove && row.can_confirm && (
                        <button
                          type="button"
                          className="btn"
                          style={{ padding: '2px 8px', fontSize: 12 }}
                          onClick={() => handleApprove(row.RecordID)}
                          disabled={confirmingId === row.RecordID}
                        >
                          {confirmingId === row.RecordID ? 'Confirming...' : 'Confirm'}
                        </button>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'approved_by_supervisor_name',
                  label: 'Approved By',
                  render: (val, row) => val || row.Approved_by_supervisor || 'Pending',
                },
              ]}
              emptyMessage="No maintenance records yet."
            />
          )}
          {(actionStatus || actionError) && (
            <div style={{ marginTop: 12 }}>
              {actionStatus && <div className="alert success">{actionStatus}</div>}
              {actionError && <div className="alert error">{actionError}</div>}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

