import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../../auth';
import { Panel, ResourceTable } from '../shared.jsx';
import { notifyDeleteError, notifyDeleteSuccess } from '../../../utils/deleteAlert.js';
import { showToast } from '../../../utils/toast.js';

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function GiftPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', price: '', imageUrl: '', shopId: '' });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [formError, setFormError] = useState('');
  const [shops, setShops] = useState([]);
  const [themes, setThemes] = useState([]);

  const [shopForm, setShopForm] = useState({ name: '', themeId: '' });
  const [shopBusy, setShopBusy] = useState(false);
  const [shopStatus, setShopStatus] = useState('');
  const [shopError, setShopError] = useState('');

  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', price: '', imageUrl: '', shopId: '' });
  const [editBusy, setEditBusy] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [editShop, setEditShop] = useState(null);
  const [editShopForm, setEditShopForm] = useState({ name: '', themeId: '', closeDate: '' });
  const [editShopBusy, setEditShopBusy] = useState(false);
  const [deleteShop, setDeleteShop] = useState(null);
  const [deleteShopBusy, setDeleteShopBusy] = useState(false);

  const loadGift = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api('/gift-items');
      setRows((res?.data || []).map(item => ({
        ...item,
        image_url: item.image_url ?? item.imageUrl ?? '',
      })));
    } catch (err) {
      setError(err?.message || 'Unable to load gift items.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadShops = useCallback(async () => {
    try {
      const res = await api('/gift-shops');
      setShops(res?.data || []);
    } catch {
      setShops([]);
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
    loadGift();
    loadShops();
    loadThemes();
  }, [loadGift, loadShops, loadThemes]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    if (!form.name.trim()) {
      setFormError('Item name is required.');
      return;
    }
    if (!form.shopId) {
      setFormError('Select a gift shop.');
      return;
    }
    setBusy(true);
    setStatus('');
    setFormError('');
    try {
      await api('/gift-items', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          price: Number(form.price || 0),
          imageUrl: form.imageUrl.trim(),
          shopId: Number(form.shopId),
        }),
      });
      setStatus('Gift shop item saved.');
      setForm({ name: '', price: '', imageUrl: '', shopId: '' });
      loadGift();
    } catch (err) {
      setFormError(err?.message || 'Request failed.');
    } finally {
      setBusy(false);
    }
  }

  const renderImageCell = value => {
    if (!value) return '--';
    const display = value.length > 36 ? `${value.slice(0, 36)}...` : value;
    return (
      <div className="table-image-cell">
        <div className="table-image-cell__thumb">
          <img src={value} alt="Gift preview" loading="lazy" />
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
      price: item.price ?? '',
      imageUrl: item.image_url || '',
      shopId: item.shop_id || '',
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
      setFormError('Item name is required.');
      return;
    }
    if (!editForm.shopId) {
      setFormError('Select a gift shop.');
      return;
    }
    setEditBusy(true);
    setFormError('');
    try {
      await api(`/gift-items/${editItem.item_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editForm.name.trim(),
          price: Number(editForm.price || 0),
          imageUrl: editForm.imageUrl.trim(),
          shopId: Number(editForm.shopId),
        }),
      });
      setEditItem(null);
      loadGift();
      showToast(`Updated gift item: ${editForm.name.trim() || editItem.name}`, 'success');
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
      await api(`/gift-items/${deleteItem.item_id}`, { method: 'DELETE' });
      const label = deleteItem.name || `Item #${deleteItem.item_id}`;
      const message = notifyDeleteSuccess(`Deleted gift item: ${label}`);
      setDeleteItem(null);
      loadGift();
    } catch (err) {
      setFormError(notifyDeleteError(err, 'Unable to delete item.'));
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleShopSubmit(event) {
    event.preventDefault();
    if (shopBusy) return;
    if (!shopForm.name.trim()) {
      setShopError('Shop name is required.');
      return;
    }
    if (!shopForm.themeId) {
      setShopError('Theme is required.');
      return;
    }
    setShopBusy(true);
    setShopStatus('');
    setShopError('');
    try {
      await api('/gift-shops', {
        method: 'POST',
        body: JSON.stringify({
          name: shopForm.name.trim(),
          themeId: Number(shopForm.themeId),
          openDate: todayIso(),
        }),
      });
      setShopStatus('Gift shop saved.');
      setShopForm({ name: '', themeId: '' });
      loadShops();
    } catch (err) {
      setShopError(err?.message || 'Unable to save gift shop.');
    } finally {
      setShopBusy(false);
    }
  }

  function openEditShop(shop) {
    setEditShop(shop);
    setEditShopForm({
      name: shop.name || '',
      themeId: shop.theme_id || '',
      closeDate: shop.close_date || '',
    });
    setEditShopBusy(false);
  }

  function openDeleteShop(shop) {
    setDeleteShop(shop);
    setDeleteShopBusy(false);
  }

  async function handleEditShopSubmit(event) {
    event.preventDefault();
    if (!editShop || editShopBusy) return;
    if (!editShopForm.name.trim()) {
      setShopError('Shop name is required.');
      return;
    }
    if (!editShopForm.themeId) {
      setShopError('Theme is required.');
      return;
    }
    setEditShopBusy(true);
    setShopError('');
    try {
      await api(`/gift-shops/${editShop.shop_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editShopForm.name.trim(),
          themeId: Number(editShopForm.themeId),
          closeDate: editShopForm.closeDate || null,
        }),
      });
      setEditShop(null);
      loadShops();
      showToast(`Updated gift shop: ${editShopForm.name.trim() || editShop.name}`, 'success');
    } catch (err) {
      const message = err?.message || 'Unable to update gift shop.';
      setShopError(message);
      showToast(message, 'error');
    } finally {
      setEditShopBusy(false);
    }
  }

  async function handleDeleteShopConfirm() {
    if (!deleteShop || deleteShopBusy) return;
    setDeleteShopBusy(true);
    setShopError('');
    try {
      await api(`/gift-shops/${deleteShop.shop_id}`, { method: 'DELETE' });
      const label = deleteShop.name || `Shop #${deleteShop.shop_id}`;
      const message = notifyDeleteSuccess(`Deleted gift shop: ${label}`);
      setDeleteShop(null);
      loadShops();
    } catch (err) {
      setShopError(notifyDeleteError(err, 'Unable to delete gift shop.'));
    } finally {
      setDeleteShopBusy(false);
    }
  }

  return (
    <>
      <Panel>
        <h3 style={{ marginTop: 0 }}>Add Gift Shop Item</h3>
        <p className="muted">Highlight souvenirs that appear on the shopping page.</p>
        <form className="admin-form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>Item name</span>
            <input
              className="input"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Time Beacon Snow Globe"
              disabled={busy}
            />
          </label>
          <label className="field">
            <span>Price</span>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              disabled={busy}
            />
          </label>
          <label className="field">
            <span>Gift shop</span>
            <select
              className="input"
              value={form.shopId}
              onChange={e => setForm(f => ({ ...f, shopId: e.target.value }))}
              disabled={busy}
            >
              <option value="">Select shop...</option>
              {shops.map(shop => (
                <option key={shop.shop_id} value={shop.shop_id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Image URL</span>
            <input
              className="input"
              value={form.imageUrl}
              onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
              placeholder="https://example.com/gift.png"
              disabled={busy}
            />
          </label>
          <button
            className="btn primary"
            type="submit"
            disabled={busy}
            style={{ justifySelf: 'flex-start', width: 'auto' }}
          >
            {busy ? 'Saving...' : 'Add Gift Item'}
          </button>
        </form>
        <div style={{ marginTop: 12 }}>
          {status && <div className="alert success">{status}</div>}
          {formError && <div className="alert error">{formError}</div>}
        </div>
      </Panel>

      <Panel>
        <h3 style={{ marginTop: 0 }}>Add Gift Shop</h3>
        <p className="muted">Create shops and link them to lands.</p>
        <form className="admin-form-grid" onSubmit={handleShopSubmit}>
          <label className="field">
            <span>Shop name</span>
            <input
              className="input"
              value={shopForm.name}
              onChange={e => setShopForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Chrono Curios"
              disabled={shopBusy}
            />
          </label>
          <label className="field">
            <span>Theme</span>
            <select
              className="input"
              value={shopForm.themeId}
              onChange={e => setShopForm(f => ({ ...f, themeId: e.target.value }))}
              disabled={shopBusy}
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
            disabled={shopBusy}
            style={{ justifySelf: 'flex-start', width: 'auto' }}
          >
            {shopBusy ? 'Saving...' : 'Add Gift Shop'}
          </button>
        </form>
        <div style={{ marginTop: 12 }}>
          {shopStatus && <div className="alert success">{shopStatus}</div>}
          {shopError && <div className="alert error">{shopError}</div>}
        </div>
      </Panel>

      <ResourceTable
        title="Gift Shop Items"
        description="Souvenir lineup available to guests."
        rows={rows}
        columns={[
          { key: 'name', label: 'Item' },
          { key: 'shop_name', label: 'Shop' },
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
        emptyMessage="No gift items tracked."
        searchPlaceholder="Search gift items..."
        sortableKeys={['name', 'price']}
      />
  <ResourceTable
    title="Gift Shops"
    description="Shops available across each theme."
    rows={shops}
    columns={[
      { key: 'name', label: 'Shop' },
      { key: 'theme_name', label: 'Theme' },
      {
        key: 'actions',
        label: 'Actions',
        render: (_, row) => (
          <div className="table-actions">
            <button type="button" className="btn btn-text" onClick={() => openEditShop(row)}>
              Edit
            </button>
            <button type="button" className="btn btn-text danger" onClick={() => openDeleteShop(row)}>
              Delete
            </button>
          </div>
        ),
      },
    ]}
    loading={false}
    error=""
    emptyMessage="No gift shops created."
    searchPlaceholder="Search gift shops..."
        sortableKeys={['name', 'theme_name']}
      />

      {editItem && (
        <div className="table-modal">
          <div className="table-modal__card">
            <h4>Edit Gift Item</h4>
            <form className="admin-form-grid" onSubmit={handleEditSubmit}>
              <label className="field">
                <span>Item name</span>
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
                <span>Gift shop</span>
                <select
                  className="input"
                  value={editForm.shopId}
                  onChange={e => setEditForm(f => ({ ...f, shopId: e.target.value }))}
                  disabled={editBusy}
                >
                  <option value="">Select shop...</option>
                  {shops.map(shop => (
                    <option key={shop.shop_id} value={shop.shop_id}>
                      {shop.name}
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
            <h4>Delete Gift Item</h4>
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

      {editShop && (
        <div className="table-modal">
          <div className="table-modal__card">
            <h4>Edit Gift Shop</h4>
            <form className="admin-form-grid" onSubmit={handleEditShopSubmit}>
              <label className="field">
                <span>Shop name</span>
                <input
                  className="input"
                  value={editShopForm.name}
                  onChange={e => setEditShopForm(f => ({ ...f, name: e.target.value }))}
                  disabled={editShopBusy}
                />
              </label>
              <label className="field">
                <span>Theme</span>
                <select
                  className="input"
                  value={editShopForm.themeId}
                  onChange={e => setEditShopForm(f => ({ ...f, themeId: e.target.value }))}
                  disabled={editShopBusy}
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
                <span>Close date (optional)</span>
                <input
                  className="input"
                  type="date"
                  value={editShopForm.closeDate}
                  onChange={e => setEditShopForm(f => ({ ...f, closeDate: e.target.value }))}
                  disabled={editShopBusy}
                />
              </label>
              <div className="table-modal__actions">
                <button type="button" className="btn" onClick={() => setEditShop(null)} disabled={editShopBusy}>
                  Cancel
                </button>
                <button type="submit" className="btn primary" disabled={editShopBusy}>
                  {editShopBusy ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteShop && (
        <div className="table-modal">
          <div className="table-modal__card">
            <h4>Delete Gift Shop</h4>
            <p>
              Are you sure you want to remove <strong>{deleteShop.name}</strong>?
            </p>
            <div className="table-modal__actions">
              <button type="button" className="btn" onClick={() => setDeleteShop(null)} disabled={deleteShopBusy}>
                Cancel
              </button>
              <button type="button" className="btn danger" onClick={handleDeleteShopConfirm} disabled={deleteShopBusy}>
                {deleteShopBusy ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
