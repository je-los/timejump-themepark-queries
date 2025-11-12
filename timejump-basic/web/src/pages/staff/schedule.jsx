import React, { useEffect, useMemo, useState } from 'react';
import RequireRole from '../../components/requirerole.jsx';
import { api } from '../../auth.js';
import { useAuth } from '../../context/authcontext.jsx';

function ScheduleView() {
  const { user } = useAuth();
  const isEmployee = user?.role === 'employee';
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await api('/schedules');
        if (!active) return;
        setShifts(Array.isArray(res?.data) ? res.data : (res?.schedules || []));
      } catch (err) {
        if (!active) return;
        setError(err?.message || 'Unable to load schedule.');
        setShifts([]);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const upcoming = useMemo(() => {
    return shifts
      .map(shift => ({
        id: shift.ScheduleID ?? shift.id,
        date: shift.Shift_date ?? shift.shiftDate ?? '',
        start: shift.Start_time ?? shift.startTime ?? '',
        end: shift.End_time ?? shift.endTime ?? '',
        attraction: shift.attraction_name ?? shift.attractionName ?? '',
        attractionId: shift.AttractionID ?? shift.attractionId ?? shift.attractionID ?? null,
        notes: shift.notes || '',
      }))
      .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.start || '').localeCompare(b.start || ''));
  }, [shifts]);

  return (
    <div className="page">
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>My Schedule</h2>
        <p className="muted">Review your upcoming shifts and notes from your manager.</p>
        {loading && <div className="text-sm text-gray-600">Loading schedule...</div>}
        {!loading && error && <div className="alert error">{error}</div>}
        {!loading && !error && upcoming.length === 0 && (
          <div className="text-sm text-gray-600">No shifts have been assigned yet.</div>
        )}
        {!loading && !error && upcoming.length > 0 && (
          <div className="table-wrapper" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Start</th>
                  <th style={thStyle}>End</th>
                  <th style={thStyle}>Attraction</th>
                  <th style={thStyle}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map(shift => (
                  <tr key={shift.id || `${shift.date}-${shift.start}`}>
                    <td style={tdStyle}>{shift.date || '--'}</td>
                    <td style={tdStyle}>{shift.start || '--'}</td>
                    <td style={tdStyle}>{shift.end || '--'}</td>
                    <td style={tdStyle}>{shift.attraction || 'Unassigned'}</td>
                    <td style={tdStyle}>{shift.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <RideLogForm shifts={upcoming} disabled={!upcoming.length} isEmployee={isEmployee} />
    </div>
  );
}

function RideLogForm({ shifts, disabled, isEmployee }) {
  const shiftOptions = useMemo(() => {
    return (shifts || [])
      .filter(shift => shift.attractionId && shift.date)
      .map(shift => ({
        id: shift.id || `${shift.attractionId}-${shift.date}-${shift.start}`,
        label: `${shift.date} • ${shift.attraction || 'Attraction'}`,
        date: shift.date,
        attractionId: shift.attractionId,
      }));
  }, [shifts]);

  const [selectedShift, setSelectedShift] = useState(() => shiftOptions[0]?.id || '');
  const current = shiftOptions.find(opt => opt.id === selectedShift) || shiftOptions[0] || null;
  const [logDate, setLogDate] = useState(current?.date || '');
  const [count, setCount] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [recentLogs, setRecentLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setSelectedShift(shiftOptions[0]?.id || '');
  }, [shiftOptions]);

  useEffect(() => {
    setLogDate(current?.date || '');
  }, [current]);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!current?.attractionId) {
        setRecentLogs([]);
        setLogsLoading(false);
        setLogsError('');
        return;
      }
      setLogsLoading(true);
      setLogsError('');
      try {
        const params = new URLSearchParams();
        params.set('limit', '8');
        params.set('attractionId', String(current.attractionId));
        const res = await api(`/ride-log?${params.toString()}`);
        if (!active) return;
        setRecentLogs(Array.isArray(res?.data) ? res.data : []);
      } catch (err) {
        if (!active) return;
        setRecentLogs([]);
        setLogsError(err?.message || 'Unable to load recent logs.');
      } finally {
        if (active) setLogsLoading(false);
      }
    }
    setLogsLoading(true);
    load();
    return () => { active = false; };
  }, [current?.attractionId, reloadKey]);

  if (disabled || shiftOptions.length === 0) {
    return (
      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Log Riders</h3>
        <p className="muted">Assigned shifts will show up here so you can record rider counts.</p>
      </div>
    );
  }

  async function submit(e) {
    e.preventDefault();
    if (!current) {
      setStatus('Select a shift to log riders.');
      return;
    }
    const ridersCount = Number(count);
    if (!Number.isFinite(ridersCount) || ridersCount < 0) {
      setStatus('Enter a non-negative rider count.');
      return;
    }
    setBusy(true);
    setStatus('');
    try {
      await api('/ride-log', {
        method: 'POST',
        body: JSON.stringify({
          attractionId: current.attractionId,
          logDate: logDate || current.date,
          ridersCount,
        }),
      });
      setStatus('Rider count saved.');
      setCount('');
      setReloadKey(key => key + 1);
    } catch (err) {
      setStatus(err?.message || 'Unable to log riders.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <h3 style={{ marginTop: 0 }}>Log Riders</h3>
      <p className="muted">Record how many guests rode your assigned attraction for the selected shift.</p>
      <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
        <label className="field">
          <span>Shift</span>
          <select
            className="select"
            value={selectedShift}
            onChange={e => setSelectedShift(e.target.value)}
          >
            {shiftOptions.map(opt => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Date</span>
          <input
            className="input"
            type="date"
            value={logDate}
            onChange={e => setLogDate(e.target.value)}
            disabled={isEmployee}
          />
        </label>
        <label className="field">
          <span>Riders</span>
          <input
            className="input"
            type="number"
            min="0"
            step="1"
            value={count}
            onChange={e => setCount(e.target.value)}
            placeholder="e.g. 850"
          />
        </label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? 'Saving...' : 'Save Rider Count'}
          </button>
          {status && <span className="text-sm text-gray-700">{status}</span>}
        </div>
      </form>
      <div style={{ marginTop: 16 }}>
        <h4 style={{ marginBottom: 8 }}>Recent entries</h4>
        {logsLoading && <div className="text-sm text-gray-600">Loading history...</div>}
        {!logsLoading && logsError && <div className="alert error">{logsError}</div>}
        {!logsLoading && !logsError && recentLogs.length === 0 && (
          <div className="text-sm text-gray-600">No rider logs yet for this attraction.</div>
        )}
        {!logsLoading && !logsError && recentLogs.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
            {recentLogs.map(entry => {
              const riders = Number(entry.riders_count ?? entry.ridersCount ?? 0);
              return (
                <li key={`${entry.AttractionID}-${entry.log_date}`}>
                  <div className="text-sm font-medium">
                    {entry.log_date} — {riders.toLocaleString()} riders
                  </div>
                  <div className="text-xs text-gray-500">{entry.attraction_name}</div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

const thStyle = {
  textAlign: 'left',
  padding: '8px',
  borderBottom: '1px solid #e2e8f0',
  fontSize: '0.85rem',
  textTransform: 'uppercase',
  letterSpacing: '.08em',
};

const tdStyle = {
  padding: '8px',
  borderBottom: '1px solid #f1f5f9',
  fontSize: '0.95rem',
};

export default function StaffSchedulePage() {
  return (
    <RequireRole
      roles={['employee', 'manager', 'admin', 'owner']}
      fallback={
        <div className="page">
          <div className="panel">Only staff members can view schedules.</div>
        </div>
      }
    >
      <ScheduleView />
    </RequireRole>
  );
}
