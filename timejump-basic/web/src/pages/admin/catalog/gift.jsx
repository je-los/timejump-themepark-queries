import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../../auth';
import { Panel, ResourceTable } from '../shared.jsx';

export default function GiftPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', price: '' });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [formError, setFormError] = useState('');

  const loadGift = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api('/gift-items');
      setRows(res?.data || []);
    } catch (err) {
      setError(err?.message || 'Unable to load gift items.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGift();
  }, [loadGift]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    if (!form.name.trim()) {
      setFormError('Item name is required.');
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
        }),
      });
      setStatus('Gift shop item saved.');
      setForm({ name: '', price: '' });
      loadGift();
    } catch (err) {
      setFormError(err?.message || 'Request failed.');
    } finally {
      setBusy(false);
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

      <ResourceTable
        title="Gift Shop Items"
        description="Souvenir lineup available to guests."
        rows={rows}
        columns={[
          { key: 'name', label: 'Item' },
          { key: 'shop_name', label: 'Shop' },
          { key: 'price', label: 'Price', render: val => `$${Number(val || 0).toFixed(2)}` },
        ]}
        loading={loading}
        error={error}
        emptyMessage="No gift items tracked."
        searchPlaceholder="Search gift items..."
        sortableKeys={['name', 'price']}
      />
    </>
  );
}
