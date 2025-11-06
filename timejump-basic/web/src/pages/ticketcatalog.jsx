import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authcontext.jsx';
import { useCart } from '../context/cartcontext.jsx';

const CATEGORY_ORDER = ['day', 'annual', 'birthday', 'other'];

const CATEGORY_DESCRIPTIONS = {
  day: 'Valid for the selected visit days. Activate on entry.',
  annual: 'Enjoy twelve months of unlimited visits from first activation.',
  birthday: 'Tailored celebration packages with reserved party space.',
  other: 'Special offers and add-ons for your visit.',
};

function categorizeTicket(name = '') {
  const lc = name.toLowerCase();
  if (lc.includes('annual') || lc.includes('season') || lc.includes('year')) return 'annual';
  if (lc.includes('birthday')) return 'birthday';
  return 'day';
}

export default function TicketCatalog({ filter = 'all' }) {
  const { user } = useAuth();
  const { add } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [tickets, setTickets] = useState([]);
  const [parkingOptions, setParkingOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [statusTone, setStatusTone] = useState('info');
  const statusTimer = useRef(null);

  function showStatus(message, tone = 'info') {
    if (statusTimer.current) {
      window.clearTimeout(statusTimer.current);
    }
    setStatusTone(tone);
    setStatus(message);
    statusTimer.current = window.setTimeout(() => {
      setStatus('');
      statusTimer.current = null;
    }, 2500);
  }

  useEffect(() => {
    return () => {
      if (statusTimer.current) {
        window.clearTimeout(statusTimer.current);
      }
    };
  }, []);

  useEffect(()=>{
    let active = true;
    setLoading(true);
    Promise.all([
      fetch(`${import.meta.env.VITE_API_URL}/ticket-types`),
      fetch(`${import.meta.env.VITE_API_URL}/parking/options`).catch(()=>null),
    ])
      .then(async ([ticketRes, parkingRes])=>{
        if(!active) return;
        if (!ticketRes?.ok) throw new Error('Failed to load tickets');
        const ticketJson = await ticketRes.json();
        const parkingJson = parkingRes && parkingRes.ok ? await parkingRes.json() : { data: [] };
        setTickets(ticketJson?.data || []);
        setParkingOptions((parkingJson?.data || []).map(item=>{
          const lotId = item.lotId ?? item.parking_lot_id ?? null;
          const name = item.lot ?? item.lot_name ?? '';
          const id = lotId !== null && lotId !== undefined ? String(lotId) : name;
          return {
            id,
            lotId,
            name,
            price: Number(item.price ?? item.base_price ?? 0),
          };
        }));
        setError('');
      })
      .catch(err=>{
        if(!active) return;
        setError(err?.message || 'Unable to load ticket options.');
        setTickets([]);
        setParkingOptions([]);
      })
      .finally(()=>active && setLoading(false));
    return ()=>{ active = false; };
  },[]);

  const grouped = useMemo(()=>{
    const groups = { day:[], annual:[], birthday:[], other:[] };
    tickets.forEach(ticket=>{
      const category = categorizeTicket(ticket.name);
      groups[category].push(ticket);
    });
    return groups;
  },[tickets]);

  const visibleCategories = filter === 'all' ? CATEGORY_ORDER : CATEGORY_ORDER.filter(cat => cat === filter);

  function handleSelect(ticket){
    if(!user){
      const redirect = `${location.pathname}${location.search || ''}`;
      navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
      showStatus('Sign in as a customer to add tickets to cart.', 'warning');
      return;
    }
    if (user.role !== 'customer') {
      showStatus('Ticket purchases are limited to customer accounts.', 'warning');
      return;
    }

    add({
      id: ticket.name,
      name: ticket.name,
      price: ticket.price ?? 0,
      kind: 'ticket',
      qty: 1,
      meta: {
        category: categorizeTicket(ticket.name),
      }
    });
    showStatus(`Added ${ticket.name} to your cart.`, 'success');
  }

  function handleAddParking(opt){
    if(!user){
      const redirect = `${location.pathname}${location.search || ''}`;
      navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
      showStatus('Sign in as a customer to add parking.', 'warning');
      return;
    }
    if (user.role !== 'customer') {
      showStatus('Parking add-ons are available to customer accounts only.', 'warning');
      return;
    }
    add({
      id: `parking-${opt.id}`,
      name: `Parking - ${opt.name}`,
      price: opt.price ?? 0,
      kind: 'parking',
      qty: 1,
      meta: { lot: opt.name },
    });
    showStatus(`Parking for ${opt.name} added to cart.`, 'success');
  }

  return (
    <div className="page">
      <div className="page-box page-box--wide">
        <h1>Tickets & Passes</h1>
        {user && user.role !== 'customer' && (
          <div className="alert warning">
            Ticket purchases are available to customer accounts only.
          </div>
        )}
        {status && (
          <div className={`alert ${statusTone === 'success' ? 'success' : statusTone === 'warning' ? 'warning' : 'info'}`}>
            {status}
          </div>
        )}
        {loading && <p className="text-sm text-gray-600">Loading ticket options...</p>}
        {error && <p className="alert error">{error}</p>}
        {!loading && !error && visibleCategories.every(cat => grouped[cat].length === 0) && (
          <p className="text-sm text-gray-600">No tickets found for this category.</p>
        )}
        {!loading && !error && visibleCategories.map(category => (
          grouped[category].length > 0 && (
            <section key={category} style={{marginTop:24}}>
              <h2 style={{marginBottom:8, fontSize:'1.1rem'}}>{formatCategory(category)}</h2>
              <p className="text-sm text-gray-600" style={{marginBottom:12}}>
                {CATEGORY_DESCRIPTIONS[category]}
              </p>
              <div className="ticket-grid">
                {grouped[category].map(ticket=>{
                  const key = ticket.name || ticket.ticket_type || ticket.id;
                  return (
                    <button key={key} className="ticket-card" onClick={()=>handleSelect(ticket)}>
                      <div className="ticket-card__header">
                        <span className="ticket-card__name">{ticket.name}</span>
                        <span className="ticket-card__price">${Number(ticket.price ?? 0).toFixed(2)}</span>
                      </div>
                      <div className="ticket-card__body">
                        <p>Valid from purchase through the designated redemption period.</p>
                        <span className="ticket-card__cta">
                          {user?.role === 'customer' ? 'Add to cart' : 'Sign in to purchase'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )
        ))}
        {!loading && !error && parkingOptions.length > 0 && (
          <section style={{marginTop:32}}>
            <h2 style={{marginBottom:8, fontSize:'1.1rem'}}>Parking Add-Ons</h2>
            <p className="text-sm text-gray-600" style={{marginBottom:12}}>
              Reserve a parking lot to pair with any ticket in your cart. Only one parking lot can be active per purchase.
            </p>
            <div className="ticket-grid">
              {parkingOptions.map(opt=>(
                <div key={opt.id} className="ticket-card ticket-card--offer">
                  <div className="ticket-card__header">
                    <span className="ticket-card__name">{opt.name}</span>
                    <span className="ticket-card__price">${Number(opt.price ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="ticket-card__body">
                    <p>Adding this lot replaces any existing parking selection in your cart.</p>
                    <button className="btn primary" onClick={()=>handleAddParking(opt)}>
                      Add Parking
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function formatCategory(cat){
  switch(cat){
    case 'day': return 'Day Tickets';
    case 'annual': return 'Annual Passes';
    case 'birthday': return 'Birthday Packages';
    case 'other': return 'Special Offers';
    default: return cat;
  }
}
