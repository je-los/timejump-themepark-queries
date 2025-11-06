import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../../auth';
import { Panel, ResourceTable } from '../shared.jsx';

export default function ParkingPage() {
  const [parking, setParking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ lot: '', price: '' });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [formError, setFormError] = useState('');

  const loadParking = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api('/parking-lots');
      const list = (res?.data || []).map(item => {
        const serviceDate = item.serviceDate ?? item.service_date ?? null;
        const passes = item.passesToday ?? item.passes_today ?? null;
        return {
          lotId: item.lotId ?? item.parking_lot_id ?? null,
          lot: item.lot ?? item.lot_name ?? '',
          price: Number(item.price ?? item.base_price ?? 0),
          serviceDate: serviceDate ? String(serviceDate) : null,
          passesToday: passes !== null && passes !== undefined ? Number(passes) : null,
        };
      });
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

  async function handleSubmit(e) {
    e.preventDefault();
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
          { key: 'serviceDate', label: 'Last Serviced' },
          { key: 'passesToday', label: 'Passes Today' },
        ]}
        loading={loading}
        error={error}
        emptyMessage="No parking lots yet."
        searchPlaceholder="Search parking lots..."
        sortableKeys={['lot', 'price', 'passesToday']}
      />
    </>
  );
}
