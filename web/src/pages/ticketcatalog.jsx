import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/authcontext.jsx';
import { useCart } from '../context/CartContext';

const CATEGORY_ORDER = ['day', 'annual', 'birthday', 'other'];

const CATEGORY_DESCRIPTIONS = {
  day: 'Valid for the selected visit days. Activate on entry.',
  annual: 'Enjoy twelve months of unlimited visits from first activation.',
  birthday: 'Tailored celebration packages with reserved party space.',
  other: 'Special offers and add-ons for your visit.',
};

function categorizeTicket(name='') {
  const lc = name.toLowerCase();
  if (lc.includes('birthday')) return 'birthday';
  if (lc.includes('annual') || lc.includes('season')) return 'annual';
  if (lc.includes('friend')) return 'day';
  if (lc.includes('child')) return 'day';
  if (lc.includes('1 day') || lc.includes('2 day') || lc.includes('day')) return 'day';
  return 'other';
}

export default function TicketCatalog({ filter='all', onRequireAuth }) {
  const { user } = useAuth();
  const { add } = useCart();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(()=>{
    let active = true;
    setLoading(true);
    fetch(`${import.meta.env.VITE_API_URL}/ticket-types`)
      .then(r=> r.ok ? r.json() : Promise.reject(new Error('Failed to load tickets')))
      .then(j=>{
        if(!active) return;
        setTickets(j?.data || []);
        setError('');
      })
      .catch(err=>{
        if(!active) return;
        setError(err?.message || 'Unable to load ticket types.');
        setTickets([]);
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
    if(!user || user.role !== 'customer'){
      onRequireAuth?.('login');
      return;
    }
    add({
      id: ticket.name,
      name: ticket.name,
      price: ticket.price ?? 0,
      kind: 'ticket',
      qty: 1,
      meta: { category: categorizeTicket(ticket.name) }
    });
  }

  return (
    <div className="page">
      <div className="page-box page-box--wide">
        <h1>Tickets & Passes</h1>
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
                {grouped[category].map(ticket=>(
                  <button key={ticket.name} className="ticket-card" onClick={()=>handleSelect(ticket)}>
                    <div className="ticket-card__header">
                      <span className="ticket-card__name">{ticket.name}</span>
                      <span className="ticket-card__price">${Number(ticket.price ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="ticket-card__body">
                      <p>Valid from purchase through the designated redemption period.</p>
                      <span className="ticket-card__cta">{user?.role === 'customer' ? 'Add to cart' : 'Sign in to purchase'}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )
        ))}
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

