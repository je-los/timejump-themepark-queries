import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../../auth';
import { Panel, ResourceTable } from '../shared.jsx';
import { notifyDeleteError, notifyDeleteSuccess } from '../../../utils/deleteAlert.js';
import { showToast } from '../../../utils/toast.js';

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function FoodPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    price: '',
    vendorId: '',
    imageUrl: '',
  });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [formError, setFormError] = useState('');

  const [vendors, setVendors] = useState([]);
  const [themes, setThemes] = useState([]);
  const [vendorForm, setVendorForm] = useState({ name: '', themeId: '' });
  const [vendorBusy, setVendorBusy] = useState(false);
  const [vendorStatus, setVendorStatus] = useState('');
  const [vendorError, setVendorError] = useState('');
  const [editVendor, setEditVendor] = useState(null);
  const [editVendorForm, setEditVendorForm] = useState({ name: '', themeId: '' });
  const [editVendorBusy, setEditVendorBusy] = useState(false);
  const [deleteVendor, setDeleteVendor] = useState(null);
  const [deleteVendorBusy, setDeleteVendorBusy] = useState(false);

  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', price: '', vendorId: '', imageUrl: '' });
  const [editBusy, setEditBusy] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const loadFood = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api('/food-items');
      const list = (res?.data || []).map(item => ({
        ...item,
        image_url: item.image_url ?? item.imageUrl ?? '',
      }));
      setRows(list);
    } catch (err) {
      setError(err?.message || 'Unable to load menu items.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadVendors = useCallback(async () => {
    try {
      const res = await api('/food-vendors');
      setVendors(res?.data || []);
    } catch {
      setVendors([]);
    }
  }, []);

  const loadThemes = useCallback(async () => {
    try {
      const res = await api('/themes');
      setThemes((res?.data || []).map(item => ({
        id: item.themeID ?? item.id,
        name: item.name ?? item.themeName,
      })));
    } catch {
      setThemes([]);
    }
  }, []);

  useEffect(() => {
    loadFood();
  }, [loadFood]);

  useEffect(() => {
    loadVendors();
    loadThemes();
  }, [loadVendors, loadThemes]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    if (!form.name.trim()) {
      setFormError('Menu item name is required.');
      return;
    }
    if (!form.vendorId) {
      setFormError('Select a food vendor.');
      return;
    }
    setBusy(true);
    setStatus('');
    setFormError('');
    try {
      await api('/food-items', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          price: Number(form.price || 0),
          vendorId: Number(form.vendorId),
          imageUrl: form.imageUrl.trim(),
        }),
      });
      setStatus('Menu item saved.');
      setForm({
        name: '',
        price: '',
        vendorId: '',
        imageUrl: '',
      });
      loadFood();
    } catch (err) {
      setFormError(err?.message || 'Request failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleVendorSubmit(event) {
    event.preventDefault();
    if (vendorBusy) return;
    if (!vendorForm.name.trim()) {
      setVendorError('Vendor name is required.');
      return;
    }
    if (!vendorForm.themeId) {
      setVendorError('Theme is required.');
      return;
    }
    setVendorBusy(true);
    setVendorStatus('');
    setVendorError('');
    try {
      await api('/food-vendors', {
        method: 'POST',
        body: JSON.stringify({
          name: vendorForm.name.trim(),
          themeId: Number(vendorForm.themeId),
        }),
      });
      setVendorStatus('Vendor saved.');
      setVendorForm({ name: '', themeId: '' });
      loadVendors();
    } catch (err) {
      setVendorError(err?.message || 'Unable to save vendor.');
    } finally {
      setVendorBusy(false);
    }
  }

  function openEditModal(item) {
    setEditItem(item);
    setEditForm({
      name: item.name || '',
      price: item.price ?? '',
      vendorId: item.vendor_id ?? '',
      imageUrl: item.image_url || '',
    });
    setEditBusy(false);
  }

  function openDeleteModal(item) {
    setDeleteItem(item);
    setDeleteBusy(false);
  }

  async function handleEditSubmit(event) {
    event.preventDefault();
    if (!editItem || editBusy) return;
    if (!editForm.name.trim()) {
      setFormError('Menu item name is required.');
      return;
    }
    if (!editForm.vendorId) {
      setFormError('Vendor must be selected.');
      return;
    }
    setEditBusy(true);
    setFormError('');
    try {
      await api(`/food-items/${editItem.item_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editForm.name.trim(),
          price: Number(editForm.price || 0),
          vendorId: Number(editForm.vendorId),
          imageUrl: editForm.imageUrl.trim(),
        }),
      });
      setEditItem(null);
      loadFood();
      showToast(`Updated menu item: ${editForm.name.trim() || editItem.name}`, 'success');
    } catch (err) {
      const message = err?.message || 'Unable to update item.';
      setFormError(message);
      showToast(message, 'error');
    } finally {
      setEditBusy(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteItem || deleteBusy) return;
    setDeleteBusy(true);
    setFormError('');
    try {
      await api(`/food-items/${deleteItem.item_id}`, { method: 'DELETE' });
      const label = deleteItem.name || `Item #${deleteItem.item_id}`;
      const message = notifyDeleteSuccess(`Deleted menu item: ${label}`);
      setDeleteItem(null);
      loadFood();
    } catch (err) {
      setFormError(notifyDeleteError(err, 'Unable to delete item.'));
    } finally {
      setDeleteBusy(false);
    }
  }

  function openVendorEdit(vendor) {
    setEditVendor(vendor);
    setEditVendorForm({
      name: vendor.name || '',
      themeId: vendor.theme_id || '',
    });
    setEditVendorBusy(false);
  }

  function openVendorDelete(vendor) {
    setDeleteVendor(vendor);
    setDeleteVendorBusy(false);
  }

  async function handleVendorEditSubmit(event) {
    event.preventDefault();
    if (!editVendor || editVendorBusy) return;
    if (!editVendorForm.name.trim()) {
      setVendorError('Vendor name is required.');
      return;
    }
    if (!editVendorForm.themeId) {
      setVendorError('Theme is required.');
      return;
    }
    setEditVendorBusy(true);
    setVendorError('');
    try {
      await api(`/food-vendors/${editVendor.vendor_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editVendorForm.name.trim(),
          themeId: Number(editVendorForm.themeId),
        }),
      });
      setEditVendor(null);
      loadVendors();
      showToast(`Updated vendor: ${editVendorForm.name.trim() || editVendor.name}`, 'success');
    } catch (err) {
      const message = err?.message || 'Unable to update vendor.';
      setVendorError(message);
      showToast(message, 'error');
    } finally {
      setEditVendorBusy(false);
    }
  }

  async function handleVendorDeleteConfirm() {
    if (!deleteVendor || deleteVendorBusy) return;
    setDeleteVendorBusy(true);
    setVendorError('');
    try {
      await api(`/food-vendors/${deleteVendor.vendor_id}`, { method: 'DELETE' });
      const label = deleteVendor.name || `Vendor #${deleteVendor.vendor_id}`;
      const message = notifyDeleteSuccess(`Deleted vendor: ${label}`);
      setDeleteVendor(null);
      loadVendors();
    } catch (err) {
      setVendorError(notifyDeleteError(err, 'Unable to delete vendor.'));
    } finally {
      setDeleteVendorBusy(false);
    }
  }

  const renderImageCell = value => {
    if (!value) return '--';
    const display = value.length > 36 ? `${value.slice(0, 36)}...` : value;
    return (
      <div className="table-image-cell">
        <div className="table-image-cell__thumb">
          <img src={value} alt="Menu preview" loading="lazy" />
        </div>
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          title={value}
          className="table-image-cell__link"
        >
          {display}
        </a>
      </div>
    );
  };

  return (
    <>
      <Panel>
        <h3 style={{ marginTop: 0 }}>Add Menu Item</h3>
        <p className="muted">Showcase dining options from across the park.</p>
        <form className="admin-form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>Menu item</span>
            <input
              className="input"
              name="food-name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Astro Funnel Cake"
              disabled={busy}
            />
          </label>
          <label className="field">
            <span>Price</span>
            <input
              className="input"
              name="food-price"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              disabled={busy}
            />
          </label>
          <label className="field">
            <span>Vendor</span>
            <select
              className="input"
              name="food-vendor"
              value={form.vendorId}
              onChange={e => setForm(f => ({ ...f, vendorId: e.target.value }))}
              disabled={busy}
            >
              <option value="">Select vendor...</option>
              {vendors.map(vendor => (
                <option key={vendor.vendor_id} value={vendor.vendor_id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Image URL</span>
            <input
              className="input"
              name="food-image"
              value={form.imageUrl}
              onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
              placeholder="https://example.com/dish.jpg"
              disabled={busy}
            />
          </label>
          <button
            className="btn primary"
            type="submit"
            disabled={busy}
            style={{ justifySelf: 'flex-start', width: 'auto' }}
          >
            {busy ? 'Saving...' : 'Add Menu Item'}
          </button>
        </form>
        <div style={{ marginTop: 12 }}>
          {status && <div className="alert success">{status}</div>}
          {formError && <div className="alert error">{formError}</div>}
        </div>
      </Panel>

      <Panel>
        <h3 style={{ marginTop: 0 }}>Add Food Vendor</h3>
        <p className="muted">Vendors link dining items to specific themes.</p>
        <form className="admin-form-grid" onSubmit={handleVendorSubmit}>
          <label className="field">
            <span>Vendor name</span>
            <input
              className="input"
              name="vendor-name"
              value={vendorForm.name}
              onChange={e => setVendorForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Nova Street Eats"
              disabled={vendorBusy}
            />
          </label>
          <label className="field">
            <span>Theme</span>
            <select
              className="input"
              name="vendor-theme"
              value={vendorForm.themeId}
              onChange={e => setVendorForm(f => ({ ...f, themeId: e.target.value }))}
              disabled={vendorBusy}
            >
              <option value="">Select theme...</option>
              {themes.map(theme => (
                <option key={theme.id} value={theme.id}>
                  {theme.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="btn"
            type="submit"
            disabled={vendorBusy}
            style={{ justifySelf: 'flex-start', width: 'auto' }}
          >
            {vendorBusy ? 'Saving...' : 'Add Vendor'}
          </button>
        </form>
        <div style={{ marginTop: 12 }}>
          {vendorStatus && <div className="alert success">{vendorStatus}</div>}
          {vendorError && <div className="alert error">{vendorError}</div>}
        </div>
      </Panel>

      <ResourceTable
        title="Food Menu Items"
        description="Dining choices pulled into the guest experience."
        rows={rows}
        columns={[
          { key: 'name', label: 'Item' },
          { key: 'vendor_name', label: 'Vendor' },
          { key: 'theme_name', label: 'Theme' },
          { key: 'price', label: 'Price', render: val => `$${Number(val || 0).toFixed(2)}` },
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
        emptyMessage="No food items tracked."
        searchPlaceholder="Search menu items..."
        sortableKeys={['name', 'vendor_name', 'theme_name', 'price']}
      />

      <ResourceTable
        title="Food Vendors"
        description="Vendors assigned to each theme."
        rows={vendors}
        columns={[
          { key: 'name', label: 'Vendor' },
          { key: 'theme_name', label: 'Theme' },
          {
            key: 'actions',
            label: 'Actions',
            render: (_, row) => (
              <div className="table-actions">
                <button type="button" className="btn btn-text" onClick={() => openVendorEdit(row)}>
                  Edit
                </button>
                <button type="button" className="btn btn-text danger" onClick={() => openVendorDelete(row)}>
                  Delete
                </button>
              </div>
            ),
          },
        ]}
        loading={false}
        error=""
        emptyMessage="No vendors created yet."
        searchPlaceholder="Search vendors..."
        sortableKeys={['name', 'theme_name']}
      />

      {editItem && (
        <div className="table-modal">
          <div className="table-modal__card">
            <h4>Edit Menu Item</h4>
            <form className="admin-form-grid" onSubmit={handleEditSubmit}>
              <label className="field">
                <span>Menu item</span>
                <input
                  className="input"
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  disabled={editBusy}
                />
              </label>
              <label className="field">
                <span>Price</span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.price}
                  onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))}
                  disabled={editBusy}
                />
              </label>
              <label className="field">
                <span>Vendor</span>
                <select
                  className="input"
                  value={editForm.vendorId}
                  onChange={e => setEditForm(f => ({ ...f, vendorId: e.target.value }))}
                  disabled={editBusy}
                >
                  <option value="">Select vendor...</option>
                  {vendors.map(vendor => (
                    <option key={vendor.vendor_id} value={vendor.vendor_id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
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
            <h4>Delete Menu Item</h4>
            <p>
              Are you sure you want to remove <strong>{deleteItem.name}</strong>?
            </p>
            <div className="table-modal__actions">
              <button type="button" className="btn" onClick={() => setDeleteItem(null)} disabled={deleteBusy}>
                Cancel
              </button>
              <button type="button" className="btn danger" onClick={handleDeleteConfirm} disabled={deleteBusy}>
                {deleteBusy ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editVendor && (
        <div className="table-modal">
          <div className="table-modal__card">
            <h4>Edit Vendor</h4>
            <form className="admin-form-grid" onSubmit={handleVendorEditSubmit}>
              <label className="field">
                <span>Vendor name</span>
                <input
                  className="input"
                  value={editVendorForm.name}
                  onChange={e => setEditVendorForm(f => ({ ...f, name: e.target.value }))}
                  disabled={editVendorBusy}
                />
              </label>
              <label className="field">
                <span>Theme</span>
                <select
                  className="input"
                  value={editVendorForm.themeId}
                  onChange={e => setEditVendorForm(f => ({ ...f, themeId: e.target.value }))}
                  disabled={editVendorBusy}
                >
                  <option value="">Select theme...</option>
                  {themes.map(theme => (
                    <option key={theme.id} value={theme.id}>
                      {theme.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="table-modal__actions">
                <button type="button" className="btn" onClick={() => setEditVendor(null)} disabled={editVendorBusy}>
                  Cancel
                </button>
                <button type="submit" className="btn primary" disabled={editVendorBusy}>
                  {editVendorBusy ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteVendor && (
        <div className="table-modal">
          <div className="table-modal__card">
            <h4>Delete Vendor</h4>
            <p>
              Are you sure you want to remove <strong>{deleteVendor.name}</strong>?
            </p>
            <div className="table-modal__actions">
              <button type="button" className="btn" onClick={() => setDeleteVendor(null)} disabled={deleteVendorBusy}>
                Cancel
              </button>
              <button type="button" className="btn danger" onClick={handleVendorDeleteConfirm} disabled={deleteVendorBusy}>
                {deleteVendorBusy ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
