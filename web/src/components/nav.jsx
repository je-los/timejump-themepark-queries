import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/authcontext.jsx';

const menuConfig = [
  {
    key: 'tickets',
    label: 'Tickets & Passes',
    path: 'ticket-passes',
    items: [
      { label: 'Tickets & Passes', path: 'ticket-passes' },
      { label: 'Day Tickets', path: 'ticket-passes/day-tickets' },
      { label: 'Annual Passes', path: 'ticket-passes/annual-passes' },
      { label: 'Birthday Package', path: 'ticket-passes/birthday-package' },
    ],
  },
  {
    key: 'things',
    label: 'Things To Do',
    path: 'things-to-do/rides-attractions',
    items: [
      { label: 'Rides & Attractions', path: 'things-to-do/rides-attractions' },
      { label: 'Dining', path: 'things-to-do/dining' },
      { label: 'Shopping', path: 'things-to-do/shopping' },
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

const aliasMap = {
  Tickets: 'ticket-passes',
  Attractions: 'things-to-do/rides-attractions',
  GiftShop: 'things-to-do/shopping',
  FoodVendors: 'things-to-do/dining',
  Reports: 'Reports',
  Manager: 'Manager',
  Admin: 'Admin',
};

export default function Nav({ current, onChange, onAuth, themes = [] }) {
  const { user, actualRole, setViewRole, clearViewRole } = useAuth();
  const displayRole = user?.role ?? null;
  const viewOptions = useMemo(() => viewOptionsForRole(actualRole), [actualRole]);
  const [openMenu, setOpenMenu] = useState(null);
  const navRef = useRef(null);

  useEffect(()=>{
    function handleDocumentClick(evt){
      if(!navRef.current) return;
      if(!navRef.current.contains(evt.target)){
        setOpenMenu(null);
      }
    }
    document.addEventListener('click', handleDocumentClick);
    return ()=>document.removeEventListener('click', handleDocumentClick);
  },[]);

  function handleNavigate(path){
    setOpenMenu(null);
    if (onChange) onChange(path);
  }

  function handleMenuToggle(menuKey){
    setOpenMenu(prev => prev === menuKey ? null : menuKey);
  }

  function handleViewChange(event){
    const value = event.target.value;
    if (!actualRole) return;
    if (value === actualRole) clearViewRole();
    else setViewRole(value);
  }

  function isMenuActive(menu){
    if(!current) return false;
    const normalized = aliasMap[current] || current;
    if (normalized === menu.path) return true;
    if (menu.key === 'things') {
      if (normalized.startsWith('theme/')) return true;
      const related = ['things-to-do/rides-attractions','things-to-do/dining','things-to-do/shopping'];
      if (related.includes(normalized)) return true;
    }
    if (menu.key === 'tickets') {
      const related = ['ticket-passes','ticket-passes/day-tickets','ticket-passes/annual-passes','ticket-passes/birthday-package'];
      if (related.includes(normalized)) return true;
    }
    return menu.items.some(item => item.path === normalized || current === item.path);
  }

  const staffLinks = useMemo(()=>{
    const links = [];
    if (['employee','manager','admin','owner'].includes(displayRole)) {
      links.push({ label:'Reports', path:'Reports' });
    }
    if (['manager','admin','owner'].includes(displayRole)) {
      links.push({ label:'Manager', path:'Manager' });
    }
    if (['admin','owner'].includes(displayRole)) {
      links.push({ label:'Admin', path:'Admin' });
    }
    return links;
  },[displayRole]);

  return (
    <header className="nav-shell" ref={navRef}>
      <div className="nav-bar">
        <button className="nav-brand" onClick={()=>handleNavigate('Home')}>
          Time Jump Theme Park
        </button>

        <nav className="nav-links">
          {menuConfig.map(menu => {
            const items = menu.key === 'things'
              ? [
                  { label: 'Rides & Attractions', path: 'things-to-do/rides-attractions' },
                  ...themes.map(theme => ({ label: theme.name, path: `theme/${theme.slug}` })),
                  { label: 'Dining', path: 'things-to-do/dining' },
                  { label: 'Shopping', path: 'things-to-do/shopping' }
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
                  onClick={()=>handleMenuToggle(menu.key)}
                >
                  {menu.label}
                </button>
                <div className={`nav-dropdown ${isOpen ? 'nav-dropdown--open' : ''}`}>
                  {items.map(item => (
                    <button
                      key={item.path}
                      className="nav-dropdown__item"
                      onClick={()=>handleNavigate(item.path)}
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
                {viewOptions.map(role => (
                  <option key={role} value={role}>
                    {role === actualRole ? `Default – ${ROLE_LABEL[role] || role}` : (ROLE_LABEL[role] || role)}
                  </option>
                ))}
              </select>
            </div>
          )}
          {staffLinks.length > 0 && (
            <div className="nav-staff">
              {staffLinks.map(link => (
                <button
                  key={link.path}
                  className={`nav-link nav-link--staff ${current===link.path ? 'nav-link--active' : ''}`}
                  onClick={()=>handleNavigate(link.path)}
                >
                  {link.label}
                </button>
              ))}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
