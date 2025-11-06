import React, { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Nav from './components/nav.jsx';
import Home from './pages/home.jsx';
import GiftShop from './pages/giftshop.jsx';
import FoodVendors from './pages/foodvendors.jsx';
import Admin from './pages/admin/index.jsx';
import ReportsWorkspace from './pages/reportsworkspace.jsx';
import Manager from './pages/manager.jsx';
import TicketCatalog from './pages/ticketcatalog.jsx';
import RidesAndAttractions from './pages/ridesandattractions.jsx';
import ThemeView from './pages/themeview.jsx';
import RideView from './pages/rideview.jsx';
import Account from './pages/account.jsx';
import LoginPage from './pages/login.jsx';
import { CartProvider } from './context/cartcontext.jsx';

export default function App() {
  const [rideLibrary, setRideLibrary] = useState({ themes: [], rides: [] });
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryError, setLibraryError] = useState('');

  useEffect(() => {
    let active = true;
    setLibraryLoading(true);
    fetch(`${import.meta.env.VITE_API_URL}/ride-library`)
      .then(res => (res.ok ? res.json() : Promise.reject(new Error('Failed to load rides'))))
      .then(json => {
        if (!active) return;
        setRideLibrary(json?.data || { themes: [], rides: [] });
        setLibraryError('');
      })
      .catch(err => {
        if (!active) return;
        setLibraryError(err?.message || 'Unable to load ride data.');
        setRideLibrary({ themes: [], rides: [] });
      })
      .finally(() => active && setLibraryLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <CartProvider>
      <div className="min-h-screen bg-gray-50">
        <Nav themes={rideLibrary.themes} />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/ticket-passes"
            element={<TicketCatalog filter="all" />}
          />
          <Route
            path="/ticket-passes/day-tickets"
            element={<TicketCatalog filter="day" />}
          />
          <Route
            path="/ticket-passes/annual-passes"
            element={<TicketCatalog filter="annual" />}
          />
          <Route
            path="/ticket-passes/birthday-package"
            element={<TicketCatalog filter="birthday" />}
          />
          <Route
            path="/things-to-do/rides-attractions"
            element={
              <RidesAndAttractions
                library={rideLibrary}
                loading={libraryLoading}
                error={libraryError}
              />
            }
          />
          <Route path="/things-to-do/dining" element={<FoodVendors />} />
          <Route path="/things-to-do/shopping" element={<GiftShop />} />
          <Route path="/theme/:slug" element={<ThemeView />} />
          <Route path="/ride/:slug" element={<RideView />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/account" element={<Account />} />
          <Route path="/reports" element={<ReportsWorkspace />} />
          <Route path="/manager" element={<Manager />} />
          <Route path="/admin/*" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </CartProvider>
  );
}
