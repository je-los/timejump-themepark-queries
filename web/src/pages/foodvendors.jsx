import React, { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';

export default function FoodVendors(){
  const { add } = useCart();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(()=>{
    let alive = true;
    (async ()=>{
      setLoading(true); setErr('');
      try{
        const r = await fetch(import.meta.env.VITE_API_URL + '/food/items');
        const j = await r.json();
        if(!r.ok) throw new Error(j?.error || 'Failed to load food items');
        if(alive) setItems(Array.isArray(j) ? j : (j.items || []));
      }catch(e){ if(alive) setErr(e.message||'Failed to load food items'); }
      finally{ if(alive) setLoading(false); }
    })();
    return ()=>{ alive=false; };
  },[]);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="rounded-2xl border bg-white card-padding shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Food Vendors</h2>

        {loading && <div className="text-sm text-gray-600">Loading…</div>}
        {err && !loading && <div className="alert error">{err}</div>}
        {!loading && !err && items.length===0 && <div className="text-sm text-gray-600">No items found.</div>}

        {!loading && !err && items.length>0 && (
          <div className="items-grid">
            {items.map(i=>(
              <div key={i.id} className="item-card">
                <div className="item-name">{i.name}</div>
                <div className="item-price">${Number(i.price||0).toFixed(2)}</div>
                <button className="btn" onClick={()=>add({ kind:'food', id:i.id, name:i.name, price:i.price })}>Add to Cart</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
