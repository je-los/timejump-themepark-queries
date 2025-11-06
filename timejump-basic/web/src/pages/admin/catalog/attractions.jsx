import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../../auth';
import { Panel, ResourceTable } from '../shared.jsx';

export default function AttractionsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    themeId: '',
    typeId: '',
    heightRestriction: '',
    ridersPerVehicle: '',
  });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [formError, setFormError] = useState('');
  const [themes, setThemes] = useState([]);
  const [types, setTypes] = useState([]);

  const loadAttractions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api('/attractions');
      const list = (res?.data || []).map(item => ({
        id: item.AttractionID ?? item.id,
        name: item.Name ?? item.name,
        theme: item.theme_name ?? '',
        type: item.attraction_type_name ?? item.TypeName ?? item.type ?? '',
        height: item.HeightRestriction ?? item.height_restriction,
        riders: item.RidersPerVehicle ?? item.riders_per_vehicle,
      }));
      setRows(list);
    } catch (err) {
      setError(err?.message || 'Unable to load attractions.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMetadata = useCallback(async () => {
    try {
      const [themeRes, typeRes] = await Promise.all([
        api('/themes').catch(() => ({ data: [] })),
        api('/attraction-types').catch(() => ({ data: [] })),
      ]);
      setThemes((themeRes.data || []).map(item => ({
        id: item.themeID ?? item.id,
        name: item.name ?? item.themeName,
      })));
      setTypes((typeRes.data || []).map(item => ({
        id: item.id ?? item.AttractionType ?? item.AttractionTypeID,
        name: item.name ?? item.TypeName,
      })));
    } catch {
      setThemes([]);
      setTypes([]);
    }
  }, []);

  useEffect(() => {
    loadAttractions();
  }, [loadAttractions]);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    if (!form.name.trim()) {
      setFormError('Attraction name is required.');
      return;
    }
    if (!form.themeId) {
      setFormError('Theme must be selected.');
      return;
    }
    if (!form.typeId) {
      setFormError('Attraction type must be selected.');
      return;
    }
    const ridersValue = Number(form.ridersPerVehicle);
    if (!Number.isFinite(ridersValue) || ridersValue <= 0) {
      setFormError('Riders per vehicle must be greater than zero.');
      return;
    }
    const heightValue = Number(form.heightRestriction || 0);
    if (!Number.isFinite(heightValue) || heightValue < 0) {
      setFormError('Height restriction must be zero or higher.');
      return;
    }
    setBusy(true);
    setStatus('');
    setFormError('');
    try {
      await api('/attractions', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          themeId: form.themeId,
          typeId: form.typeId,
          heightRestriction: heightValue,
          ridersPerVehicle: ridersValue,
        }),
      });
      setStatus('Attraction saved.');
      setForm({
        name: '',
        themeId: '',
        typeId: '',
        heightRestriction: '',
        ridersPerVehicle: '',
      });
      loadAttractions();
    } catch (err) {
      setFormError(err?.message || 'Request failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Panel>
        <h3 style={{ marginTop: 0 }}>Add Attraction</h3>
        <p className="muted">Publish rides and experiences for guests and operations.</p>
        <form className="admin-form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>Attraction name</span>
            <input
              className="input"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Chrono Coaster"
              disabled={busy}
            />
          </label>
          <label className="field">
            <span>Theme</span>
            <select
              className="input"
              value={form.themeId}
              onChange={e => setForm(f => ({ ...f, themeId: e.target.value }))}
              disabled={busy}
            >
              <option value="">Select theme...</option>
              {themes.map(theme => (
                <option key={theme.id} value={theme.id}>
                  {theme.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Attraction type</span>
            <select
              className="input"
              value={form.typeId}
              onChange={e => setForm(f => ({ ...f, typeId: e.target.value }))}
              disabled={busy}
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
            <span>Height restriction (inches)</span>
            <input
              className="input"
              type="number"
              min="0"
              value={form.heightRestriction}
              onChange={e => setForm(f => ({ ...f, heightRestriction: e.target.value }))}
              disabled={busy}
            />
          </label>
          <label className="field">
            <span>Riders per vehicle</span>
            <input
              className="input"
              type="number"
              min="1"
              value={form.ridersPerVehicle}
              onChange={e => setForm(f => ({ ...f, ridersPerVehicle: e.target.value }))}
              disabled={busy}
            />
          </label>
          <button
            className="btn primary"
            type="submit"
            disabled={busy}
            style={{ justifySelf: 'flex-start', width: 'auto' }}
          >
            {busy ? 'Saving...' : 'Add Attraction'}
          </button>
        </form>
        <div style={{ marginTop: 12 }}>
          {status && <div className="alert success">{status}</div>}
          {formError && <div className="alert error">{formError}</div>}
        </div>
      </Panel>

      <ResourceTable
        title="Attractions"
        description="Rides and experiences available throughout the park."
        rows={rows}
        columns={[
          { key: 'name', label: 'Attraction' },
          { key: 'theme', label: 'Theme' },
          { key: 'type', label: 'Type' },
          { key: 'height', label: 'Height (in)' },
          { key: 'riders', label: 'Riders / Vehicle' },
        ]}
        loading={loading}
        error={error}
        emptyMessage="No attractions recorded."
        searchPlaceholder="Search attractions..."
        sortableKeys={['name', 'theme', 'type']}
      />
    </>
  );
}
