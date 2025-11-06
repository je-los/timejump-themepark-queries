import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/authcontext.jsx';
import { Wrap, Panel, formatRole } from './shared.jsx';

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
        { key: 'incidents', label: 'Incidents', to: '/admin/incidents' },
      ],
    },
    {
      key: 'team',
      label: 'Team Management',
      items: [
        { key: 'team', label: 'Admin & Roles', to: '/admin/team', roles: ['admin', 'owner'] },
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

  function isActive(path) {
    if (location.pathname === path) return true;
    if (location.pathname.startsWith(`${path}/`)) return true;
    return false;
  }

  return (
    <Wrap>
      <Panel>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Admin Console</div>
            <div className="muted">
              {user.email} - {formatRole(allowedRole)}
            </div>
            {impersonating && (
              <div className="muted" style={{ fontSize: '0.75rem' }}>
                Viewing as {formatRole(displayRole)}. Use the header switch to return to your full permissions.
              </div>
            )}
          </div>
        </div>
      </Panel>

      {impersonating && displayRole === 'customer' && (
        <Panel>
          <div className="text-sm text-gray-700">
            You are currently viewing the site as a customer. Switch back using &quot;View As&quot; in the header to access admin and owner tools.
          </div>
        </Panel>
      )}

      <Panel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {navGroups.map((group, index) => (
            <React.Fragment key={group.key}>
              <div
                style={{
                  flexBasis: '100%',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  marginTop: index === 0 ? 0 : 8,
                }}
              >
                {group.label}
              </div>
              {group.items.map(item => (
                <button
                  key={item.key}
                  className={`btn ${isActive(item.to) ? 'primary' : ''}`}
                  onClick={() => {
                    if (!isActive(item.to)) navigate(item.to);
                  }}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </React.Fragment>
          ))}
        </div>
      </Panel>

      <div style={{ display: 'grid', gap: 12 }}>{children}</div>
    </Wrap>
  );
}
