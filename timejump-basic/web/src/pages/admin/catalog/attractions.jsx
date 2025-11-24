import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../../auth';
import { Panel, ResourceTable } from '../shared.jsx';
import { notifyDeleteError, notifyDeleteSuccess } from '../../../utils/deleteAlert.js';
import { showToast } from '../../../utils/toast.js';

export default function AttractionsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    themeId: '',
    typeId: '',
    capacity: '',
    imageUrl: '',
    experienceLevel: '',
    audience: '',
  });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [formError, setFormError] = useState('');
  const [themes, setThemes] = useState([]);
  const [types, setTypes] = useState([]);
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    themeId: '',
    typeId: '',
    capacity: '',
    imageUrl: '',
    experienceLevel: '',
    audience: '',
  });
  const [editBusy, setEditBusy] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [typeForm, setTypeForm] = useState({ name: '', description: '' });
  const [typeBusy, setTypeBusy] = useState(false);
  const [typeStatus, setTypeStatus] = useState('');
  const [typeError, setTypeError] = useState('');
  const [typeEditItem, setTypeEditItem] = useState(null);
  const [typeEditForm, setTypeEditForm] = useState({ name: '', description: '' });
  const [typeEditBusy, setTypeEditBusy] = useState(false);
  const [typeEditError, setTypeEditError] = useState('');
  const [typeDeleteItem, setTypeDeleteItem] = useState(null);
  const [typeDeleteBusy, setTypeDeleteBusy] = useState(false);
  const [typeDeleteError, setTypeDeleteError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const loadAttractions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api('/attractions');
      const list = (res?.data || [])
        .filter(item => !(item.isDeleted || item.is_deleted)) // ADD THIS LINE
        .map(item => {
          const themeId = item.ThemeID ?? item.themeId ?? item.theme_id ?? '';
          const typeId = item.AttractionTypeID ?? item.typeId ?? item.type_id ?? '';
          return {
            id: item.AttractionID ?? item.id,
            name: item.Name ?? item.name,
            theme: item.theme_name ?? '',
            type: item.attraction_type_name ?? item.TypeName ?? item.type ?? '',
            capacity: item.Capacity ?? item.capacity ?? item.RidersPerVehicle ?? item.riders_per_vehicle ?? null,
            image_url: item.image_url ?? item.imageUrl ?? '',
            themeId,
            typeId,
            experienceLevel: item.experience_level ?? item.experienceLevel ?? '',
            audience: item.target_audience ?? item.targetAudience ?? '',
          };
        });
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
    
    // Filter out soft-deleted types
      const allTypes = typeRes.data || [];
      const activeTypes = allTypes.filter(item => !(item.isDeleted || item.is_deleted));
    
      setTypes(activeTypes.map(item => ({
        id: item.id ?? item.AttractionType ?? item.AttractionTypeID,
        name: item.name ?? item.TypeName,
        description: item.description ?? item.Description ?? '',
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
    const capacityValue = Number(form.capacity);
    if (!Number.isFinite(capacityValue) || capacityValue <= 0) {
      setFormError('Capacity must be greater than zero.');
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
          capacity: capacityValue,
          imageUrl: form.imageUrl.trim(),
          experienceLevel: form.experienceLevel.trim(),
          targetAudience: form.audience.trim(),
        }),
      });
      setStatus('Attraction saved.');
      setForm({
        name: '',
        themeId: '',
        typeId: '',
        capacity: '',
        imageUrl: '',
        experienceLevel: '',
        audience: '',
      });
      loadAttractions();
    } catch (err) {
      setFormError(err?.message || 'Request failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleTypeSubmit(event) {
    event.preventDefault();
    if (typeBusy) return;
    const name = typeForm.name.trim();
    const description = typeForm.description.trim();
    if (!name) {
      setTypeError('Type name is required.');
      return;
    }
    setTypeBusy(true);
    setTypeError('');
    setTypeStatus('');
    try {
      await api('/attraction-types', {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      });
      setTypeStatus('Attraction type added.');
      setTypeForm({ name: '', description: '' });
      loadMetadata();
    } catch (err) {
      setTypeError(err?.message || 'Unable to add type.');
    } finally {
      setTypeBusy(false);
    }
  }

  function openTypeEditModal(type) {
    setTypeEditItem(type);
    setTypeEditForm({
      name: type?.name || '',
      description: type?.description || '',
    });
    setTypeEditError('');
  }

  function closeTypeEditModal() {
    setTypeEditItem(null);
    setTypeEditForm({ name: '', description: '' });
    setTypeEditError('');
  }

  async function handleTypeEditSubmit(event) {
    event.preventDefault();
    if (!typeEditItem || typeEditBusy) return;
    const name = typeEditForm.name.trim();
    const description = typeEditForm.description.trim();
    if (!name) {
      setTypeEditError('Type name is required.');
      return;
    }
    setTypeEditBusy(true);
    setTypeEditError('');
    setTypeStatus('');
    try {
      await api(`/attraction-types/${typeEditItem.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, description }),
      });
      setTypeStatus('Attraction type updated.');
      closeTypeEditModal();
      loadMetadata();
      showToast(`Updated attraction type: ${name}`, 'success');
    } catch (err) {
      const message = err?.message || 'Unable to update type.';
      setTypeEditError(message);
      showToast(message, 'error');
    } finally {
      setTypeEditBusy(false);
    }
  }

  function openTypeDeleteModal(type) {
    setTypeDeleteItem(type);
    setTypeDeleteError('');
  }

  function closeTypeDeleteModal() {
    setTypeDeleteItem(null);
    setTypeDeleteError('');
  }

  async function handleTypeDelete() {
    if (!typeDeleteItem || typeDeleteBusy) return;
    setTypeDeleteBusy(true);
    setTypeDeleteError('');
    setTypeStatus('');
    try {
      await api(`/attraction-types/${typeDeleteItem.id}`, { method: 'DELETE' });
      const label = typeDeleteItem.name || `Type #${typeDeleteItem.id}`;
      const message = notifyDeleteSuccess(`Deleted attraction type: ${label}`);
      closeTypeDeleteModal();
      loadMetadata();
    } catch (err) {
      setTypeDeleteError(notifyDeleteError(err, 'Unable to delete type.'));
    } finally {
      setTypeDeleteBusy(false);
    }
  }

  const renderImageCell = value => {
    if (!value) return '--';
    const display = value.length > 36 ? `${value.slice(0, 36)}...` : value;
    return (
      <div className="table-image-cell">
        <div className="table-image-cell__thumb">
          <img src={value} alt="Attraction preview" loading="lazy" />
        </div>
        <a href={value} target="_blank" rel="noreferrer" title={value} className="table-image-cell__link">
          {display}
        </a>
      </div>
    );
  };

  function openEditModal(item) {
    setEditItem(item);
    setEditForm({
      name: item.name || '',
      themeId: item.themeId || item.ThemeID || '',
      typeId: item.typeId || item.type_id || '',
      capacity: item.capacity ?? '',
      imageUrl: item.image_url || '',
      experienceLevel: item.experienceLevel || item.experience_level || '',
      audience: item.audience || item.target_audience || '',
    });
    setEditBusy(false);
  }

  function openDeleteModal(item) {
    setDeleteConfirm(item)
  }

  async function handleEditSubmit(event) {
    event.preventDefault();
    if (!editItem || editBusy) return;
    if (!editForm.name.trim()) {
      setFormError('Attraction name is required.');
      return;
    }
    if (!editForm.themeId) {
      setFormError('Theme must be selected.');
      return;
    }
    if (!editForm.typeId) {
      setFormError('Attraction type must be selected.');
      return;
    }
    const capacityValue = Number(editForm.capacity);
    if (!Number.isFinite(capacityValue) || capacityValue <= 0) {
      setFormError('Capacity must be greater than zero.');
      return;
    }
    setEditBusy(true);
    setFormError('');
    try {
      await api(`/attractions/${editItem.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editForm.name.trim(),
          themeId: Number(editForm.themeId),
          typeId: Number(editForm.typeId),
          capacity: capacityValue,
          imageUrl: editForm.imageUrl.trim(),
          experienceLevel: editForm.experienceLevel.trim(),
          targetAudience: editForm.audience.trim(),
        }),
      });
      setEditItem(null);
      loadAttractions();
      showToast(`Updated attraction: ${editForm.name.trim() || editItem.name}`, 'success');
    } catch (err) {
      const message = err?.message || 'Unable to update attraction.';
      setFormError(message);
      showToast(message, 'error');
    } finally {
      setEditBusy(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteConfirm || deleteBusy) return;
    setDeleteBusy(true);
    setFormError('');
    try {
      await api(`/attractions/${deleteItem.id}`, { method: 'DELETE' });
      const label = deleteItem.name || `Attraction #${deleteItem.id}`;
      const message = notifyDeleteSuccess(`Deleted attraction: ${label}`);
      setDeleteItem(null);
      loadAttractions();
    } catch (err) {
      setFormError(notifyDeleteError(err, 'Unable to delete attraction.'));
    } finally {
      setDeleteBusy(false);
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
            <span>Capacity per dispatch/event</span>
            <input
              className="input"
              type="number"
              min="1"
              value={form.capacity}
              onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
              disabled={busy}
            />
          </label>
          <label className="field">
            <span>Experience level</span>
            <input
              className="input"
              value={form.experienceLevel}
              onChange={e => setForm(f => ({ ...f, experienceLevel: e.target.value }))}
              placeholder="High thrill, family-friendly, etc."
              disabled={busy}
            />
          </label>
          <label className="field">
            <span>Who's it for?</span>
            <input
              className="input"
              value={form.audience}
              onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}
              placeholder="Families, thrill-seekers, ages 8+"
              disabled={busy}
            />
          </label>
          <label className="field">
            <span>Image URL</span>
            <input
              className="input"
              value={form.imageUrl}
              onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
              placeholder="https://example.com/attraction.jpg"
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

      <Panel>
        <h3 style={{ marginTop: 0 }}>Add Attraction Type</h3>
        <form className="admin-form-grid" onSubmit={handleTypeSubmit}>
          <label className="field">
            <span>Type name</span>
            <input
              className="input"
              value={typeForm.name}
              onChange={e => setTypeForm(form => ({ ...form, name: e.target.value }))}
              placeholder="Dark Ride"
              disabled={typeBusy}
            />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea
              className="input"
              value={typeForm.description}
              onChange={e => setTypeForm(form => ({ ...form, description: e.target.value }))}
              placeholder="Describe the ride experience."
              rows={3}
              disabled={typeBusy}
            />
          </label>
          <button
            className="btn"
            type="submit"
            disabled={typeBusy}
            style={{ justifySelf: 'flex-start', width: 'auto' }}
          >
            {typeBusy ? 'Saving...' : 'Add Type'}
          </button>
        </form>
        <div style={{ marginTop: 8 }}>
          {typeStatus && <div className="alert success">{typeStatus}</div>}
          {typeError && <div className="alert error">{typeError}</div>}
        </div>
      </Panel>

      <ResourceTable
        title="Attraction Types"
        description="Manage the categories available for attractions."
        rows={types}
        columns={[
          { key: 'name', label: 'Type' },
          { key: 'description', label: 'Description', render: value => value || '—' },
          {
            key: 'actions',
            label: 'Actions',
            render: (_, row) => (
              <div className="table-actions">
                <button type="button" className="btn btn-text" onClick={() => openTypeEditModal(row)}>
                  Edit
                </button>
                <button type="button" className="btn btn-text danger" onClick={() => openTypeDeleteModal(row)}>
                  Delete
                </button>
              </div>
            ),
          },
        ]}
        loading={false}
        error=""
        emptyMessage="No attraction types found."
        searchPlaceholder="Search attraction types..."
        sortableKeys={['name']}
      />

      <ResourceTable
        title="Attractions"
        description="Rides and experiences available throughout the park."
        rows={rows}
        columns={[
          { key: 'name', label: 'Attraction' },
          { key: 'theme', label: 'Theme' },
          { key: 'type', label: 'Type' },
           { key: 'experienceLevel', label: 'Experience Level', render: val => val || 'N/A' },
           { key: 'audience', label: 'Who It\'s For', render: val => val || 'N/A' },
          { key: 'capacity', label: 'Capacity' },
          {
            key: 'actions',
            label: 'Actions',
            render: (_, row) => (
              <div className="table-actions">
                <button type="button" className="btn btn-text" onClick={() => openEditModal(row)}>
                  Edit
                </button>
                <button type="button" className="btn btn-text danger" onClick={() => openDeleteModal(row)}>
                  Delete
                </button>
              </div>
            ),
          },
        ]}
        loading={loading}
        error={error}
        emptyMessage="No attractions recorded."
        searchPlaceholder="Search attractions..."
        sortableKeys={['name', 'theme', 'type']}
      />

      {editItem && (
        <div className="table-modal">
          <div className="table-modal__card">
            <h4>Edit Attraction</h4>
            <form className="admin-form-grid" onSubmit={handleEditSubmit}>
              <label className="field">
                <span>Attraction name</span>
                <input
                  className="input"
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  disabled={editBusy}
                />
              </label>
              <label className="field">
                <span>Theme</span>
                <select
                  className="input"
                  value={editForm.themeId}
                  onChange={e => setEditForm(f => ({ ...f, themeId: e.target.value }))}
                  disabled={editBusy}
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
                  value={editForm.typeId}
                  onChange={e => setEditForm(f => ({ ...f, typeId: e.target.value }))}
                  disabled={editBusy}
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
                <span>Capacity</span>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={editForm.capacity}
                  onChange={e => setEditForm(f => ({ ...f, capacity: e.target.value }))}
                  disabled={editBusy}
                />
              </label>
              <label className="field">
                <span>Experience level</span>
                <input
                  className="input"
                  value={editForm.experienceLevel}
                  onChange={e => setEditForm(f => ({ ...f, experienceLevel: e.target.value }))}
                  disabled={editBusy}
                />
              </label>
              <label className="field">
                <span>Who's it for?</span>
                <input
                  className="input"
                  value={editForm.audience}
                  onChange={e => setEditForm(f => ({ ...f, audience: e.target.value }))}
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

      {typeEditItem && (
        <div className="table-modal">
          <div className="table-modal__card">
            <h4>Edit Attraction Type</h4>
            <form className="admin-form-grid" onSubmit={handleTypeEditSubmit}>
              <label className="field">
                <span>Type name</span>
                <input
                  className="input"
                  value={typeEditForm.name}
                  onChange={e => setTypeEditForm(f => ({ ...f, name: e.target.value }))}
                  disabled={typeEditBusy}
                />
              </label>
              <label className="field">
                <span>Description</span>
                <textarea
                  className="input"
                  rows={3}
                  value={typeEditForm.description}
                  onChange={e => setTypeEditForm(f => ({ ...f, description: e.target.value }))}
                  disabled={typeEditBusy}
                />
              </label>
              {typeEditError && <div className="alert error">{typeEditError}</div>}
              <div className="table-modal__actions">
                <button type="button" className="btn" onClick={closeTypeEditModal} disabled={typeEditBusy}>
                  Cancel
                </button>
                <button type="submit" className="btn primary" disabled={typeEditBusy}>
                  {typeEditBusy ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {typeDeleteItem && (
        <div className="table-modal">
          <div className="table-modal__card">
            <h4>Delete Attraction Type</h4>
            <p>
              Are you sure you want to remove <strong>{typeDeleteItem.name}</strong>? This action cannot be undone.
            </p>
            {typeDeleteError && <div className="alert error">{typeDeleteError}</div>}
            <div className="table-modal__actions">
              <button type="button" className="btn" onClick={closeTypeDeleteModal} disabled={typeDeleteBusy}>
                Cancel
              </button>
              <button type="button" className="btn danger" onClick={handleTypeDelete} disabled={typeDeleteBusy}>
                {typeDeleteBusy ? 'Removing...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (

        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Delete Attraction?</h3>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, color: '#475569' }}>
                Are you sure you want to remove <strong>{deleteConfirm.name}</strong>? 
                This will soft delete the attraction and it can be restored if needed.
              </p>
            </div>
            <div className="modal-footer">
              <div className="modal-actions">
                <button
                  className="btn"
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleteBusy}
                >
                  Cancel
                </button>
                <button
                  className="btn danger"
                  onClick={handleDeleteConfirm}
                  disabled={deleteBusy}
                >
                  {deleteBusy ? 'Deleting...' : 'Delete Attraction'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


