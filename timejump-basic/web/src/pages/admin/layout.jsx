import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/authcontext.jsx';
import { Wrap, Panel, formatRole } from './shared.jsx';
import { useAdminInsights } from './hooks/useAdminInsights.js';

function getNavGroups(role) {
  const groups = [
    {
      key: 'catalog',
      label: 'Catalog',
      items: [
        { key: 'tickets', label: 'Ticket Types', to: '/admin/tickets' },
        { key: 'parking', label: 'Parking Lots', to: '/admin/parking' },
        { key: 'gift', label: 'Gift Shop', to: '/admin/gift' },
        { key: 'food', label: 'Dining Menu', to: '/admin/food' },
        { key: 'themes', label: 'Themes', to: '/admin/themes' },
        { key: 'attractions', label: 'Attractions', to: '/admin/attractions' },
      ],
    },
    {
      key: 'operations',
      label: 'Operations',
      items: [
        { key: 'employees', label: 'Employees', to: '/admin/employees' },
        { key: 'maintenance', label: 'Maintenance', to: '/admin/maintenance' },
      ],
    },
  ];
  return groups
    .map(group => ({
      ...group,
      items: group.items.filter(item => !item.roles || item.roles.includes(role)),
    }))
    .filter(group => group.items.length > 0);
}

export function AdminShell({ children }) {
  const { user, actualRole, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { insights, loading: insightsLoading, error: insightsError, refresh } = useAdminInsights();
  const [navSearch, setNavSearch] = useState('');

  if (loading && !user) {
    return (
      <Wrap>
        <Panel>Loading...</Panel>
      </Wrap>
    );
  }

  if (!user) {
    return (
      <Wrap>
        <Panel>Please login.</Panel>
      </Wrap>
    );
  }

  const allowedRole = actualRole ?? user.role;
  if (!['admin', 'owner'].includes(allowedRole)) {
    return (
      <Wrap>
        <Panel>Admin/Owner only.</Panel>
      </Wrap>
    );
  }

  const displayRole = user.role;
  const impersonating = displayRole !== allowedRole;
  const navGroups = useMemo(() => getNavGroups(allowedRole), [allowedRole]);
  const flattenedNav = useMemo(
    () =>
      navGroups.flatMap(group =>
        group.items.map(item => ({
          ...item,
          group: group.label,
        }))
      ),
    [navGroups]
  );
  const filteredNav = navSearch
    ? flattenedNav.filter(item => item.label.toLowerCase().includes(navSearch.toLowerCase()))
    : flattenedNav;

  function isActive(path) {
    if (location.pathname === path) return true;
    if (location.pathname.startsWith(`${path}/`)) return true;
    return false;
  }

  function handleNavSearch(e) {
    e.preventDefault();
    if (filteredNav.length > 0) {
      navigate(filteredNav[0].to);
      setNavSearch('');
    }
  }

  function metric(value, fallback = '--') {
    if (!insights) return fallback;
    return value ?? fallback;
  }

  function formatTimestamp(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  }

  return (
    <Wrap>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '280px 1fr',
          gap: 20,
          padding: '2rem 3rem 3rem',
          alignItems: 'flex-start',
        }}
      >
        <aside
          style={{
            display: 'grid',
            gap: 12,
            alignSelf: 'start',
            position: 'sticky',
            top: 24,
            maxHeight: 'calc(100vh - 48px)',
            overflowY: 'auto',
            paddingRight: 4,
          }}
        >
          <Panel>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Admin Console</div>
            <div className="muted">
              {user.email} · {formatRole(allowedRole)}
            </div>
            {impersonating && (
              <div className="alert warning" style={{ marginTop: 8, fontSize: '0.8rem' }}>
                Viewing as {formatRole(displayRole)}. Switch back via “View As” to regain full access.
              </div>
            )}
          </Panel>

          <Panel>
            <form onSubmit={handleNavSearch} className="admin-search-bar">
              <input
                className="input"
                value={navSearch}
                onChange={e => setNavSearch(e.target.value)}
                placeholder="Jump to page..."
              />
            </form>
            <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              Type a page name and press enter to jump straight there.
            </p>
          </Panel>

          <Panel>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <strong>Quick Stats</strong>
              <button className="btn subtle" type="button" onClick={refresh} disabled={insightsLoading}>
                {insightsLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            {insightsError && <div className="alert error" style={{ marginTop: 8 }}>{insightsError}</div>}
            <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0 0', display: 'grid', gap: 6 }}>
              <li>Open incidents: <strong>{metric(insights?.metrics?.openIncidents)}</strong></li>
              <li>Maintenance queue: <strong>{metric(insights?.metrics?.openMaintenance)}</strong></li>
              <li>Active rides: <strong>{metric(insights?.metrics?.activeRides)}</strong></li>
              <li>Inactive assets: <strong>{metric(insights?.metrics?.inactiveAssets)}</strong></li>
            </ul>
          </Panel>

          <Panel>
            <strong>Alerts</strong>
            <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
              {(insights?.alerts?.length
                ? insights.alerts
                : [{ level: 'info', message: 'No active alerts.' }]).map((alert, index) => (
                  <div key={index} className={`alert ${alert.level}`} style={{ margin: 0 }}>
                    {alert.message}
                  </div>
                ))}
            </div>
          </Panel>

          <Panel>
            <strong>Recent Changes</strong>
            <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
              {(insights?.recentChanges || []).map(change => (
                <div key={`${change.resourceType}-${change.resourceId}`} style={{ fontSize: 12 }}>
                  <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{change.resourceType}</div>
                  <div>ID: {change.resourceId}</div>
                  <div>Status: {change.status || 'unknown'}</div>
                  <div className="muted">{formatTimestamp(change.updatedAt)}</div>
                </div>
              ))}
              {!insights?.recentChanges?.length && <div className="muted">No recent updates tracked.</div>}
            </div>
          </Panel>
        </aside>

        <section style={{ display: 'grid', gap: 16 }}>
          {impersonating && displayRole === 'customer' && (
            <Panel>
              <div className="text-sm text-gray-700">
                You are currently viewing the site as a customer. Switch back using &quot;View As&quot; in the header to access admin and owner tools.
              </div>
            </Panel>
          )}
          <Panel>
            <h3 style={{ marginTop: 0 }}>Quick navigation</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              {navGroups.map(group => (
                <div key={group.key}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{group.label}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {group.items.map(item => (
                      <button
                        key={item.key}
                        type="button"
                        className={`btn ${isActive(item.to) ? 'primary' : ''}`}
                        onClick={() => {
                          if (!isActive(item.to)) navigate(item.to);
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
          {children}
        </section>
      </div>
    </Wrap>
  );
}
