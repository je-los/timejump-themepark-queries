import React from 'react';

export default function TopNavBoxes({ current, onSelect }){
  const boxes = [
    { key:'Tickets',     title:'Tickets',     desc:'Buy day passes and parking' },
    { key:'Attractions', title:'Attractions', desc:'Rides by theme' },
    { key:'GiftShop',    title:'Gift Shop',   desc:'Souvenirs & merch' },
    { key:'FoodVendors', title:'Food Vendors',desc:'Snacks & meals' },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="grid md:grid-cols-4 gap-4">
        {boxes.map(b => (
          <button
            key={b.key}
            onClick={()=>onSelect(b.key)}
            className={`rounded-2xl border bg-white p-5 shadow-sm`}
            style={{ textAlign:'left', cursor:'pointer' }}
          >
            <div className="text-lg font-semibold">{b.title}</div>
            <div className="text-sm text-gray-600">{b.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
