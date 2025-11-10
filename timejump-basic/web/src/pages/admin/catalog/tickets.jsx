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
  const [editTicket, setEditTicket] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', price: '' });
  const [editBusy, setEditBusy] = useState(false);
  const [deleteTicket, setDeleteTicket] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api('/ticket-types');
      const list = (res?.data || []).map(item => {
        const key = item.name ?? item.ticket_type ?? item.id ?? '';
        return {
          id: key,
          key,
          name: item.name ?? item.ticket_type ?? 'Ticket',
          price: Number(item.price ?? 0),
        };
      });
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

  async function handleSubmit(event) {
    event.preventDefault();
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

  function openEditModal(ticket) {
    setEditTicket(ticket);
    setEditForm({
      name: ticket.name || '',
      price: ticket.price ?? '',
    });
    setEditBusy(false);
  }

  async function handleEditSubmit(event) {
    event.preventDefault();
    if (!editTicket || editBusy) return;
    if (!editForm.name.trim()) {
      setFormError('Ticket name is required.');
      return;
    }
    setEditBusy(true);
    setFormError('');
    try {
      await api(`/ticket-types/${encodeURIComponent(editTicket.key)}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editForm.name.trim(),
          price: Number(editForm.price || 0),
        }),
      });
      setEditTicket(null);
      loadTickets();
    } catch (err) {
      setFormError(err?.message || 'Unable to update ticket type.');
    } finally {
      setEditBusy(false);
    }
  }

  function openDeleteModal(ticket) {
    setDeleteTicket(ticket);
    setDeleteBusy(false);
  }

  async function handleDeleteConfirm() {
    if (!deleteTicket || deleteBusy) return;
    setDeleteBusy(true);
    setFormError('');
    try {
      await api(`/ticket-types/${encodeURIComponent(deleteTicket.key)}`, { method: 'DELETE' });
      setDeleteTicket(null);
      loadTickets();
    } catch (err) {
      setFormError(err?.message || 'Unable to delete ticket type.');
    } finally {
      setDeleteBusy(false);
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
        emptyMessage="No tickets yet."
        searchPlaceholder="Search ticket types..."
        sortableKeys={['name', 'price']}
      />

      {editTicket && (
        <div className="table-modal">
          <div className="table-modal__card">
            <h4>Edit Ticket Type</h4>
            <form className="admin-form-grid" onSubmit={handleEditSubmit}>
              <label className="field">
                <span>Ticket name</span>
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
              <div className="table-modal__actions">
                <button type="button" className="btn" onClick={() => setEditTicket(null)} disabled={editBusy}>
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

      {deleteTicket && (
        <div className="table-modal">
          <div className="table-modal__card">
            <h4>Delete Ticket Type</h4>
            <p>
              Are you sure you want to remove <strong>{deleteTicket.name}</strong>?
            </p>
            <div className="table-modal__actions">
              <button type="button" className="btn" onClick={() => setDeleteTicket(null)} disabled={deleteBusy}>
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
