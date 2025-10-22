import React, { useEffect, useState } from 'react';
import { api, me } from '../auth';

export default function Reports(){
  const [profile,setProfile]=useState(null);
  useEffect(()=>{ me().then(setProfile); },[]);
  if(!profile) return <Wrap><Panel>Please login.</Panel></Wrap>;
  if(!['employee','admin','owner'].includes(profile.role)) return <Wrap><Panel>Employees/Admin/Owner only.</Panel></Wrap>;
  return (
    <Wrap>
      <CancelReport />
      <RidersDay />
    </Wrap>
  );
}

function Wrap({ children }){ return <div className="container" style={{display:'grid', gap:12}}>{children}</div>; }
function Panel({ children, title }){
  return <div className="panel">{title && <h3 style={{marginTop:0}}>{title}</h3>}{children}</div>;
}

function CancelReport(){
  const [reasons,setReasons]=useState([]);
  const [start,setStart]=useState('2025-10-01');
  const [end,setEnd]=useState('2025-10-31');
  const [sel,setSel]=useState(['weather']);
  const [rows,setRows]=useState([]);

  useEffect(()=>{ api('/cancellation-reasons').then(j=> setReasons(j.data||[])); },[]);

  async function run(){
    const qs = new URLSearchParams({ start, end, reasons: sel.join(',') }).toString();
    const j = await api('/reports/cancellations?'+qs);
    setRows(j.data||[]);
  }

  return (
    <Panel title="Cancellations by Reason">
      <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
        <input className="input" type="date" value={start} onChange={e=>setStart(e.target.value)} />
        <input className="input" type="date" value={end} onChange={e=>setEnd(e.target.value)} />
        <select multiple className="select" value={sel} onChange={e=>setSel(Array.from(e.target.selectedOptions).map(o=>o.value))} style={{minWidth:200, height:88}}>
          {reasons.map(r=> <option key={r.reason_id} value={r.code}>{r.label}</option>)}
        </select>
        <button className="btn" onClick={run}>Run</button>
      </div>
      <div className="sep"></div>
      <Table rows={rows} cols={['cancel_date','attraction','reason_label','notes']} />
    </Panel>
  );
}

function RidersDay(){
  const [date,setDate]=useState('2025-10-22');
  const [rows,setRows]=useState([]);
  async function run(){
    const j = await api('/reports/riders-per-day?date='+encodeURIComponent(date));
    setRows(j.data||[]);
  }
  return (
    <Panel title="Riders Per Day">
      <div style={{display:'flex', gap:8}}>
        <input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)} />
        <button className="btn" onClick={run}>Run</button>
      </div>
      <div className="sep"></div>
      <Table rows={rows} cols={['Name','riders_count']} />
    </Panel>
  );
}

function Table({ rows, cols }){
  return (
    <div style={{overflowX:'auto'}}>
      <table style={{width:'100%', borderCollapse:'collapse'}}>
        <thead><tr>{cols.map(c=> <th key={c} style={{textAlign:'left', padding:'6px', borderBottom:'1px solid #eee'}}>{c}</th>)}</tr></thead>
        <tbody>
          {(rows||[]).map((r,i)=>(
            <tr key={i}>{cols.map(c=> <td key={c} style={{padding:'6px', borderBottom:'1px solid #f3f3f3'}}>{String(r[c] ?? r[c.toLowerCase()] ?? '')}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
