import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import CartModal from './CartModal';

export default function Nav({ current, onChange, onAuth }){
  const tabs = [
    { key: 'Home', label: 'Home' },
    { key: 'Tickets', label: 'Tickets' },
    { key: 'Attractions', label: 'Attractions' },
    { key: 'GiftShop', label: 'Gift Shop' },
    { key: 'FoodVendors', label: 'Food Vendors' },
  ];
  const { items } = useCart();
  const [showCart, setShowCart] = useState(false);

  return (
    <header className="w-full border-b bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
        <div className="flex items-center gap-6 min-w-0">
          <div className="text-xl font-bold select-none whitespace-nowrap">Time Jump Theme Park</div>
          {/* Single responsive nav strip (no duplicate mobile bar) */}
          <nav className="flex items-center gap-2 flex-wrap max-w-full overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.key}
                className={`px-3 py-1 rounded-xl hover:bg-gray-100 ${current===t.key?'font-semibold underline':''}`}
                onClick={()=>onChange(t.key)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* REMOVE 'hidden sm:block' so they’re clickable */}
          <button onClick={()=>onAuth('login')} className="px-3 py-1 rounded-xl border">Login</button>
          <button onClick={()=>onAuth('signup')} className="px-3 py-1 rounded-xl border">Sign Up</button>
          <button onClick={()=>setShowCart(true)} className="relative px-3 py-1 rounded-xl border">
            Cart
            <span className="ml-2 text-xs bg-black text-white px-2 py-0.5 rounded-full">{items.length}</span>
          </button>
        </div>
      </div>

      {/* Centered cart modal */}
      {showCart && <CartModal onClose={()=>setShowCart(false)} />}
    </header>
  );
}
