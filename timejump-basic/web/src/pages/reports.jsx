import React, { useEffect, useState } from 'react';
import { api } from '../auth';
import { useAuth } from '../context/authcontext.jsx';

export default function Reports(){
  const { user, loading, refresh } = useAuth();
  useEffect(()=>{
    if(!user && !loading) refresh();
  },[user, loading, refresh]);

  if(loading) return <Wrap><Panel>Loading...</Panel></Wrap>;
  if(!user) return <Wrap><Panel>Please login.</Panel></Wrap>;
  if(!['employee','manager','admin','owner'].includes(user.role)) return <Wrap><Panel>Employees/Managers/Admin/Owner only.</Panel></Wrap>;
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
      <ReportCards
        rows={rows}
        columns={['attraction','cancel_date','reason_label','notes']}
        emptyMessage="Run the report to see cancellation details."
      />
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
      <ReportCards
        rows={rows}
        columns={['Name','riders_count']}
        emptyMessage="Run the report to see rider counts."
      />
    </Panel>
  );
}

function ReportCards({ rows, columns, emptyMessage='No data found.' }){
  const data = Array.isArray(rows) ? rows : [];
  if (!data.length) return <div className="report-empty">{emptyMessage}</div>;
  return (
    <div className="report-cards">
      {data.map((row, idx)=>{
        const normalized = normalizeRow(row);
        const [primaryKey, secondaryKey] = columns;
        const primaryValue = normalized[primaryKey] ?? normalized[toLower(primaryKey)] ?? '';
        const secondaryValue = secondaryKey ? (normalized[secondaryKey] ?? normalized[toLower(secondaryKey)] ?? '') : '';
        const used = new Set();
        if (primaryKey) used.add(primaryKey);
        if (secondaryKey) used.add(secondaryKey);
        return (
          <article key={idx} className="report-card">
            <div className="report-card__title">{primaryValue || `Entry ${idx+1}`}</div>
            {secondaryValue !== '' && (
              <div className="report-card__badge">{formatLabel(secondaryKey)}: {secondaryValue}</div>
            )}
            <div className="report-card__grid">
              {columns.filter(col => !used.has(col)).map(col => {
                const value = normalized[col] ?? normalized[toLower(col)] ?? '';
                if (value === '' || value === null || value === undefined) return null;
                const label = formatLabel(col);
                const isLong = String(value).length > 60;
                return (
                  <div key={col} className="report-card__item">
                    <span className="report-card__label">{label}</span>
                    {isLong ? (
                      <p className="report-card__value report-card__value--long">{String(value)}</p>
                    ) : (
                      <span className="report-card__value">{String(value)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function normalizeRow(row){
  if (!row || typeof row !== 'object') return {};
  return row;
}

function toLower(key){
  return typeof key === 'string' ? key.toLowerCase() : key;
}

function formatLabel(key){
  if (!key) return '';
  const label = key.replace(/_/g, ' ');
  return label.replace(/\b\w/g, ch => ch.toUpperCase());
}

