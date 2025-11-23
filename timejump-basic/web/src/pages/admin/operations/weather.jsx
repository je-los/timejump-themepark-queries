import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../../auth';
import { useAuth } from '../../../context/authcontext.jsx';
import { Panel, TableList } from '../shared.jsx';

const WEATHER_CONDITIONS = [
  'Light Rain',
  'Heavy Rain',
  'Snow',
  'Hail',
  'Lightning',
  'Lightning Advisory',
  'Thunderstorm',
  'Tornado',
  'Hurricane',
];

function createEmptyForm() {
  return {
    attractionId: '',
    date: '',
    weatherCondition: '',
    description: '',
  };
}

function formatDateOnly(value) {
  if (!value) return '--';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
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

  const [attractions, setAttractions] = useState([]);
  const [missingFields, setMissingFields] = useState({
    attractionId: false,
    date: false,
    weatherCondition: false,
    description: false,
  });

  const canEdit = user?.role_name === 'admin' || user?.role === 'admin' || user?.role_name === 'owner' || user?.role === 'owner';

  useEffect(() => {
    loadAttractions();
    loadRecords();
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

  async function loadRecords() {
    setLoading(true);
    setError('');
    try {
      const res = await api('/weather-cancellations');
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
    setMissingFields({
      attractionId: false,
      date: false,
      weatherCondition: false,
      description: false,
    });
    setFormError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;

    const missing = {
      attractionId: !form.attractionId,
      date: !form.date,
      weatherCondition: !form.weatherCondition,
      description: !form.description.trim(),
    };

    if (missing.attractionId || missing.date || missing.weatherCondition || missing.description) {
      setFormError('Please fill in all required fields.');
      setMissingFields(missing);
      return;
    }

    setSaving(true);
    setStatus('');
    setFormError('');

    try {
      const attractionId = form.attractionId ? Number(form.attractionId) : null;
      const payload = {
        attractionId,
        date: form.date,
        weatherCondition: form.weatherCondition,
        description: form.description.trim(),
      };

      if (editingRecord?.WeatherCancellationID) {
        await api(`/weather-cancellations/${editingRecord.WeatherCancellationID}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setStatus('Weather cancellation record updated.');
      } else {
        await api('/weather-cancellations', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setStatus('Weather cancellation recorded.');
      }

      setForm(createEmptyForm());
      setEditingRecord(null);
      setMissingFields({
        attractionId: false,
        date: false,
        weatherCondition: false,
        description: false,
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
      date: row.Date || row.date,
      weatherCondition: row.WeatherCondition || row.weather_condition,
      description: row.Description || row.description,
    });
    setEditingRecord(row);
    setFormError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const attractionOptions = attractions
    .map(a => ({
      id: a?.AttractionID ?? a?.id ?? a?.attraction_id,
      name: a?.Name ?? a?.name ?? 'Attraction',
    }))
    .filter(opt => opt.id);

  const isEditing = !!editingRecord?.WeatherCancellationID;

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
              <select
                className="input"
                value={form.attractionId}
                onChange={e => setForm(f => ({ ...f, attractionId: e.target.value }))}
                disabled={saving}
              >
                <option value="">Select attraction...</option>
                {attractionOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Date{missingFields.date && <span className="missing-asterisk">*</span>}</span>
              <input
                className="input"
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                disabled={saving}
              />
            </label>
            <label className="field">
              <span>Weather Condition{missingFields.weatherCondition && <span className="missing-asterisk">*</span>}</span>
              <select
                className="input"
                value={form.weatherCondition}
                onChange={e => setForm(f => ({ ...f, weatherCondition: e.target.value }))}
                disabled={saving}
              >
                <option value="">Select weather condition...</option>
                {WEATHER_CONDITIONS.map(condition => (
                  <option key={condition} value={condition}>
                    {condition}
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
                  key: 'Date',
                  label: 'Date',
                  render: value => formatDateOnly(value),
                },
                {
                  key: 'WeatherCondition',
                  label: 'Weather Condition',
                  render: value => value || '--',
                },
                {
                  key: 'Description',
                  label: 'Description',
                  render: value => value || '--',
                },
                {
                  key: 'actions',
                  label: 'Actions',
                  render: (_, row) => (
                    <div style={{ display: 'flex', gap: 6 }}>
                      {canEdit && (
                        <button
                          type="button"
                          className="btn"
                          style={{ padding: '2px 8px', fontSize: 12 }}
                          onClick={() => beginEdit(row)}
                          disabled={editingRecord?.WeatherCancellationID === row.WeatherCancellationID}
                        >
                          {editingRecord?.WeatherCancellationID === row.WeatherCancellationID ? 'Editing...' : 'Edit'}
                        </button>
                      )}
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
