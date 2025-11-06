import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authcontext.jsx';
import { useCart } from '../context/cartcontext.jsx';
import CartModal from './cartmodal.jsx';

const MENU_CONFIG = [
  {
    key: 'tickets',
    label: 'Tickets & Passes',
    path: '/ticket-passes',
    items: [
      { label: 'Tickets & Passes', path: '/ticket-passes' },
      { label: 'Day Tickets', path: '/ticket-passes/day-tickets' },
      { label: 'Annual Passes', path: '/ticket-passes/annual-passes' },
      { label: 'Birthday Package', path: '/ticket-passes/birthday-package' },
    ],
  },
  {
    key: 'things',
    label: 'Things To Do',
    path: '/things-to-do/rides-attractions',
    items: [
      { label: 'Rides & Attractions', path: '/things-to-do/rides-attractions' },
      { label: 'Dining', path: '/things-to-do/dining' },
      { label: 'Shopping', path: '/things-to-do/shopping' },
    ],
  },
];

const ROLE_LABEL = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  employee: 'Employee',
  customer: 'Customer',
};

function viewOptionsForRole(actualRole) {
  if (!actualRole || actualRole === 'customer') return [];
  const options = new Set([actualRole]);
  if (actualRole === 'owner') {
    options.add('admin');
    options.add('manager');
    options.add('employee');
    options.add('customer');
  } else if (actualRole === 'admin') {
    options.add('manager');
    options.add('employee');
    options.add('customer');
  } else if (actualRole === 'manager') {
    options.add('employee');
    options.add('customer');
  } else if (actualRole === 'employee') {
    options.add('customer');
  } else {
    options.add('customer');
  }
  return Array.from(options);
}

export default function Nav({ themes = [] }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, actualRole, setViewRole, clearViewRole } = useAuth();
  const { items } = useCart();
  const displayRole = user?.role ?? null;
  const viewOptions = useMemo(() => viewOptionsForRole(actualRole), [actualRole]);
  const [openMenu, setOpenMenu] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const navRef = useRef(null);

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
    setShowCart(false);
    navigate('/', { replace: true });
  }

  function handleViewChange(event) {
    const value = event.target.value;
    if (!actualRole) return;
    if (value === actualRole) clearViewRole();
    else setViewRole(value);
  }

  function isMenuActive(menu) {
    if (normalizedPath === menu.path) return true;
    if (menu.key === 'things') {
      if (normalizedPath.startsWith('/theme/')) return true;
      if (normalizedPath.startsWith('/ride/')) return true;
      const related = ['/things-to-do/rides-attractions', '/things-to-do/dining', '/things-to-do/shopping'];
      if (related.includes(normalizedPath)) return true;
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
              const items =
                menu.key === 'things'
                  ? [
                      { label: 'Rides & Attractions', path: '/things-to-do/rides-attractions' },
                      ...themes.map(theme => ({ label: theme.name, path: `/theme/${theme.slug}` })),
                    { label: 'Dining', path: '/things-to-do/dining' },
                    { label: 'Shopping', path: '/things-to-do/shopping' },
                  ]
                : menu.items;
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

          {displayRole && viewOptions.length > 0 && (
            <div className="nav-viewas">
              <span>View As</span>
              <select value={displayRole} onChange={handleViewChange}>
                {viewOptions.map(role => {
                  const label = ROLE_LABEL[role] || role;
                  const optionLabel = role === actualRole ? `Default - ${label}` : label;
                  return (
                    <option key={role} value={role}>
                      {optionLabel}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

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
      {showCart && <CartModal onClose={() => setShowCart(false)} />}
    </>
  );
}
