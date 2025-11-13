import React, { useEffect, useMemo, useState } from 'react';
import RequireRole from '../components/requirerole.jsx';
import { api } from '../auth';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return '--';
  const raw = String(value);
  const datePart = raw.includes('T') ? raw.split('T')[0] : raw;
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const date = new Date(`${datePart}T00:00:00`);
    if (!Number.isNaN(date.getTime())) return date.toLocaleDateString();
  }
  const fallback = new Date(raw);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback.toLocaleDateString();
  }
  return raw;
}

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
  const [cancellations, setCancellations] = useState([]);

  const [form, setForm] = useState({
    employeeId: '',
    attractionId: '',
    shiftDate: '',
    startTime: '10:00',
    endTime: '17:00',
  });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [cancelForm, setCancelForm] = useState({
    attractionId: '',
    cancelDate: todayISO(),
    reason: '',
  });
  const [cancelSaving, setCancelSaving] = useState(false);
  const [cancelMessage, setCancelMessage] = useState('');
  const [cancelError, setCancelError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError('');
      try {
        const [empRes, attrRes, schedRes, cancelRes] = await Promise.all([
          api('/employees').catch(err => { if (err?.status === 403) return { data: [] }; throw err; }),
          api('/attractions').catch(err => { if (err?.status === 403) return { data: [] }; throw err; }),
          api('/schedules').catch(err => { if (err?.status === 403) return { data: [] }; throw err; }),
          api('/ride-cancellations?limit=25').catch(err => { if (err?.status === 403) return { data: [] }; throw err; }),
        ]);
        if (!active) return;
        const employeeRows = Array.isArray(empRes?.data) ? empRes.data : (empRes?.employees || []);
        setEmployees(employeeRows.filter(row => (row.role_name ?? row.role ?? '').toLowerCase() === 'employee'));
        setAttractions(Array.isArray(attrRes?.data) ? attrRes.data : (attrRes?.attractions || []));
        const scheduleRows = Array.isArray(schedRes?.data) ? schedRes.data : (schedRes?.schedules || []);
        setSchedules(scheduleRows.filter(entry => !(entry.is_completed ?? entry.isCompleted ?? false)));
        setCancellations(Array.isArray(cancelRes?.data) ? cancelRes.data : []);
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

  async function logCancellation(e) {
    e.preventDefault();
    if (cancelSaving) return;
    if (!cancelForm.attractionId || !cancelForm.reason.trim()) {
      setCancelError('Select an attraction and provide a reason.');
      return;
    }
    setCancelSaving(true);
    setCancelError('');
    setCancelMessage('');
    try {
      await api('/ride-cancellations', {
        method: 'POST',
        body: JSON.stringify({
          attractionId: Number(cancelForm.attractionId),
          cancelDate: cancelForm.cancelDate || todayISO(),
          reason: cancelForm.reason.trim(),
        }),
      });
      setCancelMessage('Ride cancellation recorded.');
      setCancelForm({
        attractionId: '',
        cancelDate: todayISO(),
        reason: '',
      });
      const res = await api('/ride-cancellations?limit=25').catch(err => {
        if (err?.status === 403) return { data: [] };
        throw err;
      });
      setCancellations(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setCancelError(err?.message || 'Unable to log cancellation.');
    } finally {
      setCancelSaving(false);
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

        <div className="manager-panel manager-panel--wide" id="ride-cancellations">
          <div className="manager-panel__header">
            <div>
              <h3>Ride Cancellations</h3>
              <p>Log weather or operational closures to keep teams informed.</p>
            </div>
          </div>
          <form className="manager-form" onSubmit={logCancellation} style={{ marginBottom: 16 }}>
            <div className="field">
              <span>Attraction</span>
              <select
                className="border rounded-xl p-2"
                value={cancelForm.attractionId}
                onChange={e => setCancelForm(f => ({ ...f, attractionId: e.target.value }))}
              >
                <option value="">Select attraction...</option>
                {attractionOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.name}</option>
                ))}
              </select>
            </div>
            <div className="manager-form__row">
              <label className="field" style={{ flex: 1, minWidth: 160 }}>
                <span>Date</span>
                <input
                  className="input"
                  type="date"
                  value={cancelForm.cancelDate}
                  onChange={e => setCancelForm(f => ({ ...f, cancelDate: e.target.value }))}
                />
              </label>
              <label className="field" style={{ flex: 2 }}>
                <span>Reason</span>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. Thunderstorm, lightning advisory..."
                  value={cancelForm.reason}
                  onChange={e => setCancelForm(f => ({ ...f, reason: e.target.value }))}
                />
              </label>
            </div>
            <div className="manager-form__actions">
              <button className="btn primary" type="submit" disabled={cancelSaving}>
                {cancelSaving ? 'Saving...' : 'Log Cancellation'}
              </button>
              {cancelMessage && <div className="text-sm text-green-700">{cancelMessage}</div>}
              {cancelError && <div className="text-sm text-red-700">{cancelError}</div>}
            </div>
          </form>
          <div className="manager-cancel-list">
            {!cancellations.length && (
              <div className="text-sm text-gray-700">No cancellations logged yet.</div>
            )}
            {!!cancellations.length && (
              <table className="manager-table">
                <thead>
                  <tr>
                    <th>Attraction</th>
                    <th>Date</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {cancellations.map(row => (
                    <tr key={row.cancel_id}>
                      <td>{row.attraction_name || `#${row.attraction_id}`}</td>
                      <td>{formatDate(row.cancel_date)}</td>
                      <td>{row.reason || '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </div>
  );
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
