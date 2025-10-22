import React, { useState } from 'react';
import { useCart } from '../context/CartContext';

export default function Tickets(){
  const { add } = useCart();
  const [passType, setPassType] = useState('General');
  const [qty, setQty] = useState(1);
  const [parking, setParking] = useState('N');
  const [lot, setLot] = useState('Lot A');

  const priceMap = { General: 50, VIP: 120, Child: 35 };
  const ticketPrice = priceMap[passType] || 50;
  const parkingPrice = parking==='Y' ? ({'Lot A':150,'Lot B':120,'Lot C':100,'Lot D':80,'Lot E':60}[lot]||0) : 0;

  function addToCart(){
    add({ kind:'ticket', id:`${passType}-${parking==='Y'?lot:'NP'}`, name:`${passType} Pass`, price: ticketPrice, qty, meta: { parking, lot } });
    if (parking==='Y') add({ kind:'parking', id:`${lot}`, name:`Parking ${lot}`, price: parkingPrice, qty: 1, meta: {} });
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="rounded-2xl border bg-white card-padding shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Buy Tickets</h2>

        <div className="form-grid form-grid--2">
          <label className="field">
            <span>Type of Pass</span>
            <select value={passType} onChange={e=>setPassType(e.target.value)} className="border rounded-xl p-2">
              <option>General</option>
              <option>VIP</option>
              <option>Child</option>
            </select>
          </label>

          <label className="field">
            <span>Number of Tickets</span>
            <input type="number" min={1} value={qty}
                   onChange={e=>setQty(Math.max(1, Number(e.target.value)||1))}
                   className="border rounded-xl p-2"/>
          </label>

          <label className="field">
            <span>Parking</span>
            <select value={parking} onChange={e=>setParking(e.target.value)} className="border rounded-xl p-2">
              <option value="N">No</option>
              <option value="Y">Yes</option>
            </select>
          </label>

          {parking==='Y' && (
            <div className="field">
              <span>Select Lot</span>
              <div className="flex flex-wrap gap-2">
                {['Lot A','Lot B','Lot C','Lot D','Lot E'].map(L => (
                  <button type="button" key={L}
                          onClick={()=>setLot(L)}
                          className={`px-3 py-2 rounded-xl border ${lot===L?'bg-gray-100 font-medium':''}`}>
                    {L}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Ticket: ${ticketPrice.toFixed(2)} {parking==='Y' && <> • Parking: ${parkingPrice.toFixed(2)}</>}
          </div>
          <button className="px-4 py-2 rounded-xl border bg-black text-white" onClick={addToCart}>
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
