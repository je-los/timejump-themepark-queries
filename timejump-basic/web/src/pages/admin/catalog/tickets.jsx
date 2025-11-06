import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../../auth';
import { Panel, ResourceTable } from '../shared.jsx';

export default function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', price: '' });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [formError, setFormError] = useState('');

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api('/ticket-types');
      const list = (res?.data || []).map(item => ({
        id: item.ticket_type ?? item.name ?? item.id,
        name: item.name ?? item.ticket_type ?? 'Ticket',
        price: Number(item.price ?? 0),
      }));
      setTickets(list);
    } catch (err) {
      setError(err?.message || 'Unable to load ticket types.');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    if (!form.name.trim()) {
      setFormError('Ticket name is required.');
      return;
    }
    setBusy(true);
    setStatus('');
    setFormError('');
    try {
      await api('/ticket-types', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          price: Number(form.price || 0),
        }),
      });
      setStatus('Ticket type saved.');
      setForm({ name: '', price: '' });
      loadTickets();
    } catch (err) {
      setFormError(err?.message || 'Request failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Panel>
        <h3 style={{ marginTop: 0 }}>Add Ticket Type</h3>
        <p className="muted">Create passes that appear in checkout for guests.</p>
        <form className="admin-form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>Ticket name</span>
            <input
              className="input"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Adult, Child, VIP"
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
            {busy ? 'Saving...' : 'Add Ticket Type'}
          </button>
        </form>
        <div style={{ marginTop: 12 }}>
          {status && <div className="alert success">{status}</div>}
          {formError && <div className="alert error">{formError}</div>}
        </div>
      </Panel>

      <ResourceTable
        title="Ticket Types"
        description="Passes available to customers in checkout."
        rows={tickets}
        columns={[
          { key: 'name', label: 'Ticket' },
          { key: 'price', label: 'Price', render: val => `$${Number(val || 0).toFixed(2)}` },
        ]}
        loading={loading}
        error={error}
        emptyMessage="No tickets yet."
        searchPlaceholder="Search ticket types..."
        sortableKeys={['name', 'price']}
      />
    </>
  );
}
