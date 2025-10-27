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

  if (loading && !user) return <Wrap><Panel>Loading…</Panel></Wrap>;
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
            <div className="muted">{user.email} • {formatRole(allowedRole)}</div>
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
            You are currently viewing the site as a customer. Switch back using “View As” in the header to access admin and owner tools.
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
      {tab === 'employees' && <SimpleTable title="Employees" path="/employees" columns={['employeeID','name','role','start_date','end_date','email']} />}
      {tab === 'maintenance' && <SimpleTable title="Maintenance" path="/maintenance" columns={['RecordID','AttractionID','EmployeeID','Date_broken_down','Date_fixed','type_of_maintenance','Severity_of_report']} />}
      {tab === 'incidents' && <SimpleTable title="Incidents" path="/incidents" columns={['IncidentID','IncidentType','EmployeeID','TicketID','Details']} />}
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

function Wrap({ children }){
  return <div className="container" style={{display:'grid', gap:12}}>{children}</div>;
}

function Panel({ children }){
  return <div className="panel">{children}</div>;
}

function CatalogTab(){
  const [gift,setGift]=useState([]); const [food,setFood]=useState([]); const [tickets,setTickets]=useState([]); const [parking,setParking]=useState([]);
  const [gName,setGName]=useState(''); const [gPrice,setGPrice]=useState('');
  const [fName,setFName]=useState(''); const [fPrice,setFPrice]=useState('');
  const [tName,setTName]=useState(''); const [tPrice,setTPrice]=useState('');
  const [pName,setPName]=useState(''); const [pPrice,setPPrice]=useState('');

  async function load(){
    const g = await api('/gift-items'); setGift(g.data||[]);
    const f = await api('/food-items'); setFood(f.data||[]);
    const t = await api('/ticket-types').catch(()=>({ data: [] }));
    const ticketRows = (t.data || []).map(item => ({
      item_id: item.ticket_type ?? item.code ?? item.id ?? item.name ?? Math.random().toString(36).slice(2),
      name: item.name ?? item.ticket_type ?? 'Ticket',
      price: item.price ?? item.cost ?? 0,
    }));
    setTickets(ticketRows);
    const p = await api('/parking-lots').catch(()=>({ data: [] }));
    const parkingRows = (p.data || []).map(item => ({
      item_id: item.lot_id ?? item.id ?? item.name ?? Math.random().toString(36).slice(2),
      name: item.name ?? item.lot_name ?? 'Parking Lot',
      price: item.price ?? item.rate ?? 0,
    }));
    setParking(parkingRows);
  }
  useEffect(()=>{ load(); },[]);

  async function addGift(){
    await api('/gift-items',{ method:'POST', body: JSON.stringify({ name:gName, price:Number(gPrice) }) });
    setGName(''); setGPrice(''); load();
  }
  async function addFood(){
    await api('/food-items',{ method:'POST', body: JSON.stringify({ name:fName, price:Number(fPrice) }) });
    setFName(''); setFPrice(''); load();
  }
  async function addTicket(){
    await api('/ticket-types',{ method:'POST', body: JSON.stringify({ name:tName, price:Number(tPrice) }) });
    setTName(''); setTPrice(''); load();
  }
  async function addParking(){
    await api('/parking-lots',{ method:'POST', body: JSON.stringify({ name:pName, price:Number(pPrice) }) });
    setPName(''); setPPrice(''); load();
  }

  return (
    <Panel>
      <h3 style={{marginTop:0}}>Catalog</h3>
      <div className="catalog-grid">
        <CatalogCard
          title="Gift Items"
          nameValue={gName}
          priceValue={gPrice}
          onNameChange={setGName}
          onPriceChange={setGPrice}
          onAdd={addGift}
          addLabel="Add"
          rows={gift}
        />
        <CatalogCard
          title="Food Items"
          nameValue={fName}
          priceValue={fPrice}
          onNameChange={setFName}
          onPriceChange={setFPrice}
          onAdd={addFood}
          addLabel="Add"
          rows={food}
        />
        <CatalogCard
          title="Ticket Types"
          nameValue={tName}
          priceValue={tPrice}
          onNameChange={setTName}
          onPriceChange={setTPrice}
          onAdd={addTicket}
          addLabel="Add Ticket"
          rows={tickets}
        />
        <CatalogCard
          title="Parking Lots"
          nameValue={pName}
          priceValue={pPrice}
          onNameChange={setPName}
          onPriceChange={setPPrice}
          onAdd={addParking}
          addLabel="Add Lot"
          rows={parking}
        />
      </div>
    </Panel>
  );
}

function CatalogCard({ title, nameValue, priceValue, onNameChange, onPriceChange, onAdd, addLabel, rows }){
  return (
    <div className="catalog-card">
      <div style={{fontWeight:600, marginBottom:8}}>{title}</div>
      <div style={{display:'flex', gap:8, marginBottom:12, flexWrap:'wrap'}}>
        <input className="input" placeholder="Name" value={nameValue} onChange={e=>onNameChange(e.target.value)} />
        <input className="input" placeholder="Price" value={priceValue} onChange={e=>onPriceChange(e.target.value)} />
        <button className="btn" onClick={onAdd}>{addLabel}</button>
      </div>
      <List rows={rows} cols={['item_id','name','price']} />
    </div>
  );
}

function SimpleTable({ title, path, columns }){
  const [rows,setRows]=useState([]);
  useEffect(()=>{
    api(path).then(j=>setRows(j.data||[])).catch(()=>setRows([]));
  },[path]);
  return (
    <Panel>
      <h3 style={{marginTop:0}}>{title}</h3>
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead><tr>{columns.map(c=> <th key={c} style={{textAlign:'left', padding:'6px', borderBottom:'1px solid #eee'}}>{c}</th>)}</tr></thead>
          <tbody>{rows.map((r,i)=> <tr key={i}>{columns.map(c=> <td key={c} style={{padding:'6px', borderBottom:'1px solid #f3f3f3'}}>{String(r[c] ?? '')}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </Panel>
  );
}


function List({ rows, cols }){
  return (
    <div className="grid" style={{gridTemplateColumns:'1fr', gap:8}}>
      {rows.map((r)=>(
        <div key={cols.map(c=>r[c]).join('-')} className="card" style={{display:'flex', justifyContent:'space-between'}}>
          <div>{r[cols[1]]}</div>
          <div className="muted">${Number(r[cols[2]] ?? 0).toFixed(2)}</div>
        </div>
      ))}
    </div>
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
      setAdminsError(err?.message || 'Unable to load admins.');
      setAdmins([]);
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
      setManagersError(err?.message || 'Unable to load managers.');
      setManagers([]);
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
      setEmployeesError(err?.message || 'Unable to load employees.');
      setEmployees([]);
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
  if (loading) return <div className="text-sm text-gray-700">Loading…</div>;
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
              <div className="muted">{formatRole(row.role)}{created ? ` • ${created}` : ''}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}









