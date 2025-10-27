import React from 'react';
import { useCart } from '../context/CartContext';

export default function CartModal({ onClose }) {
  const { items, remove, updateQty, total, clear } = useCart();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <h3>Shopping Cart</h3>
          <button className="btn" onClick={onClose}>Close</button>
        </div>

        {items.length === 0 ? (
          <div className="modal-body">
            <div className="panel" style={{textAlign:'center'}}>Your cart is empty.</div>
          </div>
        ) : (
          <>
            <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:12}}>
              {items.map((it, idx)=>{
                const detailParts = [];
                if (it.meta && typeof it.meta === 'object') {
                  const { parking, lot, ...rest } = it.meta;
                  if (parking && parking !== 'N') {
                    detailParts.push(`Parking: ${lot || parking}`);
                  }
                  Object.entries(rest).forEach(([key, value])=>{
                    if (value === undefined || value === null || value === '') return;
                    const label = key.replace(/_/g,' ').replace(/\b\w/g, ch=>ch.toUpperCase());
                    detailParts.push(`${label}: ${value}`);
                  });
                }
                const showDetails = detailParts.length > 0;

                return (
                  <div key={idx} className="card">
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                      <div>
                        <div style={{fontWeight:600}}>{it.name}</div>
                        {showDetails && (
                          <div className="muted" style={{fontSize:12}}>{detailParts.join(' | ')}</div>
                        )}
                      </div>
                      <div style={{fontWeight:700}}>${Number(it.price||0).toFixed(2)}</div>
                    </div>
                    <div style={{display:'flex',gap:8,alignItems:'center',marginTop:8}}>
                      <label className="muted" style={{fontSize:12}}>Qty</label>
                      <input
                        className="input" type="number" min={1} value={it.qty}
                        onChange={e=>updateQty(idx, Math.max(1, Number(e.target.value)||1))}
                        style={{width:72}}
                      />
                      <button className="btn" style={{marginLeft:'auto'}} onClick={()=>remove(idx)}>Remove</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="modal-footer">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div className="muted">Total</div>
                <div style={{fontSize:20,fontWeight:800}}>${total.toFixed(2)}</div>
              </div>
              <div style={{display:'flex',gap:8,marginTop:8}}>
                <button className="btn" onClick={clear}>Clear</button>
                <button className="btn primary">Checkout</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

