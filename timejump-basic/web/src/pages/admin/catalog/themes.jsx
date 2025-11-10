import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../../auth';
import { Panel, ResourceTable } from '../shared.jsx';

export default function ThemesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', description: '', imageUrl: '' });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [formError, setFormError] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', imageUrl: '' });
  const [editBusy, setEditBusy] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

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
        image_url: item.image_url ?? item.imageUrl ?? '',
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
          imageUrl: form.imageUrl.trim(),
        }),
      });
      setStatus('Theme saved.');
      setForm({ name: '', description: '', imageUrl: '' });
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
          <label className="field">
            <span>Image URL</span>
            <input
              className="input"
              value={form.imageUrl}
              onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
              placeholder="https://example.com/theme.jpg"
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
          {
            key: 'actions',
            label: 'Actions',
            render: (_, row) => (
              <div className="table-actions">
                <button type="button" className="btn btn-text" onClick={() => {
                  setEditItem(row);
                  setEditForm({
                    name: row.name || '',
                    description: row.description || '',
                    imageUrl: row.image_url || '',
                  });
                  setEditBusy(false);
                }}>
                  Edit
                </button>
                <button type="button" className="btn btn-text danger" onClick={() => {
                  setDeleteItem(row);
                  setDeleteBusy(false);
                }}>
                  Delete
                </button>
              </div>
            ),
          },
        ]}
        loading={loading}
        error={error}
        emptyMessage="No themes created yet."
        searchPlaceholder="Search themes..."
        sortableKeys={['name', 'attraction_count']}
      />

      {editItem && (
        <div className="table-modal">
          <div className="table-modal__card">
            <h4>Edit Theme</h4>
            <form className="admin-form-grid" onSubmit={async e => {
              e.preventDefault();
              if (editBusy) return;
              if (!editForm.name.trim()) {
                setFormError('Theme name is required.');
                return;
              }
              if (!editForm.description.trim()) {
                setFormError('Description is required.');
                return;
              }
              setEditBusy(true);
              setFormError('');
              try {
                await api(`/themes/${editItem.id}`, {
                  method: 'PUT',
                  body: JSON.stringify({
                    name: editForm.name.trim(),
                    description: editForm.description.trim(),
                    imageUrl: editForm.imageUrl.trim(),
                  }),
                });
                setEditItem(null);
                loadThemes();
              } catch (err) {
                setFormError(err?.message || 'Unable to update theme.');
              } finally {
                setEditBusy(false);
              }
            }}>
              <label className="field">
                <span>Theme name</span>
                <input
                  className="input"
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  disabled={editBusy}
                />
              </label>
              <label className="field">
                <span>Description</span>
                <textarea
                  className="input"
                  rows={4}
                  value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  disabled={editBusy}
                />
              </label>
              <label className="field">
                <span>Image URL</span>
                <input
                  className="input"
                  value={editForm.imageUrl}
                  onChange={e => setEditForm(f => ({ ...f, imageUrl: e.target.value }))}
                  disabled={editBusy}
                />
              </label>
              <div className="table-modal__actions">
                <button type="button" className="btn" onClick={() => setEditItem(null)} disabled={editBusy}>
                  Cancel
                </button>
                <button type="submit" className="btn primary" disabled={editBusy}>
                  {editBusy ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

  {deleteItem && (
    <div className="table-modal">
      <div className="table-modal__card">
        <h4>Delete Theme</h4>
        <p>Are you sure you want to remove <strong>{deleteItem.name}</strong>?</p>
        <div className="table-modal__actions">
          <button type="button" className="btn" onClick={() => setDeleteItem(null)} disabled={deleteBusy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn danger"
            disabled={deleteBusy}
            onClick={async () => {
              if (deleteBusy) return;
              setDeleteBusy(true);
              setFormError('');
              try {
                await api(`/themes/${deleteItem.id}`, { method: 'DELETE' });
                setDeleteItem(null);
                loadThemes();
              } catch (err) {
                setFormError(err?.message || 'Unable to delete theme.');
              } finally {
                setDeleteBusy(false);
              }
            }}
          >
            {deleteBusy ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )}
    </>
  );
}

