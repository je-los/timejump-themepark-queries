import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authcontext.jsx';
import { useCart } from '../context/cartcontext.jsx';

const CATEGORY_ORDER = ['day', 'annual', 'birthday', 'other'];

function categorizeTicket(name = '') {
  const lc = name.toLowerCase();
  if (lc.includes('annual') || lc.includes('season') || lc.includes('year')) return 'annual';
  if (lc.includes('birthday')) return 'birthday';
  return 'day';
}

function formatCategory(cat) {
  switch (cat) {
    case 'day':
      return 'Day Tickets';
    case 'annual':
      return 'Annual Passes';
    case 'birthday':
      return 'Birthday Packages';
    case 'other':
      return 'Special Offers';
    default:
      return cat;
  }
}

function ticketKey(ticket = {}) {
  const identifier =
    ticket.name ||
    ticket.ticket_type ||
    ticket.ticketType ||
    ticket.id ||
    ticket.ticketId ||
    ticket.slug;
  return String(identifier ?? JSON.stringify(ticket));
}

function formatCurrency(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function parseDateOnly(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateLabel(value) {
  const date = parseDateOnly(value);
  if (!date) return '';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

const QTY_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);

export default function TicketCatalog({ filter = 'all' }) {
  const { user } = useAuth();
  const { add, items: cartItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [tickets, setTickets] = useState([]);
  const [parkingOptions, setParkingOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [statusDetail, setStatusDetail] = useState('');
  const [statusTone, setStatusTone] = useState('info');
  const statusTimer = useRef(null);

  const [ticketSelections, setTicketSelections] = useState({});
  const [visitDate, setVisitDate] = useState('');
  const [includeParking, setIncludeParking] = useState(false);
  const [selectedParkingId, setSelectedParkingId] = useState('');
  const [plannerAlert, setPlannerAlert] = useState(null);

  const minDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  function showStatus(message, tone = 'info', detail = '') {
    if (statusTimer.current) {
      window.clearTimeout(statusTimer.current);
    }
    setStatusTone(tone);
    setStatus(message);
    setStatusDetail(detail);
    statusTimer.current = window.setTimeout(() => {
      setStatus('');
      setStatusDetail('');
      statusTimer.current = null;
    }, 3500);
  }

  useEffect(() => {
    return () => {
      if (statusTimer.current) {
        window.clearTimeout(statusTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!plannerAlert) return;
    const id = window.setTimeout(() => setPlannerAlert(null), 3000);
    return () => window.clearTimeout(id);
  }, [plannerAlert]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      fetch(`${import.meta.env.VITE_API_URL}/ticket-types`),
      fetch(`${import.meta.env.VITE_API_URL}/parking/options`).catch(() => null),
    ])
      .then(async ([ticketRes, parkingRes]) => {
        if (!active) return;
        if (!ticketRes?.ok) throw new Error('Failed to load tickets');
        const ticketJson = await ticketRes.json();
        const parkingJson = parkingRes && parkingRes.ok ? await parkingRes.json() : { data: [] };
        setTickets(ticketJson?.data || []);
        setParkingOptions(
          (parkingJson?.data || []).map(item => {
            const lotId = item.lotId ?? item.parking_lot_id ?? null;
            const name = item.lot ?? item.lot_name ?? '';
            const id = lotId !== null && lotId !== undefined ? String(lotId) : name;
            return {
              id,
              lotId,
              name,
              price: Number(item.price ?? item.base_price ?? 0),
            };
          }),
        );
        setError('');
      })
      .catch(err => {
        if (!active) return;
        setError(err?.message || 'Unable to load ticket options.');
        setTickets([]);
        setParkingOptions([]);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  function resetForm() {
    console.log("RESETTING FORM in TicketCatalog.jsx");

    setVisitDate('');

    setIncludeParking(false);
    setSelectedParkingId('');
    setTicketSelections(prevSelections => {
      const resetSelections = {};
      tickets.forEach(ticket => {
        const key = ticketKey(ticket);
        resetSelections[key] = { selected: false, qty: 1 };
      });
      return resetSelections;
    });
  }
  const grouped = useMemo(() => {
    const groups = { day: [], annual: [], birthday: [], other: [] };
    tickets.forEach(ticket => {
      const category = categorizeTicket(ticket.name);
      groups[category].push(ticket);
    });
    return groups;
  }, [tickets]);

  const visibleCategories =
    filter === 'all' ? CATEGORY_ORDER : CATEGORY_ORDER.filter(cat => cat === filter);

  const visibleTickets = useMemo(
    () => visibleCategories.flatMap(category => grouped[category] || []),
    [grouped, visibleCategories],
  );

  const selectedParking = useMemo(
    () => parkingOptions.find(option => option.id === selectedParkingId) || null,
    [parkingOptions, selectedParkingId],
  );

  useEffect(() => {
    setTicketSelections(prev => {
      const next = {};
      tickets.forEach(ticket => {
        const key = ticketKey(ticket);
        const existing = prev[key] || { selected: false, qty: 1 };
        next[key] = {
          selected: existing.selected,
          qty: Math.max(1, Number(existing.qty) || 1),
        };
      });
      return next;
    });
  }, [tickets]);

  useEffect(() => {
    if (includeParking && parkingOptions.length && !selectedParkingId) {
      setSelectedParkingId(parkingOptions[0].id);
    }
    if (!parkingOptions.length) {
      setIncludeParking(false);
      setSelectedParkingId('');
    }
  }, [includeParking, parkingOptions, selectedParkingId]);

  const parkingAvailable = parkingOptions.length > 0;

  function requireCustomerAccount() {
    if (!user) {
      const redirect = `${location.pathname}${location.search || ''}`;
      navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
      showStatus('Sign in as a customer to add tickets to cart.', 'warning');
      return false;
    }
    if (user.role !== 'customer') {
      showStatus('Ticket purchases are limited to customer accounts.', 'warning');
      return false;
    }
    return true;
  }

  const selectedTickets = useMemo(() => {
    return visibleTickets.filter(ticket => ticketSelections[ticketKey(ticket)]?.selected);
  }, [visibleTickets, ticketSelections]);

  function handleSelectionChange(key, checked) {
    setTicketSelections(prev => ({
      ...prev,
      [key]: {
        selected: checked,
        qty: Math.max(1, Number(prev[key]?.qty) || 1),
      },
    }));
  }

  function handleQtyChange(key, value) {
    const qtyValue = Math.max(1, Number(value) || 1);
    setTicketSelections(prev => ({
      ...prev,
      [key]: {
        selected: prev[key]?.selected ?? true,
        qty: qtyValue,
      },
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const redirect = `${location.pathname}${location.search || ''}`;
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
      return;
    }
    if (!requireCustomerAccount()) return;
    const existingVisit = cartItems
      .map(item => item?.meta?.visitDate)
      .find(date => typeof date === 'string' && date.trim());
    if (existingVisit && existingVisit !== visitDate) {
      setPlannerAlert({
        type: 'date',
        message: `Your cart already includes tickets for ${formatDateLabel(existingVisit)}. Remove them or select the same date.`,
      });
      return;
    }
    if (!visitDate) {
      setPlannerAlert({
        type: 'date',
        message: 'Choose your visit date before adding to cart.',
      });
      return;
    }
    if (!selectedTickets.length) {
      setPlannerAlert({
        type: 'ticket',
        message: 'Select at least one ticket to continue.',
      });
      return;
    }

    let detailParts = [];

    selectedTickets.forEach(ticket => {
      const key = ticketKey(ticket);
      const entry = ticketSelections[key];
      const qty = Number(entry?.qty || 1);
      const ticketMeta = {
        category: categorizeTicket(ticket.name),
        visitDate,
      };

      add({
        id: `${key}-${visitDate}`,
        name: ticket.name,
        price: Number(ticket.price ?? 0),
        kind: 'ticket',
        qty,
        meta: ticketMeta,
      });

      detailParts.push(`${qty}x ${ticket.name}`);
    });

    if (includeParking) {
      if (!parkingAvailable) {
        showStatus('Parking add-ons are not available right now.', 'warning');
        return;
      }
      if (!selectedParking) {
        showStatus('Select a parking lot to continue.', 'warning');
        return;
      }
      add({
        id: `parking-${selectedParking.id}-${visitDate}`,
        name: `Parking - ${selectedParking.name}`,
        price: selectedParking.price ?? 0,
        kind: 'parking',
        qty: 1,
        meta: {
          lot: selectedParking.name,
          visitDate,
        },
      });
      detailParts.push(`Parking: ${selectedParking.name}`);
    }
    const detailSummary = detailParts.join(' - ');
    showStatus('Items added to your cart.', 'success', detailSummary);
    resetForm();
  }

  return (
    <div className="page">
      <div className="page-box page-box--tickets">
        <header style={{ marginBottom: 16 }}>
          <h1>Buy Tickets</h1>
        </header>

        {user && user.role !== 'customer' && (
          <div className="alert warning">
            Ticket purchases are available to customer accounts only.
          </div>
        )}

        {status && (
          <div
            className={`status-banner status-banner--${statusTone}`}
            role="status"
            aria-live="polite"
          >
            <div className="status-banner__title">{status}</div>
            {statusDetail && <div className="status-banner__detail">{statusDetail}</div>}
          </div>
        )}

        <div className="ticket-date-focus">
          <label className="ticket-date-control">
            <span className="ticket-date-control__label">Visit date</span>
            <input
              className="ticket-date-control__input"
              type="date"
              min={minDate}
              value={visitDate}
              onChange={e => setVisitDate(e.target.value)}
              required
            />
          </label>
        </div>

        {loading && <p className="text-sm">Loading ticket options...</p>}
        {error && <p className="alert error">{error}</p>}
        {!loading &&
          !error &&
          visibleCategories.every(cat => grouped[cat].length === 0) && (
            <p className="text-sm">No tickets found for this category.</p>
          )}

        <div className="ticket-stack">
          {!loading &&
            !error &&
            visibleCategories.map(category => (
              grouped[category].length > 0 && (
                <section key={category} className="ticket-section">
                  <div className="ticket-table" aria-label={`${formatCategory(category)} tickets`}>
                    <div className="ticket-table__head ticket-table__head--multiselect">
                      <span>Choose</span>
                      <span>Details</span>
                      <span>Qty</span>
                      <span>Price</span>
                    </div>
                    {grouped[category].map(ticket => {
                      const key = ticketKey(ticket);
                      const state = ticketSelections[key] || { selected: false, qty: 1 };
                      return (
                        <label
                          key={key}
                          className={`ticket-row ticket-row--multiselect ${state.selected ? 'ticket-row--active' : ''}`}
                        >
                          <span className="ticket-row__control">
                            <input
                              type="checkbox"
                              checked={state.selected}
                              onChange={e => handleSelectionChange(key, e.target.checked)}
                            />
                          </span>
                          <div className="ticket-row__info">
                            <div className="ticket-row__name">{ticket.name}</div>
                          </div>
                          <div className="ticket-row__qty">
                            <select
                              className="input"
                              value={state.qty}
                              onChange={e => handleQtyChange(key, e.target.value)}
                              disabled={!state.selected}
                            >
                              {QTY_OPTIONS.map(option => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="ticket-row__price">{formatCurrency(ticket.price)}</div>
                        </label>
                      );
                    })}
                  </div>
                </section>
              )
            ))}
        </div>

        <form className="ticket-planner" onSubmit={handleSubmit}>
          <div className="ticket-planner__card">
            <div>
              <h3>Your Selection</h3>
              <div style={{ fontSize: '0.9rem', color: '#0f172a' }}>
                {selectedTickets.length
                  ? `${selectedTickets.length} ticket type${selectedTickets.length === 1 ? '' : 's'} selected`
                  : 'Select one or more ticket types from the list.'}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#0f172a' }}>
                {visitDate
                  ? `Visit date locked to ${formatDateLabel(visitDate)}`
                  : 'Pick your visit date above to enable checkout.'}
              </div>
            </div>

            <label className="ticket-checkbox">
              <input
                type="checkbox"
                checked={includeParking}
                disabled={!parkingAvailable}
                onChange={e => setIncludeParking(e.target.checked)}
              />
              <span>Reserve parking (optional)</span>
            </label>

            {includeParking && parkingAvailable && (
              <label className="ticket-field">
                Parking lot
                <select
                  className="input"
                  value={selectedParkingId}
                  onChange={e => setSelectedParkingId(e.target.value)}
                  required
                >
                  {parkingOptions.map(option => (
                    <option key={option.id} value={option.id}>
                      {option.name} — {formatCurrency(option.price)}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <button
              type="submit"
              className="btn primary"
            >
              Add to cart
            </button>
          </div>
        </form>
        {plannerAlert && (
          <div className="ticket-alert" role="alert">
            <div className="ticket-alert__card">
              <strong>
                {plannerAlert.type === 'date' ? 'Pick a date' : 'Choose a ticket'}
              </strong>
              <p>{plannerAlert.message}</p>
              <button className="btn primary" onClick={() => setPlannerAlert(null)}>
                Got it
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
