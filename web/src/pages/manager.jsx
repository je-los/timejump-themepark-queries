import React, { useEffect, useMemo, useState } from 'react';
import RequireRole from '../components/requirerole.jsx';
import { api } from '../auth';

export default function Manager(){
  return (
    <RequireRole roles={['manager','admin','owner']} fallback={<div className="container"><div className="panel">Managers/Admins/Owners only.</div></div>}>
      <Planner />
    </RequireRole>
  );
}

function Planner(){
  const [employees,setEmployees] = useState([]);
  const [attractions,setAttractions] = useState([]);
  const [schedules,setSchedules] = useState([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [filter,setFilter] = useState({ attraction:'', date:'' });

  const [form,setForm] = useState({
    employeeId:'',
    attractionId:'',
    shiftDate:'',
    startTime:'09:00',
    endTime:'17:00',
    notes:''
  });
  const [saving,setSaving] = useState(false);
  const [saveMessage,setSaveMessage] = useState('');

  useEffect(()=>{
    let active = true;
    async function load(){
      setLoading(true); setError('');
      try{
        const [empRes, attrRes, schedRes] = await Promise.all([
          api('/employees').catch(err=>{ if(err?.status===403) return { data: [] }; throw err; }),
          api('/attractions').catch(err=>{ if(err?.status===403) return { data: [] }; throw err; }),
          api('/schedules').catch(err=>{ if(err?.status===403) return { data: [] }; throw err; }),
        ]);
        if(!active) return;
        setEmployees(Array.isArray(empRes?.data) ? empRes.data : (empRes?.employees || []));
        setAttractions(Array.isArray(attrRes?.data) ? attrRes.data : (attrRes?.attractions || []));
        setSchedules(Array.isArray(schedRes?.data) ? schedRes.data : (schedRes?.schedules || []));
      }catch(err){
        if(!active) return;
        setError(err?.message || 'Failed to load scheduling data.');
      }finally{
        if(active) setLoading(false);
      }
    }
    load();
    return ()=>{ active = false; };
  },[]);

  const attractionOptions = useMemo(()=>{
    return attractions.map(a=>({
      id: a?.AttractionID ?? a?.id ?? a?.attraction_id,
      name: a?.Name ?? a?.name ?? 'Attraction'
    })).filter(opt=>opt.id);
  },[attractions]);

  const employeeOptions = useMemo(()=>{
    return employees.map(e=>{
      const fullName = `${e?.first_name ?? ''} ${e?.last_name ?? ''}`.trim();
      const fallbackName = fullName || e?.email || 'Employee';
      return {
        id: e?.employeeID ?? e?.id ?? e?.EmployeeID,
        name: e?.name ?? fallbackName
      };
    }).filter(opt=>opt.id);
  },[employees]);

  const filteredSchedules = useMemo(()=>{
    return schedules.filter(s=>{
      const attractionMatch = filter.attraction ? String(s.attractionId ?? s.AttractionID ?? '') === filter.attraction : true;
      const dateMatch = filter.date ? (s.shiftDate ?? s.date ?? '').startsWith(filter.date) : true;
      return attractionMatch && dateMatch;
    });
  },[schedules, filter]);

  async function submit(e){
    e.preventDefault();
    if(saving) return;
    if(!form.employeeId || !form.attractionId || !form.shiftDate){
      setSaveMessage('Please choose an employee, attraction, and date.');
      return;
    }
    setSaving(true); setSaveMessage('');
    try{
      await api('/schedules', {
        method:'POST',
        body: JSON.stringify({
          employeeId: form.employeeId,
          attractionId: form.attractionId,
          shiftDate: form.shiftDate,
          startTime: form.startTime,
          endTime: form.endTime,
          notes: form.notes
        })
      });
      setSaveMessage('Shift assigned.');
      setForm(prev=>({ ...prev, shiftDate:'', notes:'' }));
      // Refresh schedules
      const schedRes = await api('/schedules').catch(err=>{
        if(err?.status===403) return { data: [] };
        throw err;
      });
      setSchedules(Array.isArray(schedRes?.data) ? schedRes.data : (schedRes?.schedules || []));
    }catch(err){
      setSaveMessage(err?.message || 'Unable to save schedule.');
    }finally{
      setSaving(false);
    }
  }

  return (
    <div className="container" style={{display:'grid', gap:12}}>
      <div className="panel" style={{display:'grid', gap:8}}>
        <div style={{fontWeight:700, fontSize:'1.1rem'}}>Scheduling Desk</div>
        <div className="text-sm text-gray-700">Assign employees to attractions, set shift times, and keep the park staffed for every time slot.</div>
      </div>

      <div className="panel" style={{display:'grid', gap:12}}>
        <h3 style={{marginTop:0}}>Create Shift</h3>
        <form onSubmit={submit} style={{display:'grid', gap:12}}>
          <div className="field">
            <span>Employee</span>
            <select className="border rounded-xl p-2" value={form.employeeId} onChange={e=>setForm(f=>({ ...f, employeeId: e.target.value }))}>
              <option value="">Select employee...</option>
              {employeeOptions.map(opt=> <option key={opt.id} value={opt.id}>{opt.name}</option>)}
            </select>
          </div>
          <div className="field">
            <span>Attraction</span>
            <select className="border rounded-xl p-2" value={form.attractionId} onChange={e=>setForm(f=>({ ...f, attractionId: e.target.value }))}>
              <option value="">Select attraction...</option>
              {attractionOptions.map(opt=> <option key={opt.id} value={opt.id}>{opt.name}</option>)}
            </select>
          </div>
          <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
            <label className="field" style={{flex:1, minWidth:140}}>
              <span>Shift Date</span>
              <input className="input" type="date" value={form.shiftDate} onChange={e=>setForm(f=>({ ...f, shiftDate: e.target.value }))} />
            </label>
            <label className="field" style={{flex:1, minWidth:140}}>
              <span>Start Time</span>
              <input className="input" type="time" value={form.startTime} onChange={e=>setForm(f=>({ ...f, startTime: e.target.value }))} />
            </label>
            <label className="field" style={{flex:1, minWidth:140}}>
              <span>End Time</span>
              <input className="input" type="time" value={form.endTime} onChange={e=>setForm(f=>({ ...f, endTime: e.target.value }))} />
            </label>
          </div>
          <label className="field">
            <span>Notes (optional)</span>
            <textarea className="input" rows={3} value={form.notes} onChange={e=>setForm(f=>({ ...f, notes: e.target.value }))} placeholder="Coverage notes, rotation info, etc." />
          </label>
          <div style={{display:'flex', gap:12, alignItems:'center'}}>
            <button className="btn primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Assign Shift'}</button>
            {saveMessage && <div className="text-sm text-gray-700">{saveMessage}</div>}
          </div>
        </form>
      </div>

      <div className="panel" style={{display:'grid', gap:12}}>
        <div style={{display:'flex', gap:12, flexWrap:'wrap', alignItems:'center', justifyContent:'space-between'}}>
          <h3 style={{margin:0}}>Upcoming Shifts</h3>
          <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
            <select className="border rounded-xl p-2" value={filter.attraction} onChange={e=>setFilter(f=>({ ...f, attraction: e.target.value }))}>
              <option value="">All attractions</option>
              {attractionOptions.map(opt=> <option key={opt.id} value={String(opt.id)}>{opt.name}</option>)}
            </select>
            <input className="input" type="date" value={filter.date} onChange={e=>setFilter(f=>({ ...f, date: e.target.value }))} />
          </div>
        </div>

        {loading && <div className="text-sm text-gray-700">Loading schedules...</div>}
        {!loading && error && <div className="alert error">{error}</div>}
        {!loading && !error && filteredSchedules.length === 0 && <div className="text-sm text-gray-700">No scheduled shifts yet.</div>}
        {!loading && !error && filteredSchedules.length > 0 && (
          <div className="schedule-grid">
            {filteredSchedules.map((s,idx)=>{
              const emp = employeeOptions.find(e=>String(e.id) === String(s.employeeId ?? s.EmployeeID));
              const attr = attractionOptions.find(a=>String(a.id) === String(s.attractionId ?? s.AttractionID));
              const start = s.startTime ?? s.StartTime ?? formTime(s.start_time);
              const end = s.endTime ?? s.EndTime ?? formTime(s.end_time);
              return (
                <div key={s.scheduleId ?? s.ScheduleID ?? idx} className="schedule-card">
                  <div className="schedule-card__title">{attr?.name || 'Attraction TBD'}</div>
                  <div className="schedule-card__subtitle">{emp?.name || 'Unassigned'} • {formatDate(s.shiftDate ?? s.date)}</div>
                  <div className="schedule-card__meta">
                    <div>
                      <span>Shift</span>
                      <strong>{formatTime(start)} - {formatTime(end)}</strong>
                    </div>
                    {s.notes && (
                      <div>
                        <span>Notes</span>
                        <p>{s.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(value){
  if(!value) return 'Date TBD';
  const d = new Date(value);
  if(Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function formatTime(value){
  if(!value) return '—';
  if(typeof value === 'string' && value.includes(':')){
    const [h,m] = value.split(':');
    const date = new Date();
    date.setHours(Number(h), Number(m || 0));
    return date.toLocaleTimeString([], { hour:'numeric', minute:'2-digit' });
  }
  return String(value);
}

function formTime(value){
  if(!value) return '';
  if(typeof value === 'string') return value;
  return '';
}
