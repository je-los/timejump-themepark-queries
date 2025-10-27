import React, { useMemo, useState } from 'react';
import RequireRole from '../components/requirerole.jsx';
import Reports from './Reports';
import { api } from '../auth';

const workspaceTabs = [
  { key: 'reports', label: 'Reports' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'incidents', label: 'Incidents' },
  { key: 'analytics', label: 'Data Explorer' },
];

export default function ReportsWorkspace(){
  const [tab, setTab] = useState('reports');

  return (
    <RequireRole roles={['employee','manager','admin','owner']} fallback={<div className="container"><div className="panel">Reports are restricted to staff.</div></div>}>
      <div className="container" style={{display:'grid', gap:12}}>
        <div className="panel" style={{display:'grid', gap:8}}>
          <div style={{fontWeight:700, fontSize:'1.1rem'}}>Reports Workspace</div>
          <div className="text-sm text-gray-700">
            Audit cancellations, throughput, incidents, and maintenance activity in one place.
          </div>
          <ul className="text-sm text-gray-700" style={{margin:0, paddingLeft:'1.2rem', listStyle:'disc'}}>
            <li>Generate standardized operations reports</li>
            <li>Review maintenance and incident logs</li>
            <li>Explore custom insights with the data explorer</li>
          </ul>
        </div>

        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          {workspaceTabs.map(t => (
            <button key={t.key} className={`btn ${tab===t.key?'primary':''}`} onClick={()=>setTab(t.key)}>{t.label}</button>
          ))}
        </div>

        {tab==='reports' && <Reports />}

        {tab==='maintenance' && (
          <DataTable
            title="Maintenance Records"
            path="/maintenance"
            columns={['RecordID','AttractionID','EmployeeID','Date_broken_down','Date_fixed','type_of_maintenance','Severity_of_report']}
            emptyMessage="No maintenance records found."
          />
        )}

        {tab==='incidents' && (
          <DataTable
            title="Incident Log"
            path="/incidents"
            columns={['IncidentID','IncidentType','EmployeeID','TicketID','Details']}
            emptyMessage="No incidents logged."
          />
        )}

        {tab==='analytics' && (
          <AnalyticsTab />
        )}
      </div>
    </RequireRole>
  );
}

function DataTable({ title, path, columns, emptyMessage }){
  const [rows,setRows] = React.useState([]);
  const [loading,setLoading] = React.useState(true);
  const [error,setError] = React.useState('');

  React.useEffect(()=>{
    let active = true;
    setLoading(true); setError('');
    api(path)
      .then(j => { if(active) setRows(j.data || []); })
      .catch(err => {
        if(!active) return;
        if (err?.status === 403) {
          setRows([]);
        } else {
          setError(err?.message || 'Failed to load data.');
        }
      })
      .finally(()=>{ if(active) setLoading(false); });
    return () => { active = false; };
  },[path]);

  return (
    <div className="panel">
      <h3 style={{marginTop:0}}>{title}</h3>
      {loading && <div className="text-sm text-gray-700">Loading...</div>}
      {!loading && error && <div className="alert error">{error}</div>}
      {!loading && !error && rows.length === 0 && <div className="text-sm text-gray-700">{emptyMessage}</div>}
      {!loading && rows.length > 0 && (
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr>{columns.map(col => <th key={col} style={{textAlign:'left', padding:'6px', borderBottom:'1px solid #eee'}}>{col}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx}>
                  {columns.map(col => (
                    <td key={col} style={{padding:'6px', borderBottom:'1px solid #f3f3f3'}}>{String(row[col] ?? '')}</td>
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

function AnalyticsTab(){
  const metricOptions = useMemo(()=>[
    { key:'customers', label:'Customer volume' },
    { key:'rides', label:'Ride throughput' },
    { key:'maintenance', label:'Maintenance frequency' },
    { key:'rainouts', label:'Rainouts' },
    { key:'demand', label:'Demand spikes' },
  ],[]);
  const groupOptions = useMemo(()=>[
    { key:'monthly', label:'Group by month' },
    { key:'weekly', label:'Group by week' },
    { key:'ride', label:'Breakdown by ride' },
  ],[]);

  const [selectedMetrics,setSelectedMetrics] = React.useState(()=>metricOptions.map(m=>m.key));
  const [groupBy,setGroupBy] = React.useState(()=>['monthly']);
  const [ride,setRide] = React.useState('');
  const [start,setStart] = React.useState('');
  const [end,setEnd] = React.useState('');
  const [busy,setBusy] = React.useState(false);
  const [error,setError] = React.useState('');
  const [info,setInfo] = React.useState('');
  const [rows,setRows] = React.useState([]);

  function toggleMetric(key){
    setSelectedMetrics(prev=> prev.includes(key) ? prev.filter(k=>k!==key) : [...prev, key]);
  }

  function toggleGroup(key){
    setGroupBy(prev=> prev.includes(key) ? prev.filter(k=>k!==key) : [...prev, key]);
  }

  async function run(e){
    e.preventDefault();
    if (busy) return;
    if (selectedMetrics.length === 0){
      setError('Select at least one data series to include.');
      return;
    }
    setBusy(true); setError(''); setInfo('');
    setRows([]);
    const params = new URLSearchParams();
    params.set('metrics', selectedMetrics.join(','));
    if (groupBy.length) params.set('groupBy', groupBy.join(','));
    if (ride) params.set('ride', ride);
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    try{
      const res = await api('/reports/analytics?'+params.toString());
      const data = res.data || res.rows || [];
      setRows(Array.isArray(data) ? data : []);
      if (!data || data.length===0) setInfo('No results returned for those filters.');
    }catch(err){
      if (err?.status === 403) {
        setRows([]);
        setInfo('No data returned. If analytics access is restricted, contact an admin or owner.');
      } else {
        setError(err?.message || 'Unable to run analytics report.');
      }
    }finally{
      setBusy(false);
    }
  }

  return (
    <div className="panel" style={{display:'grid', gap:16}}>
      <div>
        <h3 style={{marginTop:0}}>Data Explorer</h3>
        <div className="text-sm text-gray-700">Combine multiple data series and choose how to break them down. Filters fan out to the analytics service and return aggregated rows.</div>
      </div>
      <form onSubmit={run} style={{display:'grid', gap:12}}>
        <div className="field">
          <span>Select Data Series</span>
          <div style={{display:'flex', flexWrap:'wrap', gap:8}}>
            {metricOptions.map(opt=> (
              <label key={opt.key} className="text-sm text-gray-700" style={{display:'flex', alignItems:'center', gap:6}}>
                <input type="checkbox" checked={selectedMetrics.includes(opt.key)} onChange={()=>toggleMetric(opt.key)} />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div className="field">
          <span>Breakdown</span>
          <div style={{display:'flex', flexWrap:'wrap', gap:8}}>
            {groupOptions.map(opt => (
              <label key={opt.key} className="text-sm text-gray-700" style={{display:'flex', alignItems:'center', gap:6}}>
                <input type="checkbox" checked={groupBy.includes(opt.key)} onChange={()=>toggleGroup(opt.key)} />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <label className="field">
          <span>Filter by Ride (optional)</span>
          <input className="input" placeholder="Thunder Run" value={ride} onChange={e=>setRide(e.target.value)} />
        </label>

        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          <label className="field" style={{flex:1, minWidth:140}}>
            <span>Start Date</span>
            <input className="input" type="date" value={start} onChange={e=>setStart(e.target.value)} />
          </label>
          <label className="field" style={{flex:1, minWidth:140}}>
            <span>End Date</span>
            <input className="input" type="date" value={end} onChange={e=>setEnd(e.target.value)} />
          </label>
        </div>

        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? 'Running...' : 'Run Report'}
        </button>
      </form>

      {error && <div className="alert error">{error}</div>}
      {!error && info && <div className="text-sm text-gray-700">{info}</div>}
      {!error && rows.length > 0 && (
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr>{Object.keys(rows[0] || {}).map(col => <th key={col} style={{textAlign:'left', padding:'6px', borderBottom:'1px solid #eee'}}>{col}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx}>
                  {Object.keys(row).map(col => (
                    <td key={col} style={{padding:'6px', borderBottom:'1px solid #f3f3f3'}}>{String(row[col] ?? '')}</td>
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

