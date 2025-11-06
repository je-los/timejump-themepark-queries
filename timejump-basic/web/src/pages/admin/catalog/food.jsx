import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../../auth';
import { Panel, ResourceTable } from '../shared.jsx';

export default function FoodPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', price: '' });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [formError, setFormError] = useState('');

  const loadFood = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api('/food-items');
      setRows(res?.data || []);
    } catch (err) {
      setError(err?.message || 'Unable to load menu items.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFood();
  }, [loadFood]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    if (!form.name.trim()) {
      setFormError('Menu item name is required.');
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
        }),
      });
      setStatus('Menu item saved.');
      setForm({ name: '', price: '' });
      loadFood();
    } catch (err) {
      setFormError(err?.message || 'Request failed.');
    } finally {
      setBusy(false);
    }
  }

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
            {busy ? 'Saving...' : 'Add Menu Item'}
          </button>
        </form>
        <div style={{ marginTop: 12 }}>
          {status && <div className="alert success">{status}</div>}
          {formError && <div className="alert error">{formError}</div>}
        </div>
      </Panel>

      <ResourceTable
        title="Food Menu Items"
        description="Dining choices pulled into the guest experience."
        rows={rows}
        columns={[
          { key: 'name', label: 'Item' },
          { key: 'vendor_name', label: 'Vendor' },
          { key: 'price', label: 'Price', render: val => `$${Number(val || 0).toFixed(2)}` },
        ]}
        loading={loading}
        error={error}
        emptyMessage="No food items tracked."
        searchPlaceholder="Search menu items..."
        sortableKeys={['name', 'vendor_name', 'price']}
      />
    </>
  );
}
