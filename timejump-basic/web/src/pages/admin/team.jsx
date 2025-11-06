import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../auth';
import { Panel, formatRole } from './shared.jsx';

function UserCards({ rows, loading, error, emptyMessage }) {
  if (loading) return <div className="text-sm text-gray-700">Loading...</div>;
  if (error) return <div className="alert error" style={{ marginTop: 8 }}>{error}</div>;
  if (!rows || rows.length === 0) return <div className="text-sm text-gray-700">{emptyMessage}</div>;
  return (
    <div className="grid" style={{ gap: 8, marginTop: 12 }}>
      {rows.map(row => {
        const key = row.user_id ?? row.email ?? Math.random().toString(36).slice(2);
        const created = row.created_at ? new Date(row.created_at).toLocaleDateString() : null;
        return (
          <div key={key} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{row.email}</div>
              <div className="muted">
                {formatRole(row.role)}
                {created ? ` - ${created}` : ''}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function TeamPage({ canManageAdmins, canManageManagers, canManageEmployees }) {
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminStatus, setAdminStatus] = useState('');
  const [adminError, setAdminError] = useState('');
  const [admins, setAdmins] = useState([]);
  const [adminsError, setAdminsError] = useState('');
  const [adminsLoading, setAdminsLoading] = useState(false);

  const [managerEmail, setManagerEmail] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [managerBusy, setManagerBusy] = useState(false);
  const [managerStatus, setManagerStatus] = useState('');
  const [managerError, setManagerError] = useState('');
  const [managers, setManagers] = useState([]);
  const [managersError, setManagersError] = useState('');
  const [managersLoading, setManagersLoading] = useState(false);

  const [employeeEmail, setEmployeeEmail] = useState('');
  const [employeePassword, setEmployeePassword] = useState('');
  const [employeeBusy, setEmployeeBusy] = useState(false);
  const [employeeStatus, setEmployeeStatus] = useState('');
  const [employeeError, setEmployeeError] = useState('');
  const [employees, setEmployees] = useState([]);
  const [employeesError, setEmployeesError] = useState('');
  const [employeesLoading, setEmployeesLoading] = useState(false);

  const loadAdmins = useCallback(async () => {
    if (!canManageAdmins) return;
    setAdminsLoading(true);
    setAdminsError('');
    try {
      const res = await api('/users?role=admin');
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res?.users) ? res.users : [];
      setAdmins(list);
    } catch (err) {
      if (err?.status === 401 || err?.status === 403) {
        setAdmins([]);
        setAdminsError('');
      } else {
        setAdminsError(err?.message || 'Unable to load admins.');
        setAdmins([]);
      }
    } finally {
      setAdminsLoading(false);
    }
  }, [canManageAdmins]);

  const loadManagers = useCallback(async () => {
    if (!canManageManagers) return;
    setManagersLoading(true);
    setManagersError('');
    try {
      const res = await api('/users?role=manager');
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res?.users) ? res.users : [];
      setManagers(list);
    } catch (err) {
      if (err?.status === 401 || err?.status === 403) {
        setManagers([]);
        setManagersError('');
      } else {
        setManagersError(err?.message || 'Unable to load managers.');
        setManagers([]);
      }
    } finally {
      setManagersLoading(false);
    }
  }, [canManageManagers]);

  const loadEmployees = useCallback(async () => {
    if (!canManageEmployees) return;
    setEmployeesLoading(true);
    setEmployeesError('');
    try {
      const res = await api('/users?role=employee');
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res?.users) ? res.users : [];
      setEmployees(list);
    } catch (err) {
      if (err?.status === 401 || err?.status === 403) {
        setEmployees([]);
        setEmployeesError('');
      } else {
        setEmployeesError(err?.message || 'Unable to load employees.');
        setEmployees([]);
      }
    } finally {
      setEmployeesLoading(false);
    }
  }, [canManageEmployees]);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  useEffect(() => {
    loadManagers();
  }, [loadManagers]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  async function createAdmin(e) {
    e.preventDefault();
    if (!canManageAdmins || adminBusy) return;
    if (!adminEmail || !adminPassword) {
      setAdminError('Email and password are required.');
      return;
    }
    setAdminBusy(true);
    setAdminStatus('');
    setAdminError('');
    try {
      await api('/users', {
        method: 'POST',
        body: JSON.stringify({ email: adminEmail, password: adminPassword, role: 'admin' }),
      });
      setAdminStatus('Admin account created.');
      setAdminEmail('');
      setAdminPassword('');
      loadAdmins();
    } catch (err) {
      setAdminError(err?.message || 'Failed to create admin.');
    } finally {
      setAdminBusy(false);
    }
  }

  async function createManager(e) {
    e.preventDefault();
    if (!canManageManagers || managerBusy) return;
    if (!managerEmail || !managerPassword) {
      setManagerError('Email and password are required.');
      return;
    }
    setManagerBusy(true);
    setManagerStatus('');
    setManagerError('');
    try {
      await api('/users', {
        method: 'POST',
        body: JSON.stringify({ email: managerEmail, password: managerPassword, role: 'manager' }),
      });
      setManagerStatus('Manager account created.');
      setManagerEmail('');
      setManagerPassword('');
      loadManagers();
    } catch (err) {
      setManagerError(err?.message || 'Failed to create manager.');
    } finally {
      setManagerBusy(false);
    }
  }

  async function createEmployee(e) {
    e.preventDefault();
    if (!canManageEmployees || employeeBusy) return;
    if (!employeeEmail || !employeePassword) {
      setEmployeeError('Email and password are required.');
      return;
    }
    setEmployeeBusy(true);
    setEmployeeStatus('');
    setEmployeeError('');
    try {
      await api('/users', {
        method: 'POST',
        body: JSON.stringify({ email: employeeEmail, password: employeePassword, role: 'employee' }),
      });
      setEmployeeStatus('Employee account created.');
      setEmployeeEmail('');
      setEmployeePassword('');
      loadEmployees();
    } catch (err) {
      setEmployeeError(err?.message || 'Failed to create employee.');
    } finally {
      setEmployeeBusy(false);
    }
  }

  return (
    <div className="admin-team">
      <Panel>
        <h3 style={{ marginTop: 0 }}>Manage Team Access</h3>
        <p className="muted">
          Create staff accounts and review active credentials across the organization.
        </p>
      </Panel>

      {canManageAdmins && (
        <Panel>
          <h4 style={{ marginTop: 0 }}>Admins</h4>
          <form className="admin-form-grid" onSubmit={createAdmin}>
            <label className="field">
              <span>Email</span>
              <input
                className="input"
                type="email"
                value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)}
                disabled={adminBusy}
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                className="input"
                type="password"
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                disabled={adminBusy}
              />
            </label>
            <button
              className="btn primary"
              type="submit"
              disabled={adminBusy}
              style={{ justifySelf: 'flex-start', width: 'auto' }}
            >
              {adminBusy ? 'Creating...' : 'Create Admin'}
            </button>
          </form>
          <div style={{ marginTop: 12 }}>
            {adminStatus && <div className="alert success">{adminStatus}</div>}
            {adminError && <div className="alert error">{adminError}</div>}
          </div>
          <UserCards rows={admins} loading={adminsLoading} error={adminsError} emptyMessage="No admin accounts yet." />
        </Panel>
      )}

      {canManageManagers && (
        <Panel>
          <h4 style={{ marginTop: 0 }}>Managers</h4>
          <form className="admin-form-grid" onSubmit={createManager}>
            <label className="field">
              <span>Email</span>
              <input
                className="input"
                type="email"
                value={managerEmail}
                onChange={e => setManagerEmail(e.target.value)}
                disabled={managerBusy}
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                className="input"
                type="password"
                value={managerPassword}
                onChange={e => setManagerPassword(e.target.value)}
                disabled={managerBusy}
              />
            </label>
            <button
              className="btn primary"
              type="submit"
              disabled={managerBusy}
              style={{ justifySelf: 'flex-start', width: 'auto' }}
            >
              {managerBusy ? 'Creating...' : 'Create Manager'}
            </button>
          </form>
          <div style={{ marginTop: 12 }}>
            {managerStatus && <div className="alert success">{managerStatus}</div>}
            {managerError && <div className="alert error">{managerError}</div>}
          </div>
          <UserCards rows={managers} loading={managersLoading} error={managersError} emptyMessage="No manager accounts yet." />
        </Panel>
      )}

      {canManageEmployees && (
        <Panel>
          <h4 style={{ marginTop: 0 }}>Employees</h4>
          <form className="admin-form-grid" onSubmit={createEmployee}>
            <label className="field">
              <span>Email</span>
              <input
                className="input"
                type="email"
                value={employeeEmail}
                onChange={e => setEmployeeEmail(e.target.value)}
                disabled={employeeBusy}
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                className="input"
                type="password"
                value={employeePassword}
                onChange={e => setEmployeePassword(e.target.value)}
                disabled={employeeBusy}
              />
            </label>
            <button
              className="btn primary"
              type="submit"
              disabled={employeeBusy}
              style={{ justifySelf: 'flex-start', width: 'auto' }}
            >
              {employeeBusy ? 'Creating...' : 'Create Employee'}
            </button>
          </form>
          <div style={{ marginTop: 12 }}>
            {employeeStatus && <div className="alert success">{employeeStatus}</div>}
            {employeeError && <div className="alert error">{employeeError}</div>}
          </div>
          <UserCards rows={employees} loading={employeesLoading} error={employeesError} emptyMessage="No employee accounts yet." />
        </Panel>
      )}
    </div>
  );
}
