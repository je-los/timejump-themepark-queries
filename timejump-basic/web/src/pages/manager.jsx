import React, { useEffect, useMemo, useState } from 'react';
import RequireRole from '../components/requirerole.jsx';
import { api } from '../auth';

export default function Manager() {
  return (
    <RequireRole
      roles={['manager','admin','owner']}
      fallback={<div className="container"><div className="panel">Managers/Admins/Owners only.</div></div>}
    >
      <Planner />
    </RequireRole>
  );
}

function Planner() {
  const [employees, setEmployees] = useState([]);
  const [attractions, setAttractions] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({ attraction: '', date: '' });

  const [form, setForm] = useState({
    employeeId: '',
    attractionId: '',
    shiftDate: '',
    startTime: '10:00',
    endTime: '17:00',
  });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError('');
      try {
        const [empRes, attrRes, schedRes] = await Promise.all([
          api('/employees').catch(err => { if (err?.status === 403) return { data: [] }; throw err; }),
          api('/attractions').catch(err => { if (err?.status === 403) return { data: [] }; throw err; }),
          api('/schedules').catch(err => { if (err?.status === 403) return { data: [] }; throw err; }),
        ]);
        if (!active) return;
        const employeeRows = Array.isArray(empRes?.data) ? empRes.data : (empRes?.employees || []);
        setEmployees(employeeRows.filter(row => (row.role_name ?? row.role ?? '').toLowerCase() === 'employee'));
        setAttractions(Array.isArray(attrRes?.data) ? attrRes.data : (attrRes?.attractions || []));
        const scheduleRows = Array.isArray(schedRes?.data) ? schedRes.data : (schedRes?.schedules || []);
        setSchedules(scheduleRows.filter(entry => !(entry.is_completed ?? entry.isCompleted ?? false)));
      } catch (err) {
        if (!active) return;
        setError(err?.message || 'Failed to load scheduling data.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const attractionOptions = useMemo(() => {
    return attractions.map(a => ({
      id: a?.AttractionID ?? a?.id ?? a?.attraction_id,
      name: a?.Name ?? a?.name ?? 'Attraction',
    })).filter(opt => opt.id);
  }, [attractions]);

  const employeeOptions = useMemo(() => {
    return employees.map(e => {
      const fullName = `${e?.first_name ?? ''} ${e?.last_name ?? ''}`.trim();
      const fallbackName = fullName || e?.email || 'Employee';
      return {
        id: e?.employeeID ?? e?.id ?? e?.EmployeeID,
        name: e?.name ?? fallbackName,
      };
    }).filter(opt => opt.id);
  }, [employees]);

  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
      const attractionMatch = filter.attraction ? String(s.attractionId ?? s.AttractionID ?? '') === filter.attraction : true;
      const dateMatch = filter.date ? (s.shiftDate ?? s.date ?? '').startsWith(filter.date) : true;
      return attractionMatch && dateMatch;
    });
  }, [schedules, filter]);

  async function submit(e) {
    e.preventDefault();
    if (saving) return;
    if (!form.employeeId || !form.attractionId || !form.shiftDate) {
      setSaveMessage('Please choose an employee, attraction, and date.');
      return;
    }
    setSaving(true); setSaveMessage('');
    try {
      console.log("Here in manager page");
      await api('/schedules', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: form.employeeId,
          attractionId: form.attractionId,
          shiftDate: form.shiftDate,
          startTime: form.startTime,
          endTime: form.endTime,
        }),
      });
      setSaveMessage('Shift assigned.');
      setForm(prev => ({ ...prev, shiftDate: '' }));
      const schedRes = await api('/schedules').catch(err => {
        if (err?.status === 403) return { data: [] };
        throw err;
      });
      const scheduleRows = Array.isArray(schedRes?.data) ? schedRes.data : (schedRes?.schedules || []);
      setSchedules(scheduleRows.filter(entry => !(entry.is_completed ?? entry.isCompleted ?? false)));
    } catch (err) {
      setSaveMessage(err?.message || 'Unable to save schedule.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="manager-shell">
      <section className="manager-hero">
        <div className="manager-hero__content">
          <h1>Scheduling Command Center</h1>
          <p>Assign the right people to the right attractions and keep every era fully staffed.</p>
          <div className="manager-stats">
            <div className="manager-stat">
              <div className="manager-stat__value">{employeeOptions.length}</div>
              <div className="manager-stat__label">Employees</div>
            </div>
            <div className="manager-stat">
              <div className="manager-stat__value">{attractionOptions.length}</div>
              <div className="manager-stat__label">Attractions</div>
            </div>
            <div className="manager-stat">
              <div className="manager-stat__value">{filteredSchedules.length}</div>
              <div className="manager-stat__label">Upcoming shifts</div>
            </div>
          </div>
        </div>
      </section>

      <section className="manager-grid">
        <div className="manager-panel" style={{ alignSelf: 'start' }}>
          <h3>Assign a Shift</h3>
          <p className="manager-panel__intro">
            Choose an employee, pick their attraction, and capture shift details in one streamlined form.
          </p>
          <form onSubmit={submit} className="manager-form">
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
            <div className="manager-form__row">
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
            <div className="manager-form__actions">
              <button className="btn primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Assign Shift'}</button>
              {saveMessage && <div className="text-sm text-gray-700">{saveMessage}</div>}
            </div>
          </form>
        </div>

        <div className="manager-panel manager-panel--wide">
          <div className="manager-panel__header">
            <div>
              <h3>Upcoming Shifts</h3>
              <p>Review who is covering each attraction and refine staffing by attraction or date.</p>
            </div>
            <div className="manager-filters">
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
            <div className="manager-shift-grid">
              {filteredSchedules.map((s,idx)=>{
                const emp = employeeOptions.find(e=>String(e.id) === String(s.employeeId ?? s.EmployeeID));
                const attr = attractionOptions.find(a=>String(a.id) === String(s.attractionId ?? s.AttractionID));
                const start = s.startTime ?? s.StartTime ?? formTime(s.start_time);
                const end = s.endTime ?? s.EndTime ?? formTime(s.end_time);
                return (
                  <div key={s.scheduleId ?? s.ScheduleID ?? idx} className="manager-shift-card">
                    <div className="manager-shift-card__header">
                      <h4>{attr?.name || 'Attraction TBD'}</h4>
                      <span>{formatDate(s.shiftDate ?? s.date)}</span>
                    </div>
                    <div className="manager-shift-card__body">
                      <div>
                        <label>Team Member</label>
                        <strong>{emp?.name || 'Unassigned'}</strong>
                      </div>
                      <div>
                        <label>Shift</label>
                        <strong>{formatTime(start)} – {formatTime(end)}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function formatDate(value) {
  if (!value) return 'Date TBD';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function formatTime(value) {
  if (!value) return '—';
  if (typeof value === 'string' && value.includes(':')) {
    const [h, m] = value.split(':');
    const date = new Date();
    date.setHours(Number(h), Number(m || 0));
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return String(value);
}

function formTime(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return '';
}
