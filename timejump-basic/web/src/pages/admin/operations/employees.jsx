import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../../auth';
import { useAuth } from '../../../context/authcontext.jsx';
import { Panel, ResourceTable } from '../shared.jsx';

const moneyFormatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatCurrency(value) {
  if (value === undefined || value === null || value === '') return '--';
  const num = Number(value);
  if (!Number.isFinite(num)) return value;
  return moneyFormatter.format(num);
}

function formatDate(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function EmployeesPage() {
  const { user, actualRole } = useAuth();
  const allowedRole = actualRole ?? user?.role ?? 'customer';
  const canCreate = ['admin', 'owner'].includes(allowedRole);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [positions, setPositions] = useState([]);
  const [positionsLoading, setPositionsLoading] = useState(true);
  const [positionsError, setPositionsError] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    salary: '',
    startDate: todayIso(),
    password: '',
    positionId: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [status, setStatus] = useState('');

  const [deleteEmployee, setDeleteEmployee] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteStatus, setDeleteStatus] = useState('');
  const [editEmployee, setEditEmployee] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', salary: '', positionId: '' });
  const [editBusy, setEditBusy] = useState(false);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api('/employees');
      setRows(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setError(err?.message || 'Unable to load employees.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const loadPositions = useCallback(async () => {
    setPositionsLoading(true);
    setPositionsError('');
    try {
      const res = await api('/positions');
      setPositions(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setPositions([]);
      setPositionsError(err?.message || 'Unable to load positions.');
    } finally {
      setPositionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPositions();
  }, [loadPositions]);

  useEffect(() => {
    if (!positions.length) return;
    setForm(prev => {
      if (prev.positionId) return prev;
      return { ...prev, positionId: String(positions[0].id) };
    });
  }, [positions]);

  const confirmDelete = useCallback((employee) => {
    if (!canCreate) return;
    setDeleteEmployee(employee);
    setDeleteError('');
    setDeleteStatus('');
    setDeleteBusy(false);
  }, [canCreate]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteEmployee || deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError('');
    setDeleteStatus('');
    try {
      await api(`/employees/${deleteEmployee.employeeID}`, { method: 'DELETE' });
      setDeleteStatus('Employee deleted.');
      setDeleteEmployee(null);
      loadEmployees();
    } catch (err) {
      setDeleteError(err?.message || 'Unable to delete employee.');
    } finally {
      setDeleteBusy(false);
    }
  }, [deleteEmployee, deleteBusy, loadEmployees]);

  const openEditModal = useCallback((employee) => {
    setEditEmployee(employee);
    setEditForm({
      name: employee.name || '',
      salary: employee.salary ?? '',
      positionId: employee.role ? String(employee.role) : (positions[0] ? String(positions[0].id) : ''),
    });
    setFormError('');
    setStatus('');
    setEditBusy(false);
  }, [positions]);

  const handleEditSubmit = async event => {
    event.preventDefault();
    if (!editEmployee || editBusy) return;
    if (!editForm.name.trim()) {
      setFormError('Employee name is required.');
      return;
    }
    const salaryValue = editForm.salary === '' ? null : Number(editForm.salary);
    if (salaryValue !== null && (!Number.isFinite(salaryValue) || salaryValue <= 0)) {
      setFormError('Salary must be greater than zero.');
      return;
    }
    if (salaryValue !== null && salaryValue > 200000) {
      setFormError('Salary must be $200,000 or less.');
      return;
    }
    if (!editForm.positionId) {
      setFormError('Role must be selected.');
      return;
    }
    setEditBusy(true);
    setFormError('');
    try {
      await api(`/employees/${editEmployee.employeeID}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editForm.name.trim(),
          salary: salaryValue,
          positionId: Number(editForm.positionId),
        }),
      });
      setEditEmployee(null);
      loadEmployees();
    } catch (err) {
      setFormError(err?.message || 'Unable to update employee.');
    } finally {
      setEditBusy(false);
    }
  };

  const columns = useMemo(() => {
    const list = [
      { key: 'name', label: 'Name' },
      { key: 'role_name', label: 'Role' },
      { key: 'email', label: 'Email' },
      { key: 'salary', label: 'Salary', render: formatCurrency },
      { key: 'start_date', label: 'Start Date', render: formatDate },
    ];
    if (canCreate) {
      list.push({
        key: 'actions',
        label: 'Actions',
        render: (_, row) => (
          <div className="table-actions">
            <button type="button" className="btn btn-text" onClick={() => openEditModal(row)}>
              Edit
            </button>
            <button type="button" className="btn btn-text danger" onClick={() => confirmDelete(row)}>
              Delete
            </button>
          </div>
        ),
      });
    }
    return list;
  }, [canCreate, confirmDelete, openEditModal]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canCreate || saving) return;

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password.trim();
    const startDate = form.startDate.trim();
    const salaryValue = Number(form.salary);

    if (!name) {
      setFormError('Employee name is required.');
      return;
    }
    if (!email) {
      setFormError('Employee email is required.');
      return;
    }
    if (!password || password.length < 8) {
      setFormError('Password must be at least 8 characters.');
      return;
    }
    if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      setFormError('Start date must be provided in YYYY-MM-DD format.');
      return;
    }
    if (!form.salary || Number.isNaN(salaryValue) || salaryValue <= 0) {
      setFormError('Salary must be greater than zero.');
      return;
    }
    if (salaryValue > 200000) {
      setFormError('Salary must be $200,000 or less.');
      return;
    }
    if (!form.positionId) {
      setFormError('Role must be selected.');
      return;
    }
    setSaving(true);
    setFormError('');
    setStatus('');
    try {
      await api('/employees', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          password,
          salary: salaryValue,
          startDate,
          positionId: Number(form.positionId),
        }),
      });
      setStatus('Employee created successfully.');
      setForm({
        name: '',
        email: '',
        salary: '',
        startDate: todayIso(),
        password: '',
        positionId: positions[0] ? String(positions[0].id) : '',
      });
      loadEmployees();
    } catch (err) {
      setFormError(err?.message || 'Unable to create employee.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-employees">
      {canCreate && (
        <Panel className="admin-employees__form">
          <div className="admin-panel-header">
            <div>
              <h3 style={{ margin: 0 }}>Add Employee</h3>
              <p className="muted" style={{ margin: '4px 0 0' }}>
                Creates both the employee record and linked user credentials.
              </p>
            </div>
          </div>
          <form className="admin-form-grid admin-form-grid--cols" onSubmit={handleSubmit}>
            <label className="field">
              <span>Full Name</span>
              <input
                className="input"
                type="text"
                value={form.name}
                onChange={e => handleChange('name', e.target.value)}
                disabled={saving}
              />
            </label>
            <label className="field">
              <span>Work Email</span>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={e => handleChange('email', e.target.value)}
                disabled={saving}
              />
            </label>
            <label className="field">
              <span>Salary (USD)</span>
              <input
                className="input"
                type="number"
                min="0"
                step="100"
                value={form.salary}
                onChange={e => handleChange('salary', e.target.value)}
                disabled={saving}
              />
            </label>
            <label className="field">
              <span>Start Date</span>
              <input
                className="input"
                type="date"
                value={form.startDate}
                onChange={e => handleChange('startDate', e.target.value)}
                disabled={saving}
              />
            </label>
            <label className="field">
              <span>Role</span>
              <select
                className="input"
                value={form.positionId || ''}
                onChange={e => handleChange('positionId', e.target.value)}
                disabled={saving || positionsLoading || !positions.length}
              >
                {!positions.length && <option value="">No roles available</option>}
                {positions.map(position => (
                  <option key={position.id} value={position.id}>
                    {position.name}
                  </option>
                ))}
              </select>
            </label>
            {positionsError && (
              <div className="alert error" style={{ gridColumn: '1 / -1' }}>
                {positionsError}
              </div>
            )}
            <label className="field field--full">
              <span>Temporary Password</span>
              <input
                className="input"
                type="password"
                value={form.password}
                onChange={e => handleChange('password', e.target.value)}
                disabled={saving}
              />
            </label>
            <button
              className="btn primary"
              type="submit"
              disabled={saving}
              style={{ justifySelf: 'flex-start', width: 'auto' }}
            >
              {saving ? 'Creating...' : 'Create Employee'}
            </button>
          </form>
          <div style={{ marginTop: 12 }}>
            {status && <div className="alert success">{status}</div>}
            {formError && <div className="alert error">{formError}</div>}
          </div>
        </Panel>
      )}

      <ResourceTable
        title="Employees"
        description="Search and sort the full roster."
        rows={rows}
        columns={columns}
        loading={loading}
        error={error}
        emptyMessage="No employees found."
        searchPlaceholder="Search employees..."
        sortableKeys={['name', 'role_name', 'salary', 'start_date']}
      />
      {(deleteStatus || deleteError) && (
        <div>
          {deleteStatus && <div className="alert success">{deleteStatus}</div>}
          {deleteError && <div className="alert error">{deleteError}</div>}
        </div>
      )}

      {editEmployee && (
        <div className="table-modal">
          <div className="table-modal__card">
            <h4>Edit Employee</h4>
            <form className="admin-form-grid admin-form-grid--cols" onSubmit={handleEditSubmit}>
              <label className="field">
                <span>Full name</span>
                <input
                  className="input"
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  disabled={editBusy}
                />
              </label>
              <label className="field">
                <span>Salary (USD)</span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="100"
                  value={editForm.salary}
                  onChange={e => setEditForm(f => ({ ...f, salary: e.target.value }))}
                  disabled={editBusy}
                />
              </label>
              <label className="field">
                <span>Role</span>
                <select
                  className="input"
                  value={editForm.positionId || ''}
                  onChange={e => setEditForm(f => ({ ...f, positionId: e.target.value }))}
                  disabled={editBusy || positionsLoading || !positions.length}
                >
                  {!positions.length && <option value="">No roles available</option>}
                  {positions.map(position => (
                    <option key={position.id} value={position.id}>
                      {position.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="table-modal__actions">
                <button type="button" className="btn" onClick={() => setEditEmployee(null)} disabled={editBusy}>
                  Cancel
                </button>
                <button type="submit" className="btn primary" disabled={editBusy}>
                  {editBusy ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteEmployee && (
        <div className="table-modal">
          <div className="table-modal__card">
            <h4>Delete Employee</h4>
            <p>
              Are you sure you want to remove <strong>{deleteEmployee.name}</strong>?
            </p>
            <div className="table-modal__actions">
              <button type="button" className="btn" onClick={() => setDeleteEmployee(null)} disabled={deleteBusy}>
                Cancel
              </button>
              <button type="button" className="btn danger" onClick={handleDeleteConfirm} disabled={deleteBusy}>
                {deleteBusy ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

