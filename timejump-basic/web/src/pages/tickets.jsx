import React, { useEffect, useMemo, useState } from 'react';
import { useCart } from '../context/cartcontext.jsx';
import { useAuth } from '../context/authcontext.jsx';
import { api } from '../auth.js';

export default function Tickets() {
  const { add } = useCart();
  const { user } = useAuth();
  const isCustomer = user?.role === 'customer';

  const [ticketTypes, setTicketTypes] = useState([]);
  const [parkingLots, setParkingLots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [passType, setPassType] = useState('');
  const [qty, setQty] = useState(1);
  const [includeParking, setIncludeParking] = useState(false);
  const [parkingLot, setParkingLot] = useState('');
  const [parkingQty, setParkingQty] = useState(1);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [ticketRes, parkingRes] = await Promise.all([
          api('/ticket-types'),
          api('/parking/options').catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        const tickets = Array.isArray(ticketRes.data) ? ticketRes.data : [];
        const lots = Array.isArray(parkingRes.data) ? parkingRes.data : [];
        const normalizedLots = lots.map(item => {
          const lotId = item.lotId ?? item.parking_lot_id ?? null;
          const name = item.lot ?? item.lot_name ?? '';
          const id = lotId !== null && lotId !== undefined ? String(lotId) : name;
          const passes = item.passesToday ?? item.passes_today ?? null;
          return {
            id,
            lotId,
            name,
            price: Number(item.price ?? item.base_price ?? 0),
            passesToday: passes !== null && passes !== undefined ? Number(passes) : null,
          };
        });
        setTicketTypes(tickets);
        setParkingLots(normalizedLots);
        if (tickets.length && !passType) {
          setPassType(tickets[0].name);
        }
        if (normalizedLots.length && !parkingLot) {
          setParkingLot(normalizedLots[0].id);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || 'Unable to load ticket and parking data.');
        setTicketTypes([]);
        setParkingLots([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedTicket = useMemo(
    () => ticketTypes.find(t => t.name === passType) || ticketTypes[0],
    [ticketTypes, passType],
  );
  const selectedParking = useMemo(() => {
    if (!parkingLots.length) return undefined;
    if (parkingLot) {
      const match = parkingLots.find(lot => lot.id === parkingLot);
      if (match) return match;
    }
    return parkingLots[0];
  }, [parkingLots, parkingLot]);

  const ticketPrice = Number(selectedTicket?.price ?? 0);
  const parkingPrice = Number(selectedParking?.price ?? 0);

  function addTicketAndParking() {
    if (!selectedTicket) return;
    add({
      kind: 'ticket',
      id: `ticket-${selectedTicket.name}`,
      name: `${selectedTicket.name} Pass`,
      price: ticketPrice,
      qty,
      meta: { type: selectedTicket.name },
    });
    if (includeParking && selectedParking) {
      add({
        kind: 'parking',
        id: `parking-${selectedParking.id}`,
        name: `Parking ${selectedParking.name}`,
        price: parkingPrice,
        qty: parkingQty,
        meta: { lot: selectedParking.name },
      });
    }
    setQty(1);
    setIncludeParking(false);
    setParkingQty(1);
    setPassType(ticketTypes[0]?.name || '');
    setParkingLot(parkingLots[0]?.id || '');
  }

  function addParkingOnly() {
    if (!selectedParking) return;
    add({
      kind: 'parking',
      id: `parking-${selectedParking.id}`,
      name: `Parking ${selectedParking.name}`,
      price: parkingPrice,
      qty: parkingQty,
      meta: { lot: selectedParking.name },
    });
    setQty(1);
    setIncludeParking(false);
    setParkingQty(1);
    setPassType(ticketTypes[0]?.name || '');
    setParkingLot(parkingLots[0]?.id || '');
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="rounded-2xl border bg-white card-padding shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Buy Tickets</h2>

        {loading && (
          <p className="text-sm text-gray-600">Loading ticket options...</p>
        )}
        {!loading && error && <p className="alert error">{error}</p>}

        {!loading && !error && (
          <>
            <TicketHighlights ticketTypes={ticketTypes} />

            <div className="form-grid form-grid--2">
              <label className="field">
                <span>Type of Pass</span>
                <select
                  value={passType}
                  onChange={e => setPassType(e.target.value)}
                  className="border rounded-xl p-2"
                  disabled={!ticketTypes.length}
                >
                  {ticketTypes.map(type => (
                    <option key={type.name} value={type.name}>
                      {type.name} — ${Number(type.price ?? 0).toFixed(2)}
                    </option>
                  ))}
                </select>
                {!ticketTypes.length && (
                  <span className="text-xs text-gray-500">No ticket types available.</span>
                )}
              </label>

              <label className="field">
                <span>Number of Tickets</span>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={e => setQty(Math.max(1, Number(e.target.value) || 1))}
                  className="border rounded-xl p-2"
                />
              </label>

              <label className="field">
                <span>Add Parking Pass</span>
                <select
                  value={includeParking ? 'Y' : 'N'}
                  onChange={e => setIncludeParking(e.target.value === 'Y')}
                  className="border rounded-xl p-2"
                >
                  <option value="N">No</option>
                  <option value="Y" disabled={!parkingLots.length}>Yes</option>
                </select>
                {includeParking && !parkingLots.length && (
                  <span className="text-xs text-gray-500">Parking data unavailable.</span>
                )}
              </label>

              {includeParking && parkingLots.length > 0 && (
                <>
                  <label className="field">
                    <span>Select Parking Lot</span>
                    <select
                      value={parkingLot}
                      onChange={e => setParkingLot(e.target.value)}
                      className="border rounded-xl p-2"
                    >
                      {parkingLots.map(lot => (
                        <option key={lot.id} value={lot.id}>
                          {lot.name} - ${Number(lot.price ?? 0).toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Parking Passes</span>
                    <input
                      type="number"
                      min={1}
                      value={parkingQty}
                      onChange={e => setParkingQty(Math.max(1, Number(e.target.value) || 1))}
                      className="border rounded-xl p-2"
                    />
                  </label>
                </>
              )}
            </div>

            <div className="mt-5 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Ticket: ${ticketPrice.toFixed(2)}
                {includeParking && selectedParking && (
                  <> &nbsp;-&nbsp; Parking ({selectedParking.name}): ${parkingPrice.toFixed(2)} x {parkingQty}</>
                )}
              </div>
              {isCustomer ? (
                <button
                  className="px-4 py-2 rounded-xl border bg-black text-white"
                  onClick={addTicketAndParking}
                  disabled={!selectedTicket}
                >
                  Add to Cart
                </button>
              ) : (
                <span className="text-sm text-gray-700">Login as a customer to purchase</span>
              )}
            </div>
          </>
        )}
      </div>
      {!loading && !error && parkingLots.length > 0 && (
        <div className="rounded-2xl border bg-white card-padding shadow-sm mt-6">
          <h2 className="text-lg font-semibold mb-4">Parking Passes</h2>
          <p className="text-sm text-gray-700 mb-4">
            Need only parking? Choose a lot and quantity below.
          </p>

          <div className="form-grid form-grid--2">
            <label className="field">
              <span>Parking Lot</span>
              <select
                value={parkingLot}
                onChange={e => setParkingLot(e.target.value)}
                className="border rounded-xl p-2"
              >
                {parkingLots.map(lot => (
                  <option key={lot.id} value={lot.id}>
                    {lot.name} - ${Number(lot.price ?? 0).toFixed(2)}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Number of Passes</span>
              <input
                type="number"
                min={1}
                value={parkingQty}
                onChange={e => setParkingQty(Math.max(1, Number(e.target.value) || 1))}
                className="border rounded-xl p-2"
              />
            </label>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Parking
              {selectedParking && <span> ({selectedParking.name})</span>}
              : ${parkingPrice.toFixed(2)} x {parkingQty}
            </div>
            {isCustomer ? (
              <button
                className="px-4 py-2 rounded-xl border bg-black text-white"
                onClick={addParkingOnly}
                disabled={!selectedParking}
              >
                Add Parking Pass
              </button>
            ) : (
              <span className="text-sm text-gray-700">Login as a customer to purchase</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TicketHighlights({ ticketTypes }) {
  const dayTicketNames = ['adult', 'child', 'general'];
  const dayTickets = dayTicketNames
    .map(name => ticketTypes.find(t => t.name?.toLowerCase() === name))
    .filter(Boolean);
  const specialOffers = ticketTypes.filter(
    t => !dayTicketNames.includes(t.name?.toLowerCase?.() || t.name?.toLowerCase()),
  );

  if (!ticketTypes.length) return null;

  return (
    <div className="ticket-highlights">
      <div className="ticket-highlights__group">
        <h3>Day Tickets</h3>
        <div className="ticket-highlights__grid">
          {dayTicketNames.map(label => {
            const ticket = ticketTypes.find(t => t.name?.toLowerCase() === label);
            return (
              <div key={label} className="ticket-highlight-card">
                <div className="ticket-highlight-card__title">{label.charAt(0).toUpperCase() + label.slice(1)}</div>
                <div className="ticket-highlight-card__price">
                  {ticket ? `$${Number(ticket.price ?? 0).toFixed(2)}` : 'Coming soon'}
                </div>
                <p className="ticket-highlight-card__copy">
                  {label === 'adult' && 'Standard admission for ages 13+.'}
                  {label === 'child' && 'Discounted fun for explorers ages 3-12.'}
                  {label === 'general' && 'Flexible entry for mixed-age groups.'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {specialOffers.length > 0 && (
        <div className="ticket-highlights__group">
          <h3>Special Offers</h3>
          <div className="ticket-highlights__grid">
            {specialOffers.map(ticket => (
              <div key={ticket.name} className="ticket-highlight-card ticket-highlight-card--offer">
                <div className="ticket-highlight-card__title">{ticket.name}</div>
                <div className="ticket-highlight-card__price">${Number(ticket.price ?? 0).toFixed(2)}</div>
                <p className="ticket-highlight-card__copy">
                  Perfect for upgrading the day - reserve early to lock in availability.
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
