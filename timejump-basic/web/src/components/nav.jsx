import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authcontext.jsx';
import { useCart } from '../context/cartcontext.jsx';
import CartModal from './cartmodal.jsx';

const MENU_CONFIG = [
  {
    key: 'tickets',
    label: 'Buy Tickets',
    path: '/ticket-passes',
    items: [
      { label: 'Buy Tickets', path: '/ticket-passes' },
    ],
  },
  {
    key: 'experiences',
    label: 'Rides & Attractions',
    path: '/things-to-do/rides-attractions',
    items: [
      { label: 'Rides & Attractions', path: '/things-to-do/rides-attractions' },
    ],
  },
  {
    key: 'marketplace',
    label: 'Marketplace',
    path: '/things-to-do/dining',
    items: [
      { label: 'Dining', path: '/things-to-do/dining' },
      { label: 'Shopping', path: '/things-to-do/shopping' },
    ],
  },
];

const AUTH_TOAST_KEY = 'tj-auth-toast';

function consumeLoginToastFlag() {
  if (typeof window === 'undefined' || !window.sessionStorage) return false;
  const value = window.sessionStorage.getItem(AUTH_TOAST_KEY);
  if (!value) return false;
  window.sessionStorage.removeItem(AUTH_TOAST_KEY);
  return value === 'welcome';
}

export default function Nav({ themes = [] }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { items } = useCart();
  const displayRole = user?.role ?? null;
  const [openMenu, setOpenMenu] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const [authToast, setAuthToast] = useState(null);
  const navRef = useRef(null);
  const prevUserRef = useRef(user);
  const firstUserCheckRef = useRef(true);
  useEffect(() => {
    if (firstUserCheckRef.current) {
      firstUserCheckRef.current = false;
      prevUserRef.current = user;
      return;
    }
    const prevUser = prevUserRef.current;
    if (!prevUser && user) {
      if (consumeLoginToastFlag()) {
        setAuthToast({ type: 'in', message: 'Signed in successfully.' });
      }
    }
    prevUserRef.current = user;
  }, [user]);
  useEffect(() => {
    if (!authToast) return;
    const id = window.setTimeout(() => setAuthToast(null), 3500);
    return () => window.clearTimeout(id);
  }, [authToast]);

  useEffect(() => {
    function handleDocumentClick(evt) {
      if (!navRef.current) return;
      if (!navRef.current.contains(evt.target)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
  const redirectTarget = (normalizedPath === '/' ? '/' : normalizedPath) + (location.search || '');

  const isCustomer = user?.role === 'customer';
  const cartCount = items.length > 99 ? '99+' : String(items.length);

  const menuItems = useMemo(() => {
    if (!user) return MENU_CONFIG;
    if (['employee', 'manager', 'admin', 'owner'].includes(user.role)) {
      return MENU_CONFIG.filter(section => section.key !== 'tickets');
    }
    return MENU_CONFIG;
  }, [user]);

  const staffLinks = useMemo(() => {
    const links = [];
    if (['employee', 'manager', 'admin', 'owner'].includes(displayRole)) {
      links.push({ label: 'Reports', path: '/reports' });
    }
    if (['manager', 'admin', 'owner'].includes(displayRole)) {
      links.push({ label: 'Manager', path: '/manager' });
    }
    if (['admin', 'owner'].includes(displayRole)) {
      links.push({ label: 'Admin', path: '/admin' });
    }
    return links;
  }, [displayRole]);

  function handleNavigate(path) {
    setOpenMenu(null);
    navigate(path);
  }

  function handleMenuToggle(menuKey) {
    setOpenMenu(prev => (prev === menuKey ? null : menuKey));
  }

  function handleSignOut() {
    signOut();
    setAuthToast({ type: 'out', message: 'Signed out. See you soon!' });
    setShowCart(false);
    navigate('/', { replace: true });
  }

  function isMenuActive(menu) {
    if (normalizedPath === menu.path) return true;
    if (menu.key === 'experiences') {
      if (normalizedPath.startsWith('/theme/')) return true;
      if (normalizedPath.startsWith('/ride/')) return true;
      if (normalizedPath === '/things-to-do/rides-attractions') return true;
    }
    if (menu.key === 'marketplace') {
      if (normalizedPath === '/things-to-do/dining' || normalizedPath === '/things-to-do/shopping') return true;
    }
    if (menu.key === 'tickets' && normalizedPath.startsWith('/ticket-passes')) {
      return true;
    }
    return menu.items.some(item => normalizedPath === item.path);
  }

  return (
    <>
      <header className="nav-shell" ref={navRef}>
        <div className="nav-bar">
          <div className="nav-left">
            <Link className="nav-brand" to="/" onClick={() => setOpenMenu(null)}>
              Time Jump Theme Park
            </Link>
          </div>

          <nav className="nav-links">
            {menuItems.map(menu => {
              if (menu.key === 'tickets') {
                const active = normalizedPath.startsWith('/ticket-passes');
                return (
                  <div key={menu.key} className={`nav-item ${active ? 'nav-item--active' : ''}`}>
                    <Link
                      className="nav-link nav-link--static"
                      to="/ticket-passes"
                      onClick={() => setOpenMenu(null)}
                    >
                      {menu.label}
                    </Link>
                  </div>
                );
              }

              let items = menu.items;
              if (menu.key === 'experiences') {
                items = [
                  { label: 'Rides & Attractions', path: '/things-to-do/rides-attractions' },
                  ...themes.map(theme => ({ label: theme.name, path: `/theme/${theme.slug}` })),
                ];
              }
              const isActive = isMenuActive(menu);
              const isOpen = openMenu === menu.key;
              return (
                <div key={menu.key} className={`nav-item ${isActive ? 'nav-item--active' : ''}`}>
                  <button
                    className="nav-link"
                    aria-haspopup="true"
                    aria-expanded={isOpen}
                    onClick={() => handleMenuToggle(menu.key)}
                  >
                    {menu.label}
                  </button>
                  <div className={`nav-dropdown ${isOpen ? 'nav-dropdown--open' : ''}`}>
                    {items.map(item => (
                      <button
                        key={item.path}
                        className="nav-dropdown__item"
                        onClick={() => handleNavigate(item.path)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

          {staffLinks.length > 0 && (
            <div className="nav-staff">
              {staffLinks.map(link => (
                <button
                  key={link.path}
                  className={`nav-link nav-link--staff ${normalizedPath === link.path ? 'nav-link--active' : ''}`}
                  onClick={() => handleNavigate(link.path)}
                >
                  {link.label}
                </button>
              ))}
            </div>
          )}

          <div className="nav-auth">
            {isCustomer && (
              <button
                className="nav-cart"
                onClick={() => setShowCart(true)}
              >
                Cart
                <span className="nav-cart__badge">{cartCount}</span>
              </button>
            )}
            {user && (
              <Link
                className="nav-account"
                to="/account"
                onClick={() => {
                  setShowCart(false);
                  setOpenMenu(null);
                }}
              >
                Account
              </Link>
            )}
            {user ? (
              <button className="btn primary" onClick={handleSignOut}>
                Sign Out
              </button>
            ) : (
              <button
                className="btn primary"
                onClick={() =>
                  navigate(`/login?redirect=${encodeURIComponent(redirectTarget)}`)
                }
              >
                Sign In
              </button>
            )}
            </div>
          </nav>
        </div>
      </header>
      {authToast && (
        <div className="nav-toast-flyout" role="status">
          <div className="nav-toast-flyout__body">
            <div className="nav-toast-flyout__title">
              {authToast.type === 'in' ? "You're signed in" : "You're signed out"}
            </div>
            <p>{authToast.message}</p>
            <button className="btn primary" onClick={() => setAuthToast(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}
      {showCart && <CartModal onClose={() => setShowCart(false)} />}
    </>
  );
}
