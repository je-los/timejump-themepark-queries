import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../auth';
import { useAuth } from '../context/authcontext.jsx';

const ROLE_LABEL = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  employee: 'Employee',
  customer: 'Customer',
};

function formatRole(role){
  if (!role) return 'Unknown';
  return ROLE_LABEL[role] || role.charAt(0).toUpperCase() + role.slice(1);
}

export default function Admin(){
  const { user, actualRole, loading } = useAuth();
  const [tab, setTab] = useState('catalog');

  if (loading && !user) return <Wrap><Panel>Loading.</Panel></Wrap>;
  if (!user) return <Wrap><Panel>Please login.</Panel></Wrap>;

  const allowedRole = actualRole ?? user.role;
  if (!['admin','owner'].includes(allowedRole)) {
    return <Wrap><Panel>Admin/Owner only.</Panel></Wrap>;
  }

  const displayRole = user.role;
  const impersonating = displayRole !== allowedRole;

  const tabs = useMemo(()=>{
    const base = [
      { key: 'catalog', label: 'Catalog' },
      { key: 'employees', label: 'Employees' },
      { key: 'maintenance', label: 'Maintenance' },
      { key: 'incidents', label: 'Incidents' },
    ];
    if (['admin','owner'].includes(allowedRole)) {
      base.push({ key: 'users', label: 'Team' });
    }
    return base;
  },[allowedRole]);

  useEffect(()=>{
    if (!tabs.find(t=>t.key === tab)) {
      setTab(tabs[0]?.key ?? 'catalog');
    }
  },[tabs, tab]);

  const canManageAdmins = allowedRole === 'owner';
  const canManageManagers = ['admin','owner'].includes(allowedRole);
  const canManageEmployees = ['admin','owner'].includes(allowedRole);

  return (
    <Wrap>
      <Panel>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16}}>
          <div>
            <div style={{fontWeight:700, fontSize:'1.1rem'}}>Admin Console</div>
            <div className="muted">{user.email} - {formatRole(allowedRole)}</div>
            {impersonating && (
              <div className="muted" style={{fontSize:'0.75rem'}}>
                Viewing as {formatRole(displayRole)}. Use the header switch to return to your full permissions.
              </div>
            )}
          </div>
        </div>
      </Panel>

      {impersonating && displayRole === 'customer' && (
        <Panel>
          <div className="text-sm text-gray-700">
            You are currently viewing the site as a customer. Switch back using "View As" in the header to access admin and owner tools.
          </div>
        </Panel>
      )}

      <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
        {tabs.map(def => (
          <button
            key={def.key}
            className={`btn ${tab === def.key ? 'primary' : ''}`}
            onClick={()=>setTab(def.key)}
          >
            {def.label}
          </button>
        ))}
      </div>

      {tab === 'catalog' && <CatalogTab/>}
      {tab === 'employees' && <SimpleTable title="Employees" path="/employees" columns={['employeeID','name','role','role_name','start_date','end_date','email']} emptyMessage="No employees found." />}
      {tab === 'maintenance' && <MaintenanceTab/>}
      {tab === 'incidents' && <IncidentTab/>}
      {tab === 'users' && (canManageEmployees || canManageManagers || canManageAdmins) && (
        <UsersTab
          canManageAdmins={canManageAdmins}
          canManageManagers={canManageManagers}
          canManageEmployees={canManageEmployees}
        />
      )}
    </Wrap>
  );
}

function IncidentTab(){
  const [records,setRecords]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [saving,setSaving]=useState(false);
  const [status,setStatus]=useState('');
  const [formError,setFormError]=useState('');
  const [form,setForm]=useState({
    type:'',
    employeeId:'',
    ticketId:'',
    occurredAt:'',
    location:'',
    severity:'',
    details:'',
  });

  const loadRecords = useCallback(async ()=>{
    setLoading(true);
    setError('');
    try{
      const res = await api('/incidents');
      setRecords(res.data || []);
    }catch(err){
      setError(err?.message || 'Unable to load incidents.');
      setRecords([]);
    }finally{
      setLoading(false);
    }
  },[]);

  useEffect(()=>{ loadRecords(); },[loadRecords]);

  async function submit(e){
    e.preventDefault();
    if (saving) return;
    if (!form.type) {
      setFormError('Incident type is required.');
      return;
    }
    setSaving(true);
    setStatus('');
    setFormError('');
    try{
      await api('/incidents', {
        method:'POST',
        body: JSON.stringify({
          incidentType: Number(form.type),
          employeeId: form.employeeId ? Number(form.employeeId) : undefined,
          ticketId: form.ticketId ? Number(form.ticketId) : undefined,
          occurredAt: form.occurredAt || undefined,
          location: form.location || undefined,
          severity: form.severity ? Number(form.severity) : undefined,
          details: form.details || undefined,
        }),
      });
      setStatus('Incident recorded.');
      setForm({
        type:'',
        employeeId:'',
        ticketId:'',
        occurredAt:'',
        location:'',
        severity:'',
        details:'',
      });
      loadRecords();
    }catch(err){
      setFormError(err?.message || 'Unable to record incident.');
    }finally{
      setSaving(false);
    }
  }

  return (
    <div className="admin-split">
      <div className="admin-split__form">
        <h3>Log Incident</h3>
        <p>Capture an incident snapshot before escalating to security or HR.</p>
        <form className="admin-form-grid" onSubmit={submit}>
          <label className="field">
            <span>Incident type ID</span>
            <input className="input" value={form.type} onChange={e=>setForm(f=>({ ...f, type:e.target.value }))} placeholder="1" />
          </label>
          <label className="field">
            <span>Employee ID (optional)</span>
            <input className="input" value={form.employeeId} onChange={e=>setForm(f=>({ ...f, employeeId:e.target.value }))} placeholder="17" />
          </label>
          <label className="field">
            <span>Ticket ID (optional)</span>
            <input className="input" value={form.ticketId} onChange={e=>setForm(f=>({ ...f, ticketId:e.target.value }))} placeholder="4132" />
          </label>
          <label className="field">
            <span>Occurred at</span>
            <input className="input" type="datetime-local" value={form.occurredAt} onChange={e=>setForm(f=>({ ...f, occurredAt:e.target.value }))} />
          </label>
          <label className="field">
            <span>Location</span>
            <input className="input" value={form.location} onChange={e=>setForm(f=>({ ...f, location:e.target.value }))} placeholder="Queue line, plaza..." />
          </label>
          <label className="field">
            <span>Severity (1-5)</span>
            <input className="input" type="number" min="1" max="5" value={form.severity} onChange={e=>setForm(f=>({ ...f, severity:e.target.value }))} />
          </label>
          <label className="field">
            <span>Details</span>
            <textarea className="input" rows={3} value={form.details} onChange={e=>setForm(f=>({ ...f, details:e.target.value }))} placeholder="Summary of what happened." />
          </label>
          <div className="admin-split__actions">
            <button className="btn primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Record Incident'}</button>
            {(status || formError) && (
              <span className={`admin-split__status ${formError ? 'text-error' : 'text-success'}`}>
                {formError || status}
              </span>
            )}
          </div>
        </form>
      </div>

      <div className="admin-split__panel">
        <div className="admin-panel-header">
          <h3>Recent Incidents</h3>
          <button className="btn" type="button" onClick={loadRecords} disabled={loading}>
            Refresh
          </button>
        </div>
        {loading && <div className="text-sm text-gray-700">Loading...</div>}
        {!loading && error && <div className="alert error">{error}</div>}
        {!loading && !error && (
          <TableList
            rows={records}
            columns={[
              { key:'IncidentID', label:'ID' },
              { key:'IncidentType', label:'Type' },
              { key:'OccurredAt', label:'Occurred At' },
              { key:'Severity', label:'Severity' },
              { key:'Details', label:'Details' },
            ]}
            emptyMessage="No incidents logged."
          />
        )}
      </div>
    </div>
  );
}

function TableList({ rows, columns, emptyMessage }) {
  if (!rows || rows.length === 0) {
    return <div className="text-sm text-gray-600">{emptyMessage}</div>;
  }
  return (
    <div style={{overflowX:'auto'}}>
      <table style={{width:'100%', borderCollapse:'collapse'}}>
        <thead>
          <tr>
            {columns.map(col=>(
              <th key={col.key} style={{textAlign:'left', padding:'6px', borderBottom:'1px solid #ececec'}}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row,idx)=>(
            <tr key={row.id ?? row.slug ?? row.lot ?? row.lotId ?? idx}>
              {columns.map(col=>{
                const raw = row[col.key];
                const value = col.render ? col.render(raw, row) : (raw ?? '');
                return (
                  <td key={col.key} style={{padding:'6px', borderBottom:'1px solid #f5f5f5'}}>
                    {value || value === 0 ? value : '⦔'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SimpleTable({ title, path, columns, emptyMessage='No records found.' }){
  const [rows,setRows]=useState([]);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);

  const normalizedColumns = useMemo(()=>{
    return (columns || []).map(col=>{
      if (typeof col === 'string') {
        const label = col.replace(/_/g, ' ').replace(/\b\w/g, ch=>ch.toUpperCase());
        return { key: col, label };
      }
      return col;
    });
  },[columns]);

  useEffect(()=>{
    let cancelled = false;
    setLoading(true);
    setError('');
    api(path)
      .then(j=>{
        if (cancelled) return;
        setRows(j.data || []);
      })
      .catch(err=>{
        if (cancelled) return;
        if (err?.status === 401 || err?.status === 403) {
          setRows([]);
          setError('');
        } else {
          setError(err?.message || 'Unable to load data.');
          setRows([]);
        }
      })
      .finally(()=>{ if (!cancelled) setLoading(false); });
    return ()=>{ cancelled = true; };
  },[path]);

  return (
    <Panel>
      <h3 style={{marginTop:0}}>{title}</h3>
      {loading && <div className="text-sm text-gray-600">Loading...</div>}
      {!loading && error && <div className="alert error">{error}</div>}
      {!loading && !error && (
        rows.length === 0 ? (
          <div className="text-sm text-gray-600">{emptyMessage}</div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%', borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  {normalizedColumns.map(col=> (
                    <th key={col.key} style={{textAlign:'left', padding:'6px', borderBottom:'1px solid #eee'}}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r,i)=> (
                  <tr key={i}>
                    {normalizedColumns.map(col=> (
                      <td key={col.key} style={{padding:'6px', borderBottom:'1px solid #f3f3f3'}}>
                        {r[col.key] ?? '⦔'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </Panel>
  );
}

function UsersTab({ canManageAdmins, canManageManagers, canManageEmployees }){
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

  const loadAdmins = useCallback(async ()=>{
    if (!canManageAdmins) return;
    setAdminsLoading(true);
    setAdminsError('');
    try{
      const res = await api('/users?role=admin');
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.users) ? res.users : []);
      setAdmins(list);
    }catch(err){
      if (err?.status === 401 || err?.status === 403) {
        setAdmins([]);
        setAdminsError('');
      } else {
        setAdminsError(err?.message || 'Unable to load admins.');
        setAdmins([]);
      }
    }finally{
      setAdminsLoading(false);
    }
  },[canManageAdmins]);

  const loadManagers = useCallback(async ()=>{
    if (!canManageManagers) return;
    setManagersLoading(true);
    setManagersError('');
    try{
      const res = await api('/users?role=manager');
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.users) ? res.users : []);
      setManagers(list);
    }catch(err){
      if (err?.status === 401 || err?.status === 403) {
        setManagers([]);
        setManagersError('');
      } else {
        setManagersError(err?.message || 'Unable to load managers.');
        setManagers([]);
      }
    }finally{
      setManagersLoading(false);
    }
  },[canManageManagers]);

  const loadEmployees = useCallback(async ()=>{
    if (!canManageEmployees) return;
    setEmployeesLoading(true);
    setEmployeesError('');
    try{
      const res = await api('/users?role=employee');
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.users) ? res.users : []);
      setEmployees(list);
    }catch(err){
      if (err?.status === 401 || err?.status === 403) {
        setEmployees([]);
        setEmployeesError('');
      } else {
        setEmployeesError(err?.message || 'Unable to load employees.');
        setEmployees([]);
      }
    }finally{
      setEmployeesLoading(false);
    }
  },[canManageEmployees]);

  useEffect(()=>{ loadAdmins(); },[loadAdmins]);
  useEffect(()=>{ loadManagers(); },[loadManagers]);
  useEffect(()=>{ loadEmployees(); },[loadEmployees]);

  async function createAdmin(e){
    e.preventDefault();
    if (!canManageAdmins || adminBusy) return;
    if (!adminEmail || !adminPassword) {
      setAdminError('Email and password are required.');
      return;
    }
    setAdminBusy(true);
    setAdminStatus('');
    setAdminError('');
    try{
      await api('/users',{ method:'POST', body: JSON.stringify({ email: adminEmail, password: adminPassword, role: 'admin' }) });
      setAdminStatus('Admin account created.');
      setAdminEmail('');
      setAdminPassword('');
      loadAdmins();
    }catch(err){
      setAdminError(err?.message || 'Failed to create admin.');
    }finally{
      setAdminBusy(false);
    }
  }

  async function createManager(e){
    e.preventDefault();
    if (!canManageManagers || managerBusy) return;
    if (!managerEmail || !managerPassword) {
      setManagerError('Email and password are required.');
      return;
    }
    setManagerBusy(true);
    setManagerStatus('');
    setManagerError('');
    try{
      await api('/users',{ method:'POST', body: JSON.stringify({ email: managerEmail, password: managerPassword, role: 'manager' }) });
      setManagerStatus('Manager account created.');
      setManagerEmail('');
      setManagerPassword('');
      loadManagers();
    }catch(err){
      setManagerError(err?.message || 'Failed to create manager.');
    }finally{
      setManagerBusy(false);
    }
  }

  async function createEmployee(e){
    e.preventDefault();
    if (!canManageEmployees || employeeBusy) return;
    if (!employeeEmail || !employeePassword) {
      setEmployeeError('Email and password are required.');
      return;
    }
    setEmployeeBusy(true);
    setEmployeeStatus('');
    setEmployeeError('');
    try{
      await api('/users',{ method:'POST', body: JSON.stringify({ email: employeeEmail, password: employeePassword, role: 'employee' }) });
      setEmployeeStatus('Employee account created.');
      setEmployeeEmail('');
      setEmployeePassword('');
      loadEmployees();
    }catch(err){
      setEmployeeError(err?.message || 'Failed to create employee.');
    }finally{
      setEmployeeBusy(false);
    }
  }

  return (
    <div className="grid" style={{gap:12}}>
      {!canManageAdmins && (canManageManagers || canManageEmployees) && (
        <Panel>
          <div className="text-sm text-gray-700">Only owners can create or manage admin accounts. You can invite new managers and employees below.</div>
        </Panel>
      )}
      {canManageAdmins && (
        <Panel>
          <h3 style={{marginTop:0}}>Create Admin</h3>
          <p className="text-sm text-gray-700">Invite a new admin by email. They will receive the password you enter here.</p>
          <form onSubmit={createAdmin} style={{display:'grid', gap:8, maxWidth:360, marginTop:12}}>
            <input className="input" type="email" placeholder="admin@example.com" value={adminEmail} onChange={e=>setAdminEmail(e.target.value)} required />
            <input className="input" type="password" placeholder="Temporary password" value={adminPassword} onChange={e=>setAdminPassword(e.target.value)} required />
            <button className="btn primary" type="submit" disabled={adminBusy}>
              {adminBusy ? 'Creating...' : 'Create Admin'}
            </button>
          </form>
          {adminError && <div className="alert error" style={{marginTop:8}}>{adminError}</div>}
          {adminStatus && <div className="alert success" style={{marginTop:8}}>{adminStatus}</div>}
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:16}}>
            <div className="text-sm text-gray-600">Existing admins</div>
            <button type="button" className="btn" onClick={loadAdmins} disabled={adminsLoading}>Refresh</button>
          </div>
          <UserCards rows={admins} loading={adminsLoading} error={adminsError} emptyMessage="No admins yet." />
        </Panel>
      )}

      {canManageManagers && (
        <Panel>
          <h3 style={{marginTop:0}}>Create Manager</h3>
          <p className="text-sm text-gray-700">Managers can build schedules and coordinate staffing without full admin access.</p>
          <form onSubmit={createManager} style={{display:'grid', gap:8, maxWidth:360, marginTop:12}}>
            <input className="input" type="email" placeholder="manager@example.com" value={managerEmail} onChange={e=>setManagerEmail(e.target.value)} required />
            <input className="input" type="password" placeholder="Temporary password" value={managerPassword} onChange={e=>setManagerPassword(e.target.value)} required />
            <button className="btn primary" type="submit" disabled={managerBusy}>
              {managerBusy ? 'Creating...' : 'Create Manager'}
            </button>
          </form>
          {managerError && <div className="alert error" style={{marginTop:8}}>{managerError}</div>}
          {managerStatus && <div className="alert success" style={{marginTop:8}}>{managerStatus}</div>}
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:16}}>
            <div className="text-sm text-gray-600">Existing managers</div>
            <button type="button" className="btn" onClick={loadManagers} disabled={managersLoading}>Refresh</button>
          </div>
          <UserCards rows={managers} loading={managersLoading} error={managersError} emptyMessage="No managers yet." />
        </Panel>
      )}

      {canManageEmployees && (
        <Panel>
          <h3 style={{marginTop:0}}>Create Employee</h3>
          <p className="text-sm text-gray-700">Generate login credentials for new employees.</p>
          <form onSubmit={createEmployee} style={{display:'grid', gap:8, maxWidth:360, marginTop:12}}>
            <input className="input" type="email" placeholder="employee@example.com" value={employeeEmail} onChange={e=>setEmployeeEmail(e.target.value)} required />
            <input className="input" type="password" placeholder="Temporary password" value={employeePassword} onChange={e=>setEmployeePassword(e.target.value)} required />
            <button className="btn primary" type="submit" disabled={employeeBusy}>
              {employeeBusy ? 'Creating...' : 'Create Employee'}
            </button>
          </form>
          {employeeError && <div className="alert error" style={{marginTop:8}}>{employeeError}</div>}
          {employeeStatus && <div className="alert success" style={{marginTop:8}}>{employeeStatus}</div>}
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:16}}>
            <div className="text-sm text-gray-600">Existing employees</div>
            <button type="button" className="btn" onClick={loadEmployees} disabled={employeesLoading}>Refresh</button>
          </div>
          <UserCards rows={employees} loading={employeesLoading} error={employeesError} emptyMessage="No employees yet." />
        </Panel>
      )}
    </div>
  );
}

function UserCards({ rows, loading, error, emptyMessage }){
  if (loading) return <div className="text-sm text-gray-700">Loading.</div>;
  if (error) return <div className="alert error" style={{marginTop:8}}>{error}</div>;
  if (!rows || rows.length === 0) return <div className="text-sm text-gray-700">{emptyMessage}</div>;
  return (
    <div className="grid" style={{gap:8, marginTop:12}}>
      {rows.map((row)=>{
        const key = row.user_id ?? row.email ?? Math.random().toString(36).slice(2);
        const created = row.created_at ? new Date(row.created_at).toLocaleDateString() : null;
        return (
          <div key={key} className="card" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div>
              <div style={{fontWeight:600}}>{row.email}</div>
              <div className="muted">{formatRole(row.role)}{created ? ` - ${created}` : ''}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DatasetPanel({ title, description, rows, columns, emptyMessage }){
  return (
    <Panel>
      <div className="dataset-header">
        <div>
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
      </div>
      <TableList rows={rows} columns={columns} emptyMessage={emptyMessage} />
    </Panel>
  );
}

function MaintenanceTab(){
  const [records,setRecords]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [saving,setSaving]=useState(false);
  const [status,setStatus]=useState('');
  const [formError,setFormError]=useState('');
  const [form,setForm]=useState({
    attractionId:'',
    employeeId:'',
    dateBroken:'',
    dateFixed:'',
    type:'',
    severity:'',
    description:'',
  });

  const loadRecords = useCallback(async ()=>{
    setLoading(true);
    setError('');
    try{
      const res = await api('/maintenance');
      setRecords(res.data || []);
    }catch(err){
      setError(err?.message || 'Unable to load maintenance records.');
      setRecords([]);
    }finally{
      setLoading(false);
    }
  },[]);

  useEffect(()=>{ loadRecords(); },[loadRecords]);

  async function submit(e){
    e.preventDefault();
    if (saving) return;
    if (!form.attractionId || !form.dateBroken) {
      setFormError('Attraction ID and broken date are required.');
      return;
    }
    setSaving(true);
    setStatus('');
    setFormError('');
    try{
      await api('/maintenance', {
        method:'POST',
        body: JSON.stringify({
          attractionId: Number(form.attractionId),
          employeeId: form.employeeId ? Number(form.employeeId) : undefined,
          dateBrokenDown: form.dateBroken,
          dateFixed: form.dateFixed || undefined,
          typeOfMaintenance: form.type || undefined,
          severityOfReport: form.severity || undefined,
          descriptionOfWork: form.description || undefined,
        }),
      });
      setStatus('Maintenance record saved.');
      setForm({
        attractionId:'',
        employeeId:'',
        dateBroken:'',
        dateFixed:'',
        type:'',
        severity:'',
        description:'',
      });
      loadRecords();
    }catch(err){
      setFormError(err?.message || 'Unable to save maintenance record.');
    }finally{
      setSaving(false);
    }
  }

  return (
    <div className="admin-split">
      <div className="admin-split__form">
        <h3>Log Maintenance</h3>
        <p>Capture quick updates or emergency work orders.</p>
        <form className="admin-form-grid" onSubmit={submit}>
          <label className="field">
            <span>Attraction ID</span>
            <input className="input" value={form.attractionId} onChange={e=>setForm(f=>({ ...f, attractionId:e.target.value }))} placeholder="102" />
          </label>
          <label className="field">
            <span>Employee ID (optional)</span>
            <input className="input" value={form.employeeId} onChange={e=>setForm(f=>({ ...f, employeeId:e.target.value }))} placeholder="17" />
          </label>
          <label className="field">
            <span>Date broken</span>
            <input className="input" type="date" value={form.dateBroken} onChange={e=>setForm(f=>({ ...f, dateBroken:e.target.value }))} />
          </label>
          <label className="field">
            <span>Date fixed</span>
            <input className="input" type="date" value={form.dateFixed} onChange={e=>setForm(f=>({ ...f, dateFixed:e.target.value }))} />
          </label>
          <label className="field">
            <span>Type</span>
            <input className="input" value={form.type} onChange={e=>setForm(f=>({ ...f, type:e.target.value }))} placeholder="repair, inspection..." />
          </label>
          <label className="field">
            <span>Severity</span>
            <input className="input" value={form.severity} onChange={e=>setForm(f=>({ ...f, severity:e.target.value }))} placeholder="low / medium / high" />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea className="input" rows={3} value={form.description} onChange={e=>setForm(f=>({ ...f, description:e.target.value }))} placeholder="What was repaired?" />
          </label>
          <div className="admin-split__actions">
            <button className="btn primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Maintenance'}</button>
            {(status || formError) && (
              <span className={`admin-split__status ${formError ? 'text-error' : 'text-success'}`}>
                {formError || status}
              </span>
            )}
          </div>
        </form>
      </div>

      <div className="admin-split__panel">
        <div className="admin-panel-header">
          <h3>Recent Maintenance</h3>
          <button className="btn" type="button" onClick={loadRecords} disabled={loading}>
            Refresh
          </button>
        </div>
        {loading && <div className="text-sm text-gray-700">Loading...</div>}
        {!loading && error && <div className="alert error">{error}</div>}
        {!loading && !error && (
          <TableList
            rows={records}
            columns={[
              { key:'RecordID', label:'ID' },
              { key:'AttractionID', label:'Attraction' },
              { key:'Date_broken_down', label:'Broken' },
              { key:'type_of_maintenance', label:'Type' },
              { key:'Severity_of_report', label:'Severity' },
              { key:'Description_of_work', label:'Description' },
            ]}
            emptyMessage="No maintenance records yet."
          />
        )}
      </div>
    </div>
  );
}

function Wrap({ children }){
  return <div className="container" style={{display:'grid', gap:12}}>{children}</div>;
}

function Panel({ children, className = '' }){
  return <div className={`panel ${className}`.trim()}>{children}</div>;
}

function CatalogTab(){
  const [ticketForm,setTicketForm]=useState({ name:'', price:'' });
  const [giftForm,setGiftForm]=useState({ name:'', price:'' });
  const [foodForm,setFoodForm]=useState({ name:'', price:'' });
  const [parkingForm,setParkingForm]=useState({ lot:'', price:'' });
  const [themeForm,setThemeForm]=useState({ name:'', description:'' });
  const [attractionForm,setAttractionForm]=useState({
    name:'',
    themeId:'',
    typeId:'',
    heightRestriction:'',
    ridersPerVehicle:'',
  });

  const [tickets,setTickets]=useState([]);
  const [gift,setGift]=useState([]);
  const [food,setFood]=useState([]);
  const [parking,setParking]=useState([]);
  const [themes,setThemes]=useState([]);
  const [attractions,setAttractions]=useState([]);
  const [types,setTypes]=useState([]);

  const [activeCreate,setActiveCreate]=useState('tickets');
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState('');
  const [formError,setFormError]=useState('');
  const [loadError,setLoadError]=useState('');

  const createOptions = useMemo(()=>[
    { key:'tickets', label:'Ticket Type', hint:'Add day tickets or special offers that appear in checkout.' },
    { key:'parking', label:'Parking Lot', hint:'Maintain the parking lots available for guests to purchase.' },
    { key:'gift', label:'Gift Shop Item', hint:'Keep souvenir inventory updated.' },
    { key:'food', label:'Food Menu Item', hint:'Capture menu highlights for dining.' },
    { key:'theme', label:'Theme', hint:'Stand up new lands to group attractions.' },
    { key:'attraction', label:'Attraction', hint:'Add rides and experiences with their limits.' },
  ],[]);

  const load = useCallback(async ()=>{
    setLoading(true);
    setLoadError('');
    try{
      const [
        ticketRes,
        parkingRes,
        giftRes,
        foodRes,
        themeRes,
        attractionRes,
        typeRes,
      ] = await Promise.all([
        api('/ticket-types').catch(()=>({ data: [] })),
        api('/parking-lots').catch(()=>({ data: [] })),
        api('/gift-items').catch(()=>({ data: [] })),
        api('/food-items').catch(()=>({ data: [] })),
        api('/themes').catch(()=>({ data: [] })),
        api('/attractions').catch(()=>({ data: [] })),
        api('/attraction-types').catch(()=>({ data: [] })),
      ]);
      setTickets((ticketRes.data || []).map(item => ({
        id: item.ticket_type ?? item.name ?? item.id,
        name: item.name ?? item.ticket_type ?? 'Ticket',
        price: Number(item.price ?? 0),
      })));
      setParking((parkingRes.data || []).map(item => {
        const serviceDate = item.serviceDate ?? item.service_date ?? null;
        const passes = item.passesToday ?? item.passes_today ?? null;
        return {
          lotId: item.lotId ?? item.parking_lot_id ?? null,
          lot: item.lot ?? item.lot_name ?? '',
          price: Number(item.price ?? item.base_price ?? 0),
          serviceDate: serviceDate ? String(serviceDate) : null,
          passesToday: passes !== null && passes !== undefined ? Number(passes) : null,
        };
      }));
      setGift(giftRes.data || []);
      setFood(foodRes.data || []);
      setThemes((themeRes.data || []).map(item => ({
        id: item.themeID ?? item.id,
        name: item.name ?? item.themeName,
        description: item.description ?? item.Description ?? '',
        attraction_count: item.attraction_count ?? 0,
      })));
      setAttractions((attractionRes.data || []).map(item => ({
        id: item.AttractionID ?? item.id,
        name: item.Name ?? item.name,
        theme: item.theme_name ?? '',
        type: item.attraction_type_name ?? item.TypeName ?? item.type ?? '',
        height: item.HeightRestriction ?? item.height_restriction,
        riders: item.RidersPerVehicle ?? item.riders_per_vehicle,
      })));
      setTypes((typeRes.data || []).map(item => ({
        id: item.id ?? item.AttractionType ?? item.AttractionTypeID,
        name: item.name ?? item.TypeName,
      })));
    }catch(err){
      setLoadError(err?.message || 'Unable to load catalog data.');
    }finally{
      setLoading(false);
    }
  },[]);

  useEffect(()=>{ load(); },[load]);
  useEffect(()=>{ setStatus(''); setFormError(''); },[activeCreate]);

  async function submit(path, body, reset){
    setBusy(true);
    setStatus('');
    setFormError('');
    try{
      await api(path, { method:'POST', body: JSON.stringify(body) });
      setStatus('Saved.');
      reset?.();
      load();
    }catch(err){
      setFormError(err?.message || 'Request failed.');
    }finally{
      setBusy(false);
    }
  }

  function viewFor(key){
    switch(key){
      case 'tickets':
        return (
          <form className="admin-form-grid" onSubmit={e=>{
            e.preventDefault();
            if (!ticketForm.name.trim()) { setFormError('Ticket name is required.'); return; }
            submit('/ticket-types', {
              name: ticketForm.name.trim(),
              price: Number(ticketForm.price || 0),
            }, () => setTicketForm({ name:'', price:'' }));
          }}>
            <label className="field">
              <span>Ticket name</span>
              <input className="input" value={ticketForm.name} onChange={e=>setTicketForm(f=>({ ...f, name:e.target.value }))} placeholder="Adult, Child, VIP" disabled={busy} />
            </label>
            <label className="field">
              <span>Price</span>
              <input className="input" type="number" min="0" step="0.01" value={ticketForm.price} onChange={e=>setTicketForm(f=>({ ...f, price:e.target.value }))} disabled={busy} />
            </label>
            <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Add Ticket Type'}</button>
          </form>
        );
      case 'parking':
        return (
          <form className="admin-form-grid" onSubmit={e=>{
            e.preventDefault();
            if (!parkingForm.lot.trim()) { setFormError('Parking lot name is required.'); return; }
            const priceValue = Number(parkingForm.price);
            if (!Number.isFinite(priceValue) || priceValue < 0) {
              setFormError('Base price must be a non-negative number.');
              return;
            }
            submit('/parking-lots', {
              lot_name: parkingForm.lot.trim(),
              base_price: priceValue,
            }, () => setParkingForm({ lot:'', price:'' }));
          }}>
            <label className="field">
              <span>Lot name</span>
              <input className="input" value={parkingForm.lot} onChange={e=>setParkingForm(f=>({ ...f, lot:e.target.value }))} placeholder="Lot F" disabled={busy} />
            </label>
            <label className="field">
              <span>Base price</span>
              <input className="input" type="number" min="0" step="0.01" value={parkingForm.price} onChange={e=>setParkingForm(f=>({ ...f, price:e.target.value }))} disabled={busy} />
            </label>
            <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Add Parking Lot'}</button>
          </form>
        );
      case 'gift':
        return (
          <form className="admin-form-grid" onSubmit={e=>{
            e.preventDefault();
            if (!giftForm.name.trim()) { setFormError('Item name is required.'); return; }
            submit('/gift-items', {
              name: giftForm.name.trim(),
              price: Number(giftForm.price || 0),
            }, () => setGiftForm({ name:'', price:'' }));
          }}>
            <label className="field">
              <span>Item name</span>
              <input className="input" value={giftForm.name} onChange={e=>setGiftForm(f=>({ ...f, name:e.target.value }))} placeholder="Time Beacon Snow Globe" disabled={busy} />
            </label>
            <label className="field">
              <span>Price</span>
              <input className="input" type="number" min="0" step="0.01" value={giftForm.price} onChange={e=>setGiftForm(f=>({ ...f, price:e.target.value }))} disabled={busy} />
            </label>
            <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Add Gift Item'}</button>
          </form>
        );
      case 'food':
        return (
          <form className="admin-form-grid" onSubmit={e=>{
            e.preventDefault();
            if (!foodForm.name.trim()) { setFormError('Menu item name is required.'); return; }
            submit('/food-items', {
              name: foodForm.name.trim(),
              price: Number(foodForm.price || 0),
            }, () => setFoodForm({ name:'', price:'' }));
          }}>
            <label className="field">
              <span>Menu item</span>
              <input className="input" value={foodForm.name} onChange={e=>setFoodForm(f=>({ ...f, name:e.target.value }))} placeholder="Astro Funnel Cake" disabled={busy} />
            </label>
            <label className="field">
              <span>Price</span>
              <input className="input" type="number" min="0" step="0.01" value={foodForm.price} onChange={e=>setFoodForm(f=>({ ...f, price:e.target.value }))} disabled={busy} />
            </label>
            <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Add Menu Item'}</button>
          </form>
        );
      case 'theme':
        return (
          <form className="admin-form-grid" onSubmit={e=>{
            e.preventDefault();
            if (!themeForm.name.trim()) { setFormError('Theme name is required.'); return; }
            if (!themeForm.description.trim()) { setFormError('Theme description is required.'); return; }
            submit('/themes', {
              name: themeForm.name.trim(),
              description: themeForm.description.trim(),
            }, () => setThemeForm({ name:'', description:'' }));
          }}>
            <label className="field">
              <span>Theme name</span>
              <input className="input" value={themeForm.name} onChange={e=>setThemeForm(f=>({ ...f, name:e.target.value }))} placeholder="Steampunk Harbor" disabled={busy} />
            </label>
            <label className="field">
              <span>Description</span>
              <textarea className="input" rows={3} value={themeForm.description} onChange={e=>setThemeForm(f=>({ ...f, description:e.target.value }))} placeholder="How would you describe this land to guests?" disabled={busy} />
            </label>
            <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Add Theme'}</button>
          </form>
        );
      case 'attraction':
        return (
          <form className="admin-form-grid" onSubmit={e=>{
            e.preventDefault();
            if (!attractionForm.name.trim() || !attractionForm.themeId || !attractionForm.typeId) {
              setFormError('Attraction name, theme, and type are required.');
              return;
            }
            submit('/attractions', {
              name: attractionForm.name.trim(),
              themeId: Number(attractionForm.themeId),
              typeId: Number(attractionForm.typeId),
              heightRestriction: Number(attractionForm.heightRestriction || 0),
              ridersPerVehicle: Number(attractionForm.ridersPerVehicle || 0),
            }, () => setAttractionForm({
              name:'',
              themeId:'',
              typeId:'',
              heightRestriction:'',
              ridersPerVehicle:'',
            }));
          }}>
            <label className="field">
              <span>Attraction name</span>
              <input className="input" value={attractionForm.name} onChange={e=>setAttractionForm(f=>({ ...f, name:e.target.value }))} placeholder="Chrono Coaster" disabled={busy} />
            </label>
            <label className="field">
              <span>Theme</span>
              <select className="input" value={attractionForm.themeId} onChange={e=>setAttractionForm(f=>({ ...f, themeId:e.target.value }))} disabled={busy}>
                <option value="">Select theme...</option>
                {themes.map(theme=>(
                  <option key={theme.id} value={theme.id}>{theme.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Attraction type</span>
              <select className="input" value={attractionForm.typeId} onChange={e=>setAttractionForm(f=>({ ...f, typeId:e.target.value }))} disabled={busy}>
                <option value="">Select type...</option>
                {types.map(type=>(
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Height restriction (inches)</span>
              <input className="input" type="number" min="0" value={attractionForm.heightRestriction} onChange={e=>setAttractionForm(f=>({ ...f, heightRestriction:e.target.value }))} disabled={busy} />
            </label>
            <label className="field">
              <span>Riders per vehicle</span>
              <input className="input" type="number" min="0" value={attractionForm.ridersPerVehicle} onChange={e=>setAttractionForm(f=>({ ...f, ridersPerVehicle:e.target.value }))} disabled={busy} />
            </label>
            <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Add Attraction'}</button>
          </form>
        );
      default:
        return null;
    }
  }

  return (
    <div className="admin-catalog">
      <div className="admin-catalog__layout">
        <div className="admin-catalog__create">
          <div className="admin-catalog__selector">
            <div className="admin-catalog__label">Create</div>
            <select className="input" value={activeCreate} onChange={e=>setActiveCreate(e.target.value)} disabled={busy}>
              {createOptions.map(opt=>(
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
          </div>
          {createOptions.find(opt=>opt.key === activeCreate)?.hint && (
            <p className="admin-catalog__hint">
              {createOptions.find(opt=>opt.key === activeCreate)?.hint}
            </p>
          )}
          <div className="admin-catalog__form">
            {viewFor(activeCreate)}
          </div>
          <div className="admin-catalog__messages">
            {status && <div className="alert success">{status}</div>}
            {formError && <div className="alert error">{formError}</div>}
          </div>
        </div>

        <div className="admin-catalog__datasets">
          {loading && <div className="text-sm text-gray-600">Refreshing catalog...</div>}
          {loadError && <div className="alert error">{loadError}</div>}

          <DatasetPanel
            title="Ticket Types"
            description="Passes visible to guests in checkout."
            rows={tickets}
            columns={[
              { key:'name', label:'Ticket' },
              { key:'price', label:'Price', render:val=>`$${Number(val||0).toFixed(2)}` },
            ]}
            emptyMessage="No tickets yet."
          />

          <DatasetPanel
            title="Parking Lots"
            description="Parking options guests can add."
            rows={parking}
            columns={[
              { key:'lot', label:'Lot' },
              { key:'price', label:'Base Price', render:val=>`$${Number(val||0).toFixed(2)}` },
            ]}
            emptyMessage="No parking lots yet."
          />

          <DatasetPanel
            title="Gift Shop Items"
            description="Souvenir lineup for merchandising."
            rows={gift}
            columns={[
              { key:'name', label:'Item' },
              { key:'shop_name', label:'Shop' },
              { key:'price', label:'Price', render:val=>`$${Number(val||0).toFixed(2)}` },
            ]}
            emptyMessage="No gift items tracked."
          />

          <DatasetPanel
            title="Food Menu Items"
            description="Dining options surfaced to guests."
            rows={food}
            columns={[
              { key:'name', label:'Item' },
              { key:'vendor_name', label:'Vendor' },
              { key:'price', label:'Price', render:val=>`$${Number(val||0).toFixed(2)}` },
            ]}
            emptyMessage="No food items tracked."
          />

          <DatasetPanel
            title="Themes"
            description="Lands that group attractions."
            rows={themes}
            columns={[
              { key:'name', label:'Theme' },
              { key:'description', label:'Description' },
              { key:'attraction_count', label:'# Attractions' },
            ]}
            emptyMessage="No themes created yet."
          />

          <DatasetPanel
            title="Attractions"
            description="Rides and experiences."
            rows={attractions}
            columns={[
              { key:'name', label:'Attraction' },
              { key:'theme', label:'Theme' },
              { key:'type', label:'Type' },
              { key:'height', label:'Height (in)' },
              { key:'riders', label:'Riders / Vehicle' },
            ]}
            emptyMessage="No attractions recorded."
          />
        </div>
      </div>
    </div>
  );
}
