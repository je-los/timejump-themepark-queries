import React, { useEffect, useMemo, useState } from 'react';
import Nav from './components/Nav';
import Home from './pages/Home';
import GiftShop from './pages/GiftShop';
import FoodVendors from './pages/FoodVendors';
import Admin from './pages/Admin';
import ReportsWorkspace from './pages/reportsworkspace.jsx';
import Manager from './pages/Manager';
import TicketCatalog from './pages/ticketcatalog.jsx';
import RidesAndAttractions from './pages/ridesandattractions.jsx';
import ThemeView from './pages/themeview.jsx';
import RideView from './pages/rideview.jsx';
import TopBar from './components/topbar.jsx';
import { CartProvider } from './context/CartContext';
import LoginModal from './components/LoginModal';
import { useAuth } from './context/authcontext.jsx';

const BASE_TABS = ['Home','Tickets','Attractions','GiftShop','FoodVendors'];
const EXTRA_TABS = [
  'ticket-passes',
  'ticket-passes/day-tickets',
  'ticket-passes/annual-passes',
  'ticket-passes/birthday-package',
  'things-to-do/rides-attractions',
  'things-to-do/dining',
  'things-to-do/shopping',
];

export default function App(){
  const [tab, setTab] = useState('Home');
  const [authMode, setAuthMode] = useState(null); // 'login' | 'signup' | null
  const { user } = useAuth();
  const displayRole = user?.role ?? null;
  const [rideLibrary, setRideLibrary] = useState({ themes: [], rides: [] });
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryError, setLibraryError] = useState('');

  useEffect(()=>{
    let active = true;
    setLibraryLoading(true);
    fetch(`${import.meta.env.VITE_API_URL}/ride-library`)
      .then(r=> r.ok ? r.json() : Promise.reject(new Error('Failed to load rides')))
      .then(j=>{
        if(!active) return;
        setRideLibrary(j?.data || { themes: [], rides: [] });
        setLibraryError('');
      })
      .catch(err=>{
        if(!active) return;
        setLibraryError(err?.message || 'Unable to load ride data.');
        setRideLibrary({ themes: [], rides: [] });
      })
      .finally(()=>active && setLibraryLoading(false));
    return ()=>{ active=false; };
  },[]);

  const availableTabs = useMemo(()=>{
    const themeTabs = rideLibrary.themes?.map(theme => `theme/${theme.slug}`) || [];
    const rideTabs = rideLibrary.rides?.map(ride => `ride/${ride.slug}`) || [];
    const tabs = [...BASE_TABS, ...EXTRA_TABS, ...themeTabs, ...rideTabs];
    if (displayRole && ['employee','manager','admin','owner'].includes(displayRole)) tabs.push('Reports');
    if (displayRole && ['manager','admin','owner'].includes(displayRole)) tabs.push('Manager');
    if (displayRole && ['admin','owner'].includes(displayRole)) tabs.push('Admin');
    return Array.from(new Set(tabs));
  },[displayRole, rideLibrary]);

  useEffect(()=>{
    if (!availableTabs.includes(tab)) {
      setTab(availableTabs[0] || 'Home');
    }
  },[availableTabs, tab]);

  return (
    <CartProvider>
      <div className="min-h-screen bg-gray-50">
        <TopBar onAuth={setAuthMode} />
        <Nav current={tab} onChange={setTab} onAuth={setAuthMode} themes={rideLibrary.themes} />
        {renderContent(tab, {
          onRequireAuth: setAuthMode,
          onNavigate: setTab,
          rideLibrary,
          libraryLoading,
          libraryError,
        })}
      </div>
      {authMode && (
        <LoginModal initialMode={authMode} onClose={()=>setAuthMode(null)} />
      )}
    </CartProvider>
  );
}

function renderContent(tab, { onRequireAuth, onNavigate, rideLibrary, libraryLoading, libraryError }){
  if (tab.startsWith('theme/')) {
    const slug = tab.split('/')[1];
    return (
      <ThemeView
        slug={slug}
        library={rideLibrary}
        loading={libraryLoading}
        error={libraryError}
        onNavigate={onNavigate}
      />
    );
  }
  if (tab.startsWith('ride/')) {
    const slug = tab.split('/')[1];
    return <RideView slug={slug} />;
  }
  switch(tab){
    case 'Home':
      return <Home onNavigate={onNavigate} />;
    case 'Tickets':
      return <TicketCatalog filter="all" onRequireAuth={onRequireAuth} />;
    case 'ticket-passes':
      return <TicketCatalog filter="all" onRequireAuth={onRequireAuth} />;
    case 'ticket-passes/day-tickets':
      return <TicketCatalog filter="day" onRequireAuth={onRequireAuth} />;
    case 'ticket-passes/annual-passes':
      return <TicketCatalog filter="annual" onRequireAuth={onRequireAuth} />;
    case 'ticket-passes/birthday-package':
      return <TicketCatalog filter="birthday" onRequireAuth={onRequireAuth} />;
    case 'Attractions':
    case 'things-to-do/rides-attractions':
      return (
        <RidesAndAttractions
          library={rideLibrary}
          loading={libraryLoading}
          error={libraryError}
          onNavigate={onNavigate}
        />
      );
    case 'GiftShop':
    case 'things-to-do/shopping':
      return <GiftShop />;
    case 'FoodVendors':
    case 'things-to-do/dining':
      return <FoodVendors />;
    case 'things-to-do/dragon-riders-fury':
      return <RideView slug="dragon-riders-fury" />;
    case 'Reports':
      return <ReportsWorkspace />;
    case 'Manager':
      return <Manager />;
    case 'Admin':
      return <Admin />;
    default:
      return <Home onNavigate={onNavigate} />;
  }
}
