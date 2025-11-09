import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
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
import { useAuth } from './context/authcontext.jsx';

export default function App() {
  const { user } = useAuth();
  const isCustomerView = !user || user.role === 'customer';
  const [rideLibrary, setRideLibrary] = useState({ themes: [], rides: [] });
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryError, setLibraryError] = useState('');

  useEffect(() => {
    if (!isCustomerView) {
      setRideLibrary({ themes: [], rides: [] });
      setLibraryLoading(false);
      setLibraryError('');
      return;
    }
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
  }, [isCustomerView]);

  return (
    <CartProvider>
      <div className="min-h-screen bg-gray-50">
        {isCustomerView ? (
          <>
            <Nav themes={rideLibrary.themes} />
            <CustomerRoutes
              rideLibrary={rideLibrary}
              libraryLoading={libraryLoading}
              libraryError={libraryError}
            />
          </>
        ) : (
          <StaffShell />
        )}
      </div>
    </CartProvider>
  );
}

function CustomerRoutes({ rideLibrary, libraryLoading, libraryError }) {
  return (
    <Routes>
      <Route path="/" element={<LandingRoute />} />
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function LandingRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="page">
        <div className="panel">Loading your experience...</div>
      </div>
    );
  }

  if (!user || user.role === 'customer') {
    return <Home />;
  }

  return <Navigate to={resolveStaffHome(user.role)} replace />;
}

function StaffShell() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const staffHome = resolveStaffHome(user?.role);

  if (loading && !user) {
    return (
      <div className="page">
        <div className="panel">Loading your experience...</div>
      </div>
    );
  }

  return (
    <>
      <StaffNav currentPath={location.pathname} />
      <Routes>
        <Route path="/" element={<Navigate to={staffHome} replace />} />
        <Route path="/reports" element={<ReportsWorkspace />} />
        <Route path="/manager" element={<Manager />} />
        <Route path="/admin/*" element={<Admin />} />
        <Route path="/account" element={<Account />} />
        <Route path="/login" element={<Navigate to={staffHome} replace />} />
        <Route path="*" element={<Navigate to={staffHome} replace />} />
      </Routes>
    </>
  );
}

const STAFF_LINKS = [
  { label: 'Reports', path: '/reports', roles: ['employee', 'manager', 'admin', 'owner'] },
  { label: 'Manager', path: '/manager', roles: ['manager', 'admin', 'owner'] },
  { label: 'Admin', path: '/admin', roles: ['admin', 'owner'] },
];

function StaffNav({ currentPath }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const role = user?.role ?? '';
  const links = useMemo(
    () => STAFF_LINKS.filter(link => !link.roles || link.roles.includes(role)),
    [role],
  );

  const isActive = (path) => currentPath === path || currentPath.startsWith(`${path}/`);

  function handleSignOut() {
    signOut();
    navigate('/', { replace: true });
  }

  return (
    <header className="nav-shell">
      <div className="nav-bar">
        <div className="nav-left">
          <button className="nav-brand" type="button" onClick={() => navigate('/')}>
            Time Jump Staff
          </button>
          <span className="nav-role-pill">{role ? role.toUpperCase() : 'STAFF'}</span>
        </div>
        <nav className="nav-links">
          <div className="nav-staff">
            {links.map(link => (
              <button
                key={link.path}
                className={`nav-link nav-link--staff ${isActive(link.path) ? 'nav-link--active' : ''}`}
                onClick={() => navigate(link.path)}
              >
                {link.label}
              </button>
            ))}
          </div>
          <div className="nav-auth">
            <button
              className="nav-account"
              onClick={() => navigate('/account')}
            >
              Account
            </button>
            <button className="btn primary" onClick={handleSignOut}>
              Sign Out
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}

function resolveStaffHome(role) {
  if (role === 'admin' || role === 'owner') return '/admin';
  if (role === 'manager') return '/manager';
  return '/reports';
}
