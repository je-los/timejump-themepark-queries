import React, { useState } from 'react';
import { useAuth } from '../context/authcontext.jsx';
import { useCart } from '../context/cartcontext.jsx';
import CartModal from './cartmodal.jsx';

export default function TopBar({ onAuth }) {
  const { user, signOut } = useAuth();
  const { items } = useCart();
  const [showCart, setShowCart] = useState(false);

  const isCustomer = user?.role === 'customer';
  const formattedCount = items.length > 99 ? '99+' : String(items.length);

  function handleSignIn() {
    if (onAuth) onAuth('login');
  }

  function handleSignOut() {
    signOut();
    setShowCart(false);
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar__left">
          Today's Hours:&nbsp;
          <span className="topbar__hours">10:00 AM – 8:00 PM</span>
        </div>
        <div className="topbar__right">
          {user ? (
            <button className="topbar__action" onClick={handleSignOut}>
              Sign Out
            </button>
          ) : (
            <button className="topbar__action" onClick={handleSignIn}>
              Sign In
            </button>
          )}
          {isCustomer && (
            <button className="topbar__cart" onClick={()=>setShowCart(true)}>
              Cart
              <span className="topbar__cart-count">{formattedCount}</span>
            </button>
          )}
        </div>
      </div>
      {showCart && <CartModal onClose={()=>setShowCart(false)} />}
    </>
  );
}

