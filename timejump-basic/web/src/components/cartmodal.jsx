import React, { useEffect, useMemo, useState } from 'react';
import { useCart } from '../context/cartcontext.jsx';
import { api } from '../auth.js';
import { useAuth } from '../context/authcontext.jsx';

const formatCurrency = value => `$${Number(value || 0).toFixed(2)}`;

function formatVisitDate(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CartModal({ onClose }) {
  const { user } = useAuth();
  const { items, add, remove, updateQty, total, clear } = useCart();
  const [parkingOptions, setParkingOptions] = useState([]);
  const [parkingLoading, setParkingLoading] = useState(false);
  const [parkingError, setParkingError] = useState('');
  const [selectedLot, setSelectedLot] = useState('');
  const [checkoutStatus, setCheckoutStatus] = useState('');
  const [checkoutTone, setCheckoutTone] = useState('info');
  const [checkoutDetail, setCheckoutDetail] = useState('');
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (parkingOptions.length || parkingLoading) return;

    setParkingLoading(true);
    setParkingError('');
    api('/parking/options')
      .then(res => {
        if (cancelled) return;
        const data = Array.isArray(res?.data) ? res.data : [];
        setParkingOptions(
          data.map(item => {
            const lotId = item.lotId ?? item.parking_lot_id ?? null;
            const name = item.lot ?? item.lot_name ?? '';
            const id = lotId !== null && lotId !== undefined ? String(lotId) : name;
            return {
              id,
              name,
              price: Number(item.price ?? item.base_price ?? 0),
            };
          }),
        );
      })
      .catch(err => {
        if (cancelled) return;
        setParkingError(err?.message || 'Unable to load parking lots.');
        setParkingOptions([]);
      })
      .finally(() => {
        if (!cancelled) setParkingLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedLot && parkingOptions.length) {
      setSelectedLot(parkingOptions[0].id);
    }
  }, [parkingOptions, selectedLot]);

  const hasParkingItem = useMemo(
    () => items.some(item => item.kind === 'parking'),
    [items],
  );

  function handleAddParkingFromCart() {
    const option = parkingOptions.find(opt => opt.id === selectedLot);
    if (!option) return;
    add({
      id: `parking-${option.id}`,
      name: `Parking - ${option.name}`,
      price: Number(option.price ?? 0),
      kind: 'parking',
      qty: 1,
      meta: { lot: option.name },
    });
  }

  async function handleCheckout() {
    if (!items.length) {
      setCheckoutStatus('Your cart is empty.');
      setCheckoutDetail('');
      setCheckoutTone('warning');
      return;
    }
    if (!user) {
      setCheckoutStatus('Please sign in to complete your purchase.');
      setCheckoutDetail('');
      setCheckoutTone('warning');
      return;
    }
    if (user.role !== 'customer') {
      setCheckoutStatus('Only customer accounts can complete ticket purchases.');
      setCheckoutDetail('');
      setCheckoutTone('warning');
      return;
    }

    const orderTotal = total;
    const itemCount = items.reduce((sum, item) => sum + Number(item.qty || 1), 0);

    setCheckoutBusy(true);
    setCheckoutStatus('');
    setCheckoutDetail('');
    try {
      const payload = {
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          kind: item.kind,
          price: Number(item.price || 0),
          qty: Number(item.qty || 1),
          meta: item.meta || null,
        })),
      };
      const res = await api('/checkout', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setCheckoutTone('success');
      setCheckoutStatus(res?.message || 'Order confirmed!');
      setCheckoutDetail(
        `We processed ${itemCount} item${itemCount === 1 ? '' : 's'} for ${formatCurrency(orderTotal)}. A confirmation is headed to ${user.email || 'your email'}.`,
      );
      clear();
    } catch (err) {
      setCheckoutTone('error');
      setCheckoutStatus(err?.message || 'Unable to complete checkout right now.');
      setCheckoutDetail('');
    } finally {
      setCheckoutBusy(false);
    }
  }

  if (checkoutTone === 'success' && checkoutStatus) {
    return (
      <div className="ticket-alert" role="alert">
        <div className="ticket-alert__card">
          <strong>{checkoutStatus}</strong>
          {checkoutDetail && <p>{checkoutDetail}</p>}
          <button
            className="btn primary"
            onClick={() => {
              setCheckoutStatus('');
              setCheckoutDetail('');
              setCheckoutTone('info');
              onClose();
            }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Shopping Cart</h3>
          <button className="btn" onClick={onClose}>Close</button>
        </div>

        {items.length === 0 ? (
          <div className="modal-body">
            <div className="panel" style={{ textAlign: 'center' }}>Your cart is empty.</div>
          </div>
        ) : (
          <>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {items.map((it, idx) => {
                const visitLabel = formatVisitDate(it.meta?.visitDate);
                const lotLabel = it.kind === 'parking' && it.meta?.lot
                  ? `Lot: ${it.meta.lot}`
                  : '';
                const detailLines = [];
                if (visitLabel) detailLines.push(`Visit date: ${visitLabel}`);
                if (lotLabel) detailLines.push(lotLabel);

                return (
                  <div key={idx} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{it.name}</div>
                        {detailLines.map((line, infoIdx) => (
                          <div key={infoIdx} className="cart-item-detail">{line}</div>
                        ))}
                      </div>
                      <div style={{ fontWeight: 700 }}>${Number(it.price || 0).toFixed(2)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                      <label style={{ fontSize: 12 }}>Qty</label>
                      <input
                        className="input"
                        type="number"
                        min={1}
                        value={it.qty}
                        onChange={e => updateQty(idx, Math.max(1, Number(e.target.value) || 1))}
                        style={{ width: 72 }}
                      />
                      <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => remove(idx)}>Remove</button>
                    </div>
                  </div>
                );
              })}


              {!hasParkingItem && (
                <div className="card">
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Need parking?</div>
                  {parkingLoading && <div className="muted" style={{ fontSize: 12 }}>Loading parking options...</div>}
                  {!parkingLoading && parkingError && (
                    <div className="alert error" style={{ fontSize: 12 }}>{parkingError}</div>
                  )}
                  {!parkingLoading && !parkingError && parkingOptions.length === 0 && (
                    <div className="muted" style={{ fontSize: 12 }}>No parking lots available right now.</div>
                  )}
                  {!parkingLoading && !parkingError && parkingOptions.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <select className="input" value={selectedLot} onChange={e => setSelectedLot(e.target.value)}>
                        {parkingOptions.map(opt => (
                          <option key={opt.id} value={opt.id}>
                            {opt.name} - ${opt.price.toFixed(2)}
                          </option>
                        ))}
                      </select>
                      <button className="btn primary" onClick={handleAddParkingFromCart}>Add Parking</button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="muted">Total</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{formatCurrency(total)}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn" onClick={clear}>Clear</button>
                <button className="btn primary" onClick={handleCheckout} disabled={checkoutBusy}>
                  {checkoutBusy ? 'Processing...' : 'Checkout'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
