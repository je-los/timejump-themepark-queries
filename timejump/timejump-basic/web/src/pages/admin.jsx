import React, { useEffect, useState } from 'react';
import { api, me, clearToken } from '../auth';

export default function Admin(){
  const [profile,setProfile]=useState(null);
  const [tab,setTab]=useState('catalog');

  useEffect(()=>{ me().then(setProfile); },[]);
  if(!profile) return <Wrap><Panel>Please login.</Panel></Wrap>;
  if(!['admin','owner'].includes(profile.role)) return <Wrap><Panel>Admin/Owner only.</Panel></Wrap>;

  return (
    <Wrap>
      <div className="panel" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div><div style={{fontWeight:700}}>Admin</div><div className="muted">{profile.email} • {profile.role}</div></div>
        <button className="btn" onClick={()=>{ clearToken(); location.reload(); }}>Sign out</button>
      </div>

      <div style={{display:'flex', gap:8}}>
        {['catalog','employees','maintenance','incidents'].map(k=>(
          <button key={k} className={`btn ${tab===k?'primary':''}`} onClick={()=>setTab(k)}>{k}</button>
        ))}
      </div>

      {tab==='catalog' && <CatalogTab/>}
      {tab==='employees' && <SimpleTable title="Employees" path="/employees" columns={['employeeID','name','role','start_date','end_date','email']} />}
      {tab==='maintenance' && <SimpleTable title="Maintenance" path="/maintenance" columns={['RecordID','AttractionID','EmployeeID','Date_broken_down','Date_fixed','type_of_maintenance','Severity_of_report']} />}
      {tab==='incidents' && <SimpleTable title="Incidents" path="/incidents" columns={['IncidentID','IncidentType','EmployeeID','TicketID','Details']} />}
    </Wrap>
  );
}

function Wrap({ children }){ return <div className="container" style={{display:'grid', gap:12}}>{children}</div>; }
function Panel({ children }){ return <div className="panel">{children}</div>; }

function CatalogTab(){
  const [gift,setGift]=useState([]); const [food,setFood]=useState([]);
  const [gName,setGName]=useState(''); const [gPrice,setGPrice]=useState('');
  const [fName,setFName]=useState(''); const [fPrice,setFPrice]=useState('');

  async function load(){ const g=await api('/gift-items'); setGift(g.data||[]); const f=await api('/food-items'); setFood(f.data||[]); }
  useEffect(()=>{ load(); },[]);

  async function addGift(){ await api('/gift-items',{ method:'POST', body: JSON.stringify({ name:gName, price:Number(gPrice) }) }); setGName(''); setGPrice(''); load(); }
  async function addFood(){ await api('/food-items',{ method:'POST', body: JSON.stringify({ name:fName, price:Number(fPrice) }) }); setFName(''); setFPrice(''); load(); }

  return (
    <Panel>
      <h3 style={{marginTop:0}}>Catalog</h3>
      <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:16}}>
        <div>
          <div style={{fontWeight:600, marginBottom:8}}>Gift Items</div>
          <div style={{display:'flex', gap:8, marginBottom:8}}>
            <input className="input" placeholder="Name" value={gName} onChange={e=>setGName(e.target.value)} />
            <input className="input" placeholder="Price" value={gPrice} onChange={e=>setGPrice(e.target.value)} />
            <button className="btn" onClick={addGift}>Add</button>
          </div>
          <List rows={gift} cols={['item_id','name','price']} />
        </div>
        <div>
          <div style={{fontWeight:600, marginBottom:8}}>Food Items</div>
          <div style={{display:'flex', gap:8, marginBottom:8}}>
            <input className="input" placeholder="Name" value={fName} onChange={e=>setFName(e.target.value)} />
            <input className="input" placeholder="Price" value={fPrice} onChange={e=>setFPrice(e.target.value)} />
            <button className="btn" onClick={addFood}>Add</button>
          </div>
          <List rows={food} cols={['item_id','name','price']} />
        </div>
      </div>
    </Panel>
  );
}

function SimpleTable({ title, path, columns }){
  const [rows,setRows]=useState([]);
  useEffect(()=>{ api(path).then(j=>setRows(j.data||[])).catch(()=>setRows([])); },[path]);
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
          <div className="muted">${Number(r[cols[2]]).toFixed(2)}</div>
        </div>
      ))}
    </div>
  );
}
