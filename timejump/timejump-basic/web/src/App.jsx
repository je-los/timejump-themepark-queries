import React, { useState } from 'react';
import Nav from './components/Nav';
import Home from './pages/Home';
import Tickets from './pages/Tickets';
import Attractions from './pages/Attractions';
import GiftShop from './pages/GiftShop';
import FoodVendors from './pages/FoodVendors';
import { CartProvider } from './context/CartContext';
import LoginModal from './components/LoginModal';

export default function App(){
  const [tab, setTab] = useState('Home');
  const [authMode, setAuthMode] = useState(null); // 'login' | 'signup' | null

  return (
    <CartProvider>
      <div className="min-h-screen bg-gray-50">
        <Nav current={tab} onChange={setTab} onAuth={setAuthMode} />
        {tab==='Home' && <Home/>}
        {tab==='Tickets' && <Tickets/>}
        {tab==='Attractions' && <Attractions/>}
        {tab==='GiftShop' && <GiftShop/>}
        {tab==='FoodVendors' && <FoodVendors/>}
      </div>
      {authMode && (
        <LoginModal initialMode={authMode} onClose={()=>setAuthMode(null)} />
      )}
    </CartProvider>
  );
}
