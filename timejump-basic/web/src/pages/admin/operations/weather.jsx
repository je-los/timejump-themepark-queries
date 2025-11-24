import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../../auth';
import { useAuth } from '../../../context/authcontext.jsx';
import { Panel, TableList } from '../shared.jsx';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function createEmptyForm() {
  return {
    attractionId: '',
    date: todayISO(),
    reason: '',
  };
}

function formatDateOnly(value) {
  if (!value) return '--';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

export default function WeatherPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState(() => createEmptyForm());
  const [editingRecord, setEditingRecord] = useState(null);
  const [clearingId, setClearingId] = useState(null);
  const [confirmingClearId, setConfirmingClearId] = useState(null);
  const [applyAll, setApplyAll] = useState(false);

  const [attractions, setAttractions] = useState([]);
  const [reasonOptions, setReasonOptions] = useState([]);
  const [missingFields, setMissingFields] = useState({
    attractionId: false,
    date: false,
    reason: false,
  });

  const canEdit = user?.role_name === 'admin' || user?.role === 'admin' || user?.role_name === 'owner' || user?.role === 'owner' || user?.role_name === 'manager' || user?.role === 'manager';

  useEffect(() => {
    loadAttractions();
    loadRecords();
    loadReasons();
  }, []);

  async function loadAttractions() {
    try {
      const res = await api('/attractions');
      const attrs = Array.isArray(res?.data) ? res.data : res?.attractions || [];
      setAttractions(attrs);
    } catch (err) {
      console.warn('Failed to load attractions:', err?.message);
    }
  }

  async function loadReasons() {
    try {
      const res = await api('/cancellation-reasons');
      const rows = Array.isArray(res?.data) ? res.data : res?.reasons || [];
      setReasonOptions(rows.map(row => ({
        value: row.reason_id || row.ReasonID || row.code || row.Name || row.reason,
        label: row.label || row.Name || row.reason || row.code,
      })));
    } catch (err) {
      console.warn('Failed to load cancellation reasons:', err?.message);
      setReasonOptions([]);
    }
  }

  async function loadRecords() {
    setLoading(true);
    setError('');
    try {
      const res = await api('/ride-cancellations?weatherOnly=true&includeCleared=true');
      const data = Array.isArray(res?.data) ? res.data : res?.records || [];
      setRecords(data);
    } catch (err) {
      setError(err?.message || 'Failed to load weather records.');
    } finally {
      setLoading(false);
    }
  }

  function cancelEdit() {
    setEditingRecord(null);
    setForm(createEmptyForm());
    setApplyAll(false);
    setMissingFields({
      attractionId: false,
      date: false,
      reason: false,
    });
    setFormError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;

    const missing = {
      attractionId: !applyAll && !form.attractionId,
      date: !form.date,
      reason: !form.reason,
    };

    if (missing.attractionId || missing.date || missing.reason) {
      setFormError('Please fill in all required fields.');
      setMissingFields(missing);
      return;
    }

    setSaving(true);
    setStatus('');
    setFormError('');

    try {
      const attractionId = applyAll ? null : (form.attractionId ? Number(form.attractionId) : null);
      const payload = {
        attractionId,
        cancelDate: form.date,
        reasonId: Number(form.reason) || form.reason || null,
        applyAll,
      };

      if (editingRecord?.cancel_id) {
        await api(`/ride-cancellations/${editingRecord.cancel_id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setStatus('Weather cancellation record updated. Attractions will be automatically closed.');
      } else {
        await api('/ride-cancellations', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setStatus(applyAll
          ? 'Park-wide weather closure recorded. All attractions are closed until weather clears.'
          : 'Weather Log recorded. Attraction is closed until weather clears.');
      }

      setForm(createEmptyForm());
      setApplyAll(false);
      setEditingRecord(null);
      setMissingFields({
        attractionId: false,
        date: false,
        reason: false,
      });
      await loadRecords();
    } catch (err) {
      setFormError(err?.message || (editingRecord ? 'Failed to update weather record.' : 'Failed to save weather record.'));
    } finally {
      setSaving(false);
    }
  }

  function beginEdit(row) {
    setForm({
      attractionId: row.AttractionID || row.attraction_id,
      date: row.cancel_date || row.date,
      reason: row.reason,
    });
    setEditingRecord(row);
    setFormError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleClearWeather(row) {
    if (clearingId) return;

    setClearingId(row.cancel_id);
    setStatus('');
    setError('');

    try {
      await api(`/ride-cancellations/${row.cancel_id}/clear-weather`, {
        method: 'POST',
      });
      setStatus(`Weather cleared for ${row.attraction_name}. Attraction has been reopened.`);
      await loadRecords();
    } catch (err) {
      setError(err?.message || 'Failed to clear weather.');
    } finally {
      setClearingId(null);
      setConfirmingClearId(null);
    }
  }

  const attractionOptions = attractions
    .map(a => ({
      id: a?.AttractionID ?? a?.id ?? a?.attraction_id,
      name: a?.Name ?? a?.name ?? 'Attraction',
    }))
    .filter(opt => opt.id);

  const isEditing = !!editingRecord?.cancel_id;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Weather Cancellations</h1>
        <p>Manage weather-related attraction closures and cancellations</p>
      </div>

      <div className="admin-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <Panel className="admin-maintenance__form-panel">
          <h3 style={{ marginTop: 0 }}>{isEditing ? 'Edit Weather Cancellation' : 'Log Weather Cancellation'}</h3>
          <form onSubmit={handleSubmit} className="admin-form">
            <label className="field">
              <span>Attraction{missingFields.attractionId && <span className="missing-asterisk">*</span>}</span>
              <div style={{ display: 'grid', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={applyAll}
                    onChange={e => {
                      setApplyAll(e.target.checked);
                      if (e.target.checked) setMissingFields(m => ({ ...m, attractionId: false }));
                    }}
                    disabled={saving}
                  />
                  Apply to all attractions
                </label>
                {!applyAll && (
                  <select
                    className="input"
                    value={form.attractionId}
                    onChange={e => {
                      setForm(f => ({ ...f, attractionId: e.target.value }));
                      if (e.target.value) setMissingFields(m => ({ ...m, attractionId: false }));
                    }}
                    disabled={saving}
                  >
                    <option value="">Select attraction...</option>
                    {attractionOptions.map(opt => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </label>
            <label className="field">
              <span>Date Reported{missingFields.date && <span className="missing-asterisk">*</span>}</span>
              <input
                className="input"
                type="date"
                value={form.date}
                onChange={e => {
                  setForm(f => ({ ...f, date: e.target.value }));
                  if (e.target.value) setMissingFields(m => ({ ...m, date: false }));
                }}
                disabled={saving}
              />
            </label>
            <label className="field">
              <span>Reason (Weather Condition){missingFields.reason && <span className="missing-asterisk">*</span>}</span>
              <select
                className="input"
                value={form.reason}
                onChange={e => {
                  setForm(f => ({ ...f, reason: e.target.value }));
                  if (e.target.value) setMissingFields(m => ({ ...m, reason: false }));
                }}
                disabled={saving}
              >
                <option value="">Select weather condition...</option>
                {reasonOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="btn primary"
              type="submit"
              disabled={saving}
              style={{ justifySelf: 'flex-start', width: 'auto', marginBottom: '1rem', marginTop: '1rem' }}
            >
              {saving ? 'Saving...' : isEditing ? 'Update Weather Cancellation' : 'Log Weather Cancellation'}
            </button>
            {isEditing && (
              <button
                type="button"
                className="btn"
                style={{ justifySelf: 'flex-start', width: 'auto' }}
                onClick={cancelEdit}
                disabled={saving}
              >
                Cancel
              </button>
            )}
          </form>
          <div style={{ marginTop: 12 }}>
            {status && <div className="alert success">{status}</div>}
            {formError && <div className="alert error">{formError}</div>}
          </div>
        </Panel>

        <Panel className="admin-maintenance__panel">
          <h3 style={{ marginTop: 0 }}>Weather Cancellation Records</h3>
          {loading && <div className="text-sm text-gray-600">Loading records...</div>}
          {!loading && error && <div className="alert error">{error}</div>}
          {!loading && !error && (
            <TableList
              rows={records}
              columns={[
                { key: 'attraction_name', label: 'Attraction' },
                {
                  key: 'cancel_date',
                  label: 'Date',
                  render: value => formatDateOnly(value),
                },
                {
                  key: 'reason',
                  label: 'Reason (Weather)',
                  render: value => value || '--',
                },
                {
                  key: 'cleared',
                  label: 'Status',
                  render: value => (
                    <span style={{ 
                      color: value ? '#059669' : '#dc2626',
                      fontWeight: 500 
                    }}>
                      {value ? 'Resolved' : 'Active'}
                    </span>
                  ),
                },
                {
                  key: 'actions',
                  label: 'Actions',
                  render: (_, row) => (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(canEdit && !row.cleared && confirmingClearId !== row.cancel_id) && (
                        <>
                          <button
                            type="button"
                            className="btn"
                            style={{ padding: '2px 8px', fontSize: 12 }}
                            onClick={() => beginEdit(row)}
                            disabled={editingRecord?.cancel_id === row.cancel_id}
                          >
                            {editingRecord?.cancel_id === row.cancel_id ? 'Editing...' : 'Edit'}
                          </button>
                          <button
                            type="button"
                            className="btn"
                            style={{ padding: '2px 8px', fontSize: 12 }}
                            onClick={() => setConfirmingClearId(row.cancel_id)}
                            disabled={clearingId === row.cancel_id}
                          >
                            Weather Cleared
                          </button>
                        </>
                      )}
                      {(canEdit && !row.cleared && confirmingClearId === row.cancel_id) && (
                        <>
                          <button
                            type="button"
                            className="btn"
                            style={{ padding: '2px 8px', fontSize: 12 }}
                            onClick={() => setConfirmingClearId(null)}
                            disabled={clearingId === row.cancel_id}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="btn"
                            style={{ padding: '2px 8px', fontSize: 12, backgroundColor: '#dc2626', color: 'white' }}
                            onClick={() => handleClearWeather(row)}
                            disabled={clearingId === row.cancel_id}
                          >
                            {clearingId === row.cancel_id ? 'Clearing...' : 'Confirm Clear'}
                          </button>
                        </>
                      )}
                      {row.cleared ? (
                        <span style={{ fontSize: 12, color: '#059669', fontWeight: 500 }}>Weather resolved</span>
                      ) : null}
                    </div>
                  ),
                },
              ]}
              emptyMessage="No weather cancellations logged yet."
            />
          )}
        </Panel>
        </div>
      </div>
    </div>
  );
}
