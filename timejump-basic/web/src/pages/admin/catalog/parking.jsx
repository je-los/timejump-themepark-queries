import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../../auth';
import { Panel, ResourceTable } from '../shared.jsx';
import { notifyDeleteError, notifyDeleteSuccess } from '../../../utils/deleteAlert.js';
import { showToast } from '../../../utils/toast.js';

export default function ParkingPage() {
  const [parking, setParking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ lot: '', price: '' });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [formError, setFormError] = useState('');
  const [editLot, setEditLot] = useState(null);
  const [editForm, setEditForm] = useState({ lot: '', price: '' });
  const [editBusy, setEditBusy] = useState(false);
  const [deleteLot, setDeleteLot] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const loadParking = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api('/parking-lots');
      const list = (res?.data || []).map(item => ({
        lotId: item.lotId ?? item.parking_lot_id ?? null,
        lot: item.lot ?? item.lot_name ?? '',
        price: Number(item.price ?? item.base_price ?? 0),
      }));
      setParking(list);
    } catch (err) {
      setError(err?.message || 'Unable to load parking lots.');
      setParking([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadParking();
  }, [loadParking]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    if (!form.lot.trim()) {
      setFormError('Parking lot name is required.');
      return;
    }
    const priceValue = Number(form.price);
    if (!Number.isFinite(priceValue) || priceValue < 0) {
      setFormError('Base price must be a non-negative number.');
      return;
    }
    setBusy(true);
    setStatus('');
    setFormError('');
    try {
      await api('/parking-lots', {
        method: 'POST',
        body: JSON.stringify({
          lot_name: form.lot.trim(),
          base_price: priceValue,
        }),
      });
      setStatus('Parking lot saved.');
      setForm({ lot: '', price: '' });
      loadParking();
    } catch (err) {
      setFormError(err?.message || 'Request failed.');
    } finally {
      setBusy(false);
    }
  }

  function openEditModal(lot) {
    setEditLot(lot);
    setEditForm({
      lot: lot.lot || '',
      price: lot.price ?? '',
    });
    setEditBusy(false);
  }

  async function handleEditSubmit(event) {
    event.preventDefault();
    if (!editLot || editBusy) return;
    if (!editForm.lot.trim()) {
      setFormError('Lot name is required.');
      return;
    }
    const priceValue = editForm.price === '' ? null : Number(editForm.price);
    if (priceValue !== null && (!Number.isFinite(priceValue) || priceValue < 0)) {
      setFormError('Base price must be a non-negative number.');
      return;
    }
    setEditBusy(true);
    setFormError('');
    try {
      await api(`/parking-lots/${editLot.lotId}`, {
        method: 'PUT',
        body: JSON.stringify({
          lot_name: editForm.lot.trim(),
          base_price: priceValue,
        }),
      });
      setEditLot(null);
      loadParking();
      showToast(`Updated parking lot: ${editForm.lot.trim() || editLot.lot}`, 'success');
    } catch (err) {
      const message = err?.message || 'Unable to update parking lot.';
      setFormError(message);
      showToast(message, 'error');
    } finally {
      setEditBusy(false);
    }
  }

  function openDeleteModal(lot) {
    setDeleteLot(lot);
    setDeleteBusy(false);
  }

  async function handleDeleteConfirm() {
    if (!deleteLot || deleteBusy) return;
    setDeleteBusy(true);
    setFormError('');
    try {
      await api(`/parking-lots/${deleteLot.lotId}`, { method: 'DELETE' });
      const label = deleteLot.lot || `Lot #${deleteLot.lotId}`;
      const message = notifyDeleteSuccess(`Deleted parking lot: ${label}`);
      setDeleteLot(null);
      loadParking();
    } catch (err) {
      setFormError(notifyDeleteError(err, 'Unable to delete parking lot.'));
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <>
      <Panel>
        <h3 style={{ marginTop: 0 }}>Add Parking Lot</h3>
        <p className="muted">Maintain parking options that guests can add to their cart.</p>
        <form className="admin-form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>Lot name</span>
            <input
              className="input"
              value={form.lot}
              onChange={e => setForm(f => ({ ...f, lot: e.target.value }))}
              placeholder="Lot F"
              disabled={busy}
            />
          </label>
          <label className="field">
            <span>Base price</span>
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
        <button
          className="btn primary"
          type="submit"
          disabled={busy}
          style={{ justifySelf: 'flex-start', width: 'auto' }}
        >
          {busy ? 'Saving...' : 'Add Parking Lot'}
        </button>
      </form>
        <div style={{ marginTop: 12 }}>
          {status && <div className="alert success">{status}</div>}
          {formError && <div className="alert error">{formError}</div>}
        </div>
      </Panel>

      <ResourceTable
        title="Parking Lots"
        description="Parking inventory and pricing."
        rows={parking}
        columns={[
          { key: 'lot', label: 'Lot' },
          { key: 'price', label: 'Base Price', render: val => `$${Number(val || 0).toFixed(2)}` },
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
        emptyMessage="No parking lots yet."
        searchPlaceholder="Search parking lots..."
        sortableKeys={['lot', 'price']}
      />

      {editLot && (
        <div className="table-modal">
          <div className="table-modal__card">
            <h4>Edit Parking Lot</h4>
            <form className="admin-form-grid" onSubmit={handleEditSubmit}>
              <label className="field">
                <span>Lot name</span>
                <input
                  className="input"
                  value={editForm.lot}
                  onChange={e => setEditForm(f => ({ ...f, lot: e.target.value }))}
                  disabled={editBusy}
                />
              </label>
              <label className="field">
                <span>Base price</span>
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
              <div className="table-modal__actions">
                <button type="button" className="btn" onClick={() => setEditLot(null)} disabled={editBusy}>
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

      {deleteLot && (
        <div className="table-modal">
          <div className="table-modal__card">
            <h4>Delete Parking Lot</h4>
            <p>
              Are you sure you want to remove <strong>{deleteLot.lot}</strong>?
            </p>
            <div className="table-modal__actions">
              <button type="button" className="btn" onClick={() => setDeleteLot(null)} disabled={deleteBusy}>
                Cancel
              </button>
              <button type="button" className="btn danger" onClick={handleDeleteConfirm} disabled={deleteBusy}>
                {deleteBusy ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
