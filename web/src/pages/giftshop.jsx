import React, { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';

export default function GiftShop(){
  const { add } = useCart();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(()=>{
    let alive = true;
    (async ()=>{
      setLoading(true); setErr('');
      try{
        const r = await fetch(import.meta.env.VITE_API_URL + '/giftshop/items');
        const j = await r.json();
        if(!r.ok) throw new Error(j?.error || 'Failed to load gift shop items');
        if(alive) setItems(Array.isArray(j) ? j : (j.items || []));
      }catch(e){ if(alive) setErr(e.message||'Failed to load gift shop items'); }
      finally{ if(alive) setLoading(false); }
    })();
    return ()=>{ alive=false; };
  },[]);

  const rows = items.filter(i => i.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="rounded-2xl border bg-white card-padding shadow-sm">
        <div className="mb-4">
          <input className="border rounded-xl p-2 w-full md:w-80"
                 placeholder="Search souvenirs…"
                 value={q} onChange={e=>setQ(e.target.value)} />
        </div>

        {loading && <div className="text-sm text-gray-600">Loading…</div>}
        {err && !loading && <div className="alert error">{err}</div>}
        {!loading && !err && rows.length===0 && <div className="text-sm text-gray-600">No items found.</div>}

        {!loading && !err && rows.length>0 && (
          <div className="items-grid">
            {rows.map(i=>(
              <div key={i.id} className="item-card">
                <div className="item-name">{i.name}</div>
                <div className="item-price">${Number(i.price||0).toFixed(2)}</div>
                <button className="btn" onClick={()=>add({ kind:'gift', id:i.id, name:i.name, price:i.price })}>Add to Cart</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
