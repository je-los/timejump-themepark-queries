import React, { useEffect, useMemo, useState } from 'react';
import RequireRole from '../components/requirerole.jsx';
import Reports from './reports.jsx';
import { api } from '../auth';
import { useAuth } from '../context/authcontext.jsx';

const SECTION_ORDER = [
  { key: 'operations', label: 'Operations Reports' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'incidents', label: 'Incidents' },
  { key: 'analytics', label: 'Data Explorer' },
];

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
  const [active, setActive] = useState('operations');

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActive(visible[0].target.id);
        }
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.4, 0.6, 1] },
    );
    SECTION_ORDER.forEach(({ key }) => {
      const node = document.getElementById(key);
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="workspace-shell">
      <aside className="workspace-nav">
        <div className="workspace-nav__header">
          <h1>Operations Intelligence</h1>
          <p>Stay on top of cancellations, staffing, and guest experience with a consolidated dashboard.</p>
        </div>
        <nav className="workspace-nav__links">
          {SECTION_ORDER.map(({ key, label }) => (
            <button
              key={key}
              className={`workspace-nav__link ${active === key ? 'workspace-nav__link--active' : ''}`}
              onClick={()=>document.getElementById(key)?.scrollIntoView({ behavior:'smooth', block:'start' })}
            >
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="workspace-content">
        <section id="operations" className="workspace-section">
          <SectionHeader
            title="Operations Reports"
            description="Quickly generate standardized reports for cancellations and daily throughput."
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

        <section id="incidents" className="workspace-section">
          <SectionHeader
            title="Incident Log"
            description="Capture a snapshot of guest or staff incidents and append manual updates."
          />
          <IncidentSection />
        </section>

        <section id="analytics" className="workspace-section">
          <SectionHeader
            title="Data Explorer"
            description="Blend metrics, choose groupings, and export data for deeper analysis."
          />
          <AnalyticsTab />
        </section>
      </main>
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

function IncidentSection() {
  const { actualRole, role } = useAuth();
  const resolvedRole = actualRole || role;
  const canCreate = ['manager', 'admin', 'owner'].includes(resolvedRole);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="workspace-panel-grid">
      {canCreate ? (
        <ManualIncidentForm onSaved={() => setRefreshKey(key => key + 1)} />
      ) : (
        <div className="workspace-panel">
          <h3>Incident logging</h3>
          <p className="workspace-panel__intro">
            Only managers, admins, and owners can file incidents. Contact a supervisor if you need to escalate an issue.
          </p>
        </div>
      )}
      <DataTable
        title="Recent Incidents"
        path="/incidents"
        columns={[
          'IncidentID',
          'IncidentType',
          'EmployeeID',
          'TicketID',
          'Details',
        ]}
        emptyMessage="No incidents logged."
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

  useEffect(() => {
    let active = true;
    api('/incidents/meta')
      .then(res => {
        if (!active) return;
        const info = res?.data || {};
        const types = Array.isArray(info.types) && info.types.length ? info.types : [];
        const severities = Array.isArray(info.severities) && info.severities.length ? info.severities : [1, 2, 3, 4, 5];
        setMeta({ types, severities });
        setMetaError('');
        setForm(prev => ({
          ...prev,
          type: prev.type || (types[0]?.id ? String(types[0].id) : prev.type),
          severity: prev.severity || String(severities[0] ?? ''),
        }));
      })
      .catch(err => {
        if (!active) return;
        setMeta({ types: [], severities: [1, 2, 3, 4, 5] });
        setMetaError(err?.message || 'Unable to load incident metadata.');
      });
    return () => {
      active = false;
    };
  }, []);

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

function ManualIncidentForm({ onSaved }) {
  const [form, setForm] = useState({
    type: '',
    employeeId: '',
    ticketId: '',
    occurredAt: '',
    location: '',
    severity: '',
    details: '',
  });
  const [meta, setMeta] = useState({ types: [], severities: [1, 2, 3, 4, 5] });
  const [metaError, setMetaError] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    let active = true;
    api('/incidents/meta')
      .then(res => {
        if (!active) return;
        const info = res?.data || {};
        const types = Array.isArray(info.types) && info.types.length ? info.types : [];
        const severities = Array.isArray(info.severities) && info.severities.length ? info.severities : [1, 2, 3, 4, 5];
        setMeta({ types, severities });
        setMetaError('');
        setForm(prev => ({
          ...prev,
          type: prev.type || (types[0]?.id ? String(types[0].id) : ''),
          severity: prev.severity || String(severities[0] ?? ''),
        }));
      })
      .catch(err => {
        if (!active) return;
        setMeta({ types: [], severities: [1, 2, 3, 4, 5] });
        setMetaError(err?.message || 'Unable to load incident metadata.');
      });
    return () => {
      active = false;
    };
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setStatus('');
    try {
      await api('/incidents', {
        method: 'POST',
        body: JSON.stringify({
          incidentType: form.type ? Number(form.type) : undefined,
          employeeId: form.employeeId ? Number(form.employeeId) : undefined,
          ticketId: form.ticketId ? Number(form.ticketId) : undefined,
          occurredAt: form.occurredAt,
          location: form.location,
          severity: form.severity ? Number(form.severity) : undefined,
          details: form.details,
        }),
      });
      setStatus('Incident recorded.');
      setForm({
        type: meta.types[0]?.id ? String(meta.types[0].id) : '',
        employeeId: '',
        ticketId: '',
        occurredAt: '',
        location: '',
        severity: meta.severities[0] !== undefined ? String(meta.severities[0]) : '',
        details: '',
      });
      if (onSaved) onSaved();
    } catch (err) {
      setStatus(err?.message || 'Unable to record incident.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="workspace-panel">
      <h3>Quick Log Incident</h3>
      <p className="workspace-panel__intro">
        Capture high-level incident notes before handing the report off to security or HR.
      </p>
      <form onSubmit={submit} className="workspace-form">
          {metaError && <div className="alert error">{metaError}</div>}
        <div className="workspace-form__row">
          <label className="field">
            <span>Incident Type</span>
            <select
              className="input"
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            >
              {meta.types.map(type => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Employee ID</span>
            <input className="input" value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))} placeholder="Optional" />
          </label>
          <label className="field">
            <span>Ticket ID</span>
            <input className="input" value={form.ticketId} onChange={e => setForm(f => ({ ...f, ticketId: e.target.value }))} placeholder="Optional" />
          </label>
        </div>
        <div className="workspace-form__row">
          <label className="field">
            <span>Occurred At</span>
            <input className="input" type="datetime-local" value={form.occurredAt} onChange={e => setForm(f => ({ ...f, occurredAt: e.target.value }))} />
          </label>
          <label className="field">
            <span>Location</span>
            <input className="input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Frontier square, queue, etc." />
          </label>
          <label className="field">
            <span>Severity</span>
            <select
              className="input"
              value={form.severity}
              onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
            >
              {meta.severities.map(level => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          <span>Details</span>
          <textarea className="input" rows={3} value={form.details} onChange={e => setForm(f => ({ ...f, details: e.target.value }))} placeholder="What happened? Who was involved? Any follow-up actions?" />
        </label>
        <div className="workspace-form__actions">
          <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Record Incident'}</button>
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

function AnalyticsTab() {
  const metricOptions = useMemo(() => [
    { key: 'customers', label: 'Customer volume' },
    { key: 'rides', label: 'Ride throughput' },
    { key: 'maintenance', label: 'Maintenance frequency' },
    { key: 'rainouts', label: 'Weather impacts' },
    { key: 'demand', label: 'Demand spikes' },
  ], []);
  const groupOptions = useMemo(() => [
    { key: 'monthly', label: 'Group by month' },
    { key: 'weekly', label: 'Group by week' },
    { key: 'ride', label: 'Breakdown by ride' },
  ], []);

  const [selectedMetrics, setSelectedMetrics] = useState(() => metricOptions.map(m => m.key));
  const [groupBy, setGroupBy] = useState(() => ['monthly']);
  const [ride, setRide] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [rows, setRows] = useState([]);

  function toggleMetric(key) {
    setSelectedMetrics(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }

  function toggleGroup(key) {
    setGroupBy(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }

  async function run(e) {
    e.preventDefault();
    if (busy) return;
    if (selectedMetrics.length === 0) {
      setError('Select at least one data series to include.');
      return;
    }
    setBusy(true);
    setError('');
    setInfo('');
    setRows([]);
    const params = new URLSearchParams();
    params.set('metrics', selectedMetrics.join(','));
    if (groupBy.length) params.set('groupBy', groupBy.join(','));
    if (ride) params.set('ride', ride);
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    try {
      const res = await api('/reports/analytics?' + params.toString());
      const data = res.data || res.rows || [];
      const normalized = Array.isArray(data) ? data : [];
      setRows(normalized);
      if (!normalized.length) setInfo('No results returned for those filters.');
    } catch (err) {
      if (err?.status === 403) {
        setRows([]);
        setInfo('No data returned. If analytics access is restricted, contact an admin or owner.');
      } else {
        setError(err?.message || 'Unable to run analytics report.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="workspace-panel">
      <form onSubmit={run} className="workspace-form">
        <div className="workspace-form__group">
          <span className="workspace-form__label">Select Data Series</span>
          <div className="workspace-chip-row">
            {metricOptions.map(opt => (
              <button
                key={opt.key}
                type="button"
                className={`workspace-chip ${selectedMetrics.includes(opt.key) ? 'workspace-chip--active' : ''}`}
                onClick={()=>toggleMetric(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="workspace-form__group">
          <span className="workspace-form__label">Breakdown</span>
          <div className="workspace-chip-row">
            {groupOptions.map(opt => (
              <button
                key={opt.key}
                type="button"
                className={`workspace-chip ${groupBy.includes(opt.key) ? 'workspace-chip--active' : ''}`}
                onClick={()=>toggleGroup(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="workspace-form__row">
          <label className="field" style={{flex:1}}>
            <span>Filter by Ride (optional)</span>
            <input className="input" placeholder="Thunder Run" value={ride} onChange={e => setRide(e.target.value)} />
          </label>
        </div>

        <div className="workspace-form__row">
          <label className="field">
            <span>Start Date</span>
            <input className="input" type="date" value={start} onChange={e => setStart(e.target.value)} />
          </label>
          <label className="field">
            <span>End Date</span>
            <input className="input" type="date" value={end} onChange={e => setEnd(e.target.value)} />
          </label>
        </div>

        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? 'Running…' : 'Run Report'}
        </button>
      </form>

      {error && <div className="alert error">{error}</div>}
      {!error && info && <div className="text-sm text-gray-700">{info}</div>}
      {!error && rows.length > 0 && (
        <div className="workspace-table workspace-table--wide">
          <table>
            <thead>
              <tr>{Object.keys(rows[0]).map(col => <th key={col}>{col}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx}>
                  {Object.keys(row).map(col => (
                    <td key={col}>{String(row[col] ?? '')}</td>
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
















