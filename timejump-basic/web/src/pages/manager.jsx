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
    startTime: '09:00',
    endTime: '17:00',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveTone, setSaveTone] = useState('info');
  const [missingFields, setMissingFields] = useState({ employee: false, attraction: false, shiftDate: false, startTime: false, endTime: false });

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
        setSchedules(Array.isArray(schedRes?.data) ? schedRes.data : (schedRes?.schedules || []));
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
    const missing = {
      employee: !form.employeeId,
      attraction: !form.attractionId,
      shiftDate: !form.shiftDate,
      startTime: !form.startTime,
      endTime: !form.endTime,
    };
    if (missing.employee || missing.attraction || missing.shiftDate || missing.startTime || missing.endTime) {
      setMissingFields(missing);
      setSaveTone('error');
      const names = [];
      const map = { employee: 'Employee', attraction: 'Attraction', shiftDate: 'Shift Date', startTime: 'Start Time', endTime: 'End Time' };
      Object.keys(missing).forEach(k => { if (missing[k]) names.push(map[k]); });
      setSaveMessage(`Please provide: ${names.join(', ')}`);
      return;
    }

    // Validate that shift date is not in the past
    const shiftDate = new Date(form.shiftDate);
    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    // Parse the input date (YYYY-MM-DD) as a local date to avoid timezone shifts
    const [yStr, mStr, dStr] = String(form.shiftDate || '').split('-');
    const y = Number(yStr || 0);
    const m = Number(mStr || 1) - 1;
    const d = Number(dStr || 1);
    const shiftDateStart = new Date(y, m, d);
    shiftDateStart.setHours(0, 0, 0, 0);

    if (shiftDateStart < todayStart) {
      setSaveTone('error');
      setSaveMessage('Unable to assign shift on a previous date');
      setMissingFields({ employee: false, attraction: false, shiftDate: true, startTime: false, endTime: false });
      return;
    }

    // Build start/end Date objects on the selected shift date (local time)
    const startParts = String(form.startTime || '').split(':');
    const startHour = Number(startParts[0] || 0);
    const startMin = Number(startParts[1] || 0);
    const endParts = String(form.endTime || '').split(':');
    const endHour = Number(endParts[0] || 0);
    const endMin = Number(endParts[1] || 0);
    const startTimeDate = new Date(y, m, d, startHour, startMin, 0, 0);
    const endTimeDate = new Date(y, m, d, endHour, endMin, 0, 0);

    // Ensure end is after start for any date
    if (endTimeDate <= startTimeDate) {
      setSaveTone('error');
      setSaveMessage('\"End Time\" cannot be before the \"Start Time\"');
      setMissingFields({ employee: false, attraction: false, shiftDate: false, startTime: false, endTime: true });
      return;
    }

    // If shift is today, validate that the start/end times are not in the past
    if (shiftDateStart.getTime() === todayStart.getTime()) {
      const now = new Date();
      if (startTimeDate < now) {
        setSaveTone('error');
        setSaveMessage('Unable to assign shift \"Start Time\" at selected time.');
        setMissingFields({ employee: false, attraction: false, shiftDate: false, startTime: true, endTime: false });
        return;
      }
      if (endTimeDate < now) {
        setSaveTone('error');
        setSaveMessage('Unable to assign shift \"End Time\" at selected time.');
        setMissingFields({ employee: false, attraction: false, shiftDate: false, startTime: false, endTime: true });
        return;
      }
    }

   // Check for any overlapping shifts for the same employee and block if found
    const overlappingShift = schedules.find(s => {
      const sDateStr = s.shiftDate ?? s.date ?? '';
      if (s.employeeId !== form.employeeId && String(s.EmployeeID ?? '') !== String(form.employeeId)) return false;
      if (sDateStr !== form.shiftDate) return false;
      const sStartParts = String(s.startTime ?? s.StartTime ?? '').split(':');
      const sStartHour = Number(sStartParts[0] || 0);
      const sStartMin = Number(sStartParts[1] || 0);
      const sEndParts = String(s.endTime ?? s.EndTime ?? '').split(':');
      const sEndHour = Number(sEndParts[0] || 0);
      const sEndMin = Number(sEndParts[1] || 0);
      const sStartDate = new Date(y, m, d, sStartHour, sStartMin, 0, 0);
      const sEndDate = new Date(y, m, d, sEndHour, sEndMin, 0, 0);
      return (startTimeDate < sEndDate) && (endTimeDate > sStartDate);
    });
    if (overlappingShift) {
      setSaveTone('error');
      setSaveMessage('Employee has an overlapping shift at the selected time.');
      setMissingFields({ employee: true, attraction: false, shiftDate: false, startTime: false, endTime: false });
      return;
    }

  setSaving(true); setSaveMessage(''); setSaveTone('info'); setMissingFields({ employee: false, attraction: false, shiftDate: false, startTime: false, endTime: false });
    try {
      await api('/schedules', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: form.employeeId,
          attractionId: form.attractionId,
          shiftDate: form.shiftDate,
          startTime: form.startTime,
          endTime: form.endTime,
          notes: form.notes,
        }),
      });
  setSaveTone('success');
  setSaveMessage('Shift assigned.');
  setForm(prev => ({ ...prev, shiftDate: '', notes: '' }));
  setMissingFields({ employee: false, attraction: false, shiftDate: false, startTime: false, endTime: false });
      const schedRes = await api('/schedules').catch(err => {
        if (err?.status === 403) return { data: [] };
        throw err;
      });
      setSchedules(Array.isArray(schedRes?.data) ? schedRes.data : (schedRes?.schedules || []));
    } catch (err) {
      setSaveTone('error');
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
        <div className="manager-panel">
          <h3>Assign a Shift</h3>
          <p className="manager-panel__intro">
            Choose an employee, pick their attraction, and capture shift details in one streamlined form.
          </p>
          <form onSubmit={submit} className="manager-form">
            <div className="field">
              <span>Employee{missingFields.employee && <span className="missing-asterisk">*</span>}</span>
              <select className="border rounded-xl p-2" value={form.employeeId} onChange={e=>{ setForm(f=>({ ...f, employeeId: e.target.value })); setMissingFields(m=>({ ...m, employee: false })); }}>
                <option value="">Select employee...</option>
                {employeeOptions.map(opt=> <option key={opt.id} value={opt.id}>{opt.name}</option>)}
              </select>
            </div>
            <div className="field">
              <span>Attraction{missingFields.attraction && <span className="missing-asterisk">*</span>}</span>
              <select className="border rounded-xl p-2" value={form.attractionId} onChange={e=>{ setForm(f=>({ ...f, attractionId: e.target.value })); setMissingFields(m=>({ ...m, attraction: false })); }}>
                <option value="">Select attraction...</option>
                {attractionOptions.map(opt=> <option key={opt.id} value={opt.id}>{opt.name}</option>)}
              </select>
            </div>
            <div className="manager-form__row">
              <label className="field" style={{flex:1, minWidth:140}}>
                <span>Shift Date{missingFields.shiftDate && <span className="missing-asterisk">*</span>}</span>
                <input className="input" type="date" value={form.shiftDate} onChange={e=>{ setForm(f=>({ ...f, shiftDate: e.target.value })); setMissingFields(m=>({ ...m, shiftDate: false })); }} />
              </label>
              <label className="field" style={{flex:1, minWidth:140}}>
                <span>Start Time{missingFields.startTime && <span className="missing-asterisk">*</span>}</span>
                  <input className="input" type="time" value={form.startTime} onChange={e=>{ setForm(f=>({ ...f, startTime: e.target.value })); setMissingFields(m=>({ ...m, startTime: false })); }} />
              </label>
              <label className="field" style={{flex:1, minWidth:140}}>
                  <span>End Time{missingFields.endTime && <span className="missing-asterisk">*</span>}</span>
                  <input className="input" type="time" value={form.endTime} onChange={e=>{ setForm(f=>({ ...f, endTime: e.target.value })); setMissingFields(m=>({ ...m, endTime: false })); }} />
              </label>
            </div>
            <label className="field">
              <span>Notes (optional)</span>
              <textarea className="input" rows={3} value={form.notes} onChange={e=>setForm(f=>({ ...f, notes: e.target.value }))} placeholder="Coverage notes, rotation info, etc." />
            </label>
            <div className="manager-form__actions">
              <button className="btn primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Assign Shift'}</button>
              {saveMessage && (
                saveTone === 'error' ? (
                  <div className="alert error" style={{ marginLeft: 6 }}>{saveMessage}</div>
                ) : saveTone === 'success' ? (
                  <div className="alert success" style={{ marginLeft: 6 }}>{saveMessage}</div>
                ) : (
                  <div className="text-sm text-gray-700" style={{ marginLeft: 6 }}>{saveMessage}</div>
                )
              )}
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
                    {s.notes && (
                      <div className="manager-shift-card__notes">
                        <label>Notes</label>
                        <p>{s.notes}</p>
                      </div>
                    )}
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
