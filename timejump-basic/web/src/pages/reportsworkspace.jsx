import React, { useEffect, useState } from 'react';
import RequireRole from '../components/requirerole.jsx';
import Reports from './reports.jsx';
import { api } from '../auth';
import { useAuth } from '../context/authcontext.jsx';

const MAINTENANCE_TYPES = [
  { value: 'Inspection', label: 'Inspection' },
  { value: 'Annual check-up', label: 'Annual Check-Up' },
  { value: 'Repair', label: 'Repair' },
  { value: 'Emergency fix', label: 'Emergency Fix' },
  { value: 'Upgrade', label: 'Upgrade' },
];

const MAINTENANCE_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

export default function ReportsWorkspace() {
  return (
    <RequireRole
      roles={['employee','manager','admin','owner']}
      fallback={<div className="container"><div className="panel">Reports are restricted to staff.</div></div>}
    >
      <WorkspaceShell />
    </RequireRole>
  );
}

function WorkspaceShell() {
  return (
    <div className="workspace-stack">
      <section id="operations" className="workspace-section">
        <SectionHeader
          title="Reports"
          description="Select the report you need and adjust filters to focus the dataset."
        />
        <Reports />
      </section>

      <section id="maintenance" className="workspace-section">
        <SectionHeader
          title="Maintenance Records"
          description="Review recent maintenance logs and add manual entries when needs arise."
        />
        <MaintenanceSection />
      </section>
    </div>
  );
}

function SectionHeader({ title, description }) {
  return (
    <header className="workspace-section__header">
      <h2>{title}</h2>
      <p>{description}</p>
    </header>
  );
}

function MaintenanceSection() {
  const { actualRole, role } = useAuth();
  const resolvedRole = actualRole || role;
  const canCreate = ['manager', 'admin', 'owner'].includes(resolvedRole);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="workspace-panel-grid">
      {canCreate ? (
        <ManualMaintenanceForm onSaved={() => setRefreshKey(key => key + 1)} />
      ) : (
        <div className="workspace-panel">
          <h3>Maintenance logging</h3>
          <p className="workspace-panel__intro">
            Maintenance requests can be logged by managers, admins, or owners. Reach out to your supervisor if you
            need access.
          </p>
        </div>
      )}
      <DataTable
        title="Recent Maintenance"
        path="/maintenance"
        columns={[
          'RecordID',
          'AttractionID',
          'EmployeeID',
          'Date_broken_down',
          'Date_fixed',
          'type_of_maintenance',
          'Severity_of_report',
        ]}
        emptyMessage="No maintenance records found."
        refreshKey={refreshKey}
        onRefresh={() => setRefreshKey(key => key + 1)}
      />
    </div>
  );
}

function ManualMaintenanceForm({ onSaved }) {
  const [form, setForm] = useState({
    attractionId: '',
    employeeId: '',
    dateBroken: '',
    dateFixed: '',
    type: MAINTENANCE_TYPES[0].value,
    severity: MAINTENANCE_SEVERITIES[1],
    description: '',
  });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setStatus('');
    try {
      await api('/maintenance', {
        method: 'POST',
        body: JSON.stringify({
          attractionId: form.attractionId ? Number(form.attractionId) : undefined,
          employeeId: form.employeeId ? Number(form.employeeId) : undefined,
          dateBrokenDown: form.dateBroken,
          dateFixed: form.dateFixed,
          typeOfMaintenance: form.type,
          severityOfReport: form.severity,
          descriptionOfWork: form.description,
        }),
      });
      setStatus('Maintenance record saved.');
      setForm({
        attractionId: '',
        employeeId: '',
        dateBroken: '',
        dateFixed: '',
        type: '',
        severity: '',
        description: '',
      });
    } catch (err) {
      setStatus(err?.message || 'Unable to save maintenance record.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="workspace-panel">
      <h3>Quick Add Maintenance</h3>
      <p className="workspace-panel__intro">
        Log last-minute work orders or supervisor approvals. Detailed editing can happen later in the admin console.
      </p>
      <form onSubmit={submit} className="workspace-form">
        <div className="workspace-form__row">
          <label className="field">
            <span>Attraction ID</span>
            <input className="input" value={form.attractionId} onChange={e => setForm(f => ({ ...f, attractionId: e.target.value }))} placeholder="102" />
          </label>
          <label className="field">
            <span>Employee ID</span>
            <input className="input" value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))} placeholder="Optional" />
          </label>
        </div>
        <div className="workspace-form__row">
          <label className="field">
            <span>Date Broken</span>
            <input className="input" type="date" value={form.dateBroken} onChange={e => setForm(f => ({ ...f, dateBroken: e.target.value }))} />
          </label>
          <label className="field">
            <span>Date Fixed</span>
            <input className="input" type="date" value={form.dateFixed} onChange={e => setForm(f => ({ ...f, dateFixed: e.target.value }))} />
          </label>
        </div>
        <div className="workspace-form__row">
          <label className="field">
            <span>Type</span>
            <input className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} placeholder="repair" />
          </label>
          <label className="field">
            <span>Severity</span>
            <input className="input" value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))} placeholder="medium" />
          </label>
        </div>
        <label className="field">
          <span>Description</span>
          <textarea className="input" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short summary of the maintenance work." />
        </label>
        <div className="workspace-form__actions">
          <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save Maintenance'}</button>
          {status && <span className="text-sm text-gray-700">{status}</span>}
        </div>
      </form>
    </div>
  );
}

function DataTable({ title, path, columns, emptyMessage, refreshKey = 0, onRefresh }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api(path)
      .then(j => { if (active) setRows(j.data || []); })
      .catch(err => {
        if (!active) return;
        if (err?.status === 403) {
          setRows([]);
        } else {
          setError(err?.message || 'Failed to load data.');
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [path, refreshKey]);

  return (
    <div className="workspace-panel">
      <div className="workspace-panel__top">
        <h3>{title}</h3>
        {onRefresh && (
          <button className="btn" type="button" onClick={onRefresh} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        )}
      </div>
      {loading && <div className="text-sm text-gray-700">Loading...</div>}
      {!loading && error && <div className="alert error">{error}</div>}
      {!loading && !error && rows.length === 0 && (
        <div className="workspace-table__empty">{emptyMessage}</div>
      )}
      {!loading && rows.length > 0 && (
        <div className="workspace-table">
          <table>
            <thead>
              <tr>{columns.map(col => <th key={col}>{col}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx}>
                  {columns.map(col => (
                    <td key={col}>{String(row[col] ?? row[col.toLowerCase()] ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

















