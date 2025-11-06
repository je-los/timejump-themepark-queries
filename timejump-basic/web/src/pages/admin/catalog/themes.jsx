import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../../auth';
import { Panel, ResourceTable } from '../shared.jsx';

export default function ThemesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', description: '' });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [formError, setFormError] = useState('');

  const loadThemes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api('/themes');
      const list = (res?.data || []).map(item => ({
        id: item.themeID ?? item.id,
        name: item.name ?? item.themeName,
        description: item.description ?? item.Description ?? '',
        attraction_count: item.attraction_count ?? 0,
      }));
      setRows(list);
    } catch (err) {
      setError(err?.message || 'Unable to load themes.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadThemes();
  }, [loadThemes]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    if (!form.name.trim()) {
      setFormError('Theme name is required.');
      return;
    }
    if (!form.description.trim()) {
      setFormError('Description is required.');
      return;
    }
    setBusy(true);
    setStatus('');
    setFormError('');
    try {
      await api('/themes', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
        }),
      });
      setStatus('Theme saved.');
      setForm({ name: '', description: '' });
      loadThemes();
    } catch (err) {
      setFormError(err?.message || 'Request failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Panel>
        <h3 style={{ marginTop: 0 }}>Create Theme</h3>
        <p className="muted">Group attractions into lands that curate the experience.</p>
        <form className="admin-form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>Theme name</span>
            <input
              className="input"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Chrono Harbor"
              disabled={busy}
            />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea
              className="input"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="A waterfront district where time bends."
              rows={4}
              disabled={busy}
            />
          </label>
          <button
            className="btn primary"
            type="submit"
            disabled={busy}
            style={{ justifySelf: 'flex-start', width: 'auto' }}
          >
            {busy ? 'Saving...' : 'Add Theme'}
          </button>
        </form>
        <div style={{ marginTop: 12 }}>
          {status && <div className="alert success">{status}</div>}
          {formError && <div className="alert error">{formError}</div>}
        </div>
      </Panel>

      <ResourceTable
        title="Themes"
        description="Lands that organize attractions."
        rows={rows}
        columns={[
          { key: 'name', label: 'Theme' },
          { key: 'description', label: 'Description' },
          { key: 'attraction_count', label: '# Attractions' },
        ]}
        loading={loading}
        error={error}
        emptyMessage="No themes created yet."
        searchPlaceholder="Search themes..."
        sortableKeys={['name', 'attraction_count']}
      />
    </>
  );
}
