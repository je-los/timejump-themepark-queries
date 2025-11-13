import React, { useCallback, useEffect, useMemo, useState } from 'react';
import RequireRole from '../../components/requirerole.jsx';
import { api } from '../../auth.js';
import { useAuth } from '../../context/authcontext.jsx';

function normalizeShiftDate(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const [datePart] = value.split('T');
    if (datePart) return datePart;
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return String(value);
}

function loadRecentLogs(key) {
  if (!key || typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecentLogs(key, logs) {
  if (!key || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(logs));
  } catch {
    // ignore persistence issues
  }
}

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

  const handleShiftLogged = useCallback((loggedShift) => {
    const completedId = loggedShift?.scheduleId ?? loggedShift?.id;
    if (!completedId) return;
    setShifts(prev => prev.filter(shift => {
      const rawId = shift?.ScheduleID ?? shift?.id;
      return rawId !== completedId;
    }));
  }, []);

  const upcoming = useMemo(() => {
    return shifts
      .map(shift => {
        const fallbackId = `${shift.AttractionID ?? shift.attractionId ?? 'attr'}-${shift.Start_time ?? shift.startTime ?? 'start'}-${shift.Shift_date ?? shift.shiftDate ?? 'date'}`;
        const scheduleId = shift.ScheduleID ?? shift.id ?? null;
        return {
          id: scheduleId ?? fallbackId,
          scheduleId,
          date: normalizeShiftDate(shift.Shift_date ?? shift.shiftDate ?? ''),
          start: shift.Start_time ?? shift.startTime ?? '',
          end: shift.End_time ?? shift.endTime ?? '',
          attraction: shift.attraction_name ?? shift.attractionName ?? '',
          attractionId: shift.AttractionID ?? shift.attractionId ?? shift.attractionID ?? null,
        };
      })
      .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.start || '').localeCompare(b.start || ''));
  }, [shifts]);

  return (
    <div className="page">
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>My Schedule</h2>
        <p className="muted">Review your upcoming shifts.</p>
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
                </tr>
              </thead>
              <tbody>
                {upcoming.map(shift => (
                  <tr key={shift.id || `${shift.date}-${shift.start}`}>
                    <td style={tdStyle}>{shift.date || '--'}</td>
                    <td style={tdStyle}>{shift.start || '--'}</td>
                    <td style={tdStyle}>{shift.end || '--'}</td>
                    <td style={tdStyle}>{shift.attraction || 'Unassigned'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <RideLogForm
        shifts={upcoming}
        disabled={!upcoming.length}
        onShiftLogged={handleShiftLogged}
      />
    </div>
  );
}

function RideLogForm({ shifts, disabled, onShiftLogged }) {
  const { user } = useAuth();
  const RECENT_LIMIT = 10;
  const cacheKey = useMemo(() => {
    if (user?.employeeId) return `ride-log-${user.employeeId}`;
    if (user?.id) return `ride-log-user-${user.id}`;
    return 'ride-log-staff';
  }, [user?.employeeId, user?.id]);
  const shiftOptions = useMemo(() => {
    return (shifts || [])
      .filter(shift => shift.attractionId && shift.date)
      .map(shift => ({
        id: shift.id || `${shift.attractionId}-${shift.date}-${shift.start}`,
        label: `${shift.date} - ${shift.attraction || 'Attraction'}`,
        date: shift.date,
        attractionId: shift.attractionId,
        attractionName: shift.attraction || 'Attraction',
        scheduleId: shift.scheduleId ?? shift.id ?? null,
      }));
  }, [shifts]);

  const [selectedShift, setSelectedShift] = useState(() => shiftOptions[0]?.id || '');
  const current = shiftOptions.find(opt => opt.id === selectedShift) || shiftOptions[0] || null;
  const [count, setCount] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const cachedLogs = useMemo(() => loadRecentLogs(cacheKey), [cacheKey]);
  const [recentLogs, setRecentLogs] = useState(cachedLogs);
  const [logsLoading, setLogsLoading] = useState(() => !cachedLogs.length);
  const [logsError, setLogsError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setSelectedShift(shiftOptions[0]?.id || '');
  }, [shiftOptions]);

  useEffect(() => {
    setRecentLogs(cachedLogs);
    setLogsLoading(!cachedLogs.length);
  }, [cachedLogs]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLogsLoading(true);
      setLogsError('');
      try {
        const params = new URLSearchParams();
        params.set('limit', String(RECENT_LIMIT));
        const res = await api(`/ride-log?${params.toString()}`);
        if (!active) return;
        const nextLogs = (Array.isArray(res?.data) ? res.data : []).slice(0, RECENT_LIMIT);
        if (nextLogs.length) {
          setRecentLogs(nextLogs);
          saveRecentLogs(cacheKey, nextLogs);
        }
      } catch (err) {
        if (!active) return;
        setLogsError(err?.message || 'Unable to load recent logs.');
      } finally {
        if (active) setLogsLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [reloadKey, cacheKey]);

  const noShiftAvailable = disabled || shiftOptions.length === 0;

  async function submit(e) {
    e.preventDefault();
    if (noShiftAvailable || !current) {
      setStatus('No scheduled shifts are available to log right now.');
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
          logDate: current.date,
          ridersCount,
          scheduleId: current.scheduleId || null,
        }),
      });
      setStatus('Rider count saved.');
      setCount('');
      setRecentLogs(prev => {
        const next = [{
          AttractionID: current.attractionId,
          attraction_name: current.attractionName,
          log_date: current.date,
          riders_count: ridersCount,
        }, ...prev].slice(0, RECENT_LIMIT);
        saveRecentLogs(cacheKey, next);
        return next;
      });
      setLogsLoading(false);
      setLogsError('');
      onShiftLogged?.(current);
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
        {noShiftAvailable && (
          <div className="text-sm text-gray-600">
            You've logged all assigned shifts. New shifts will appear here automatically.
          </div>
        )}
        <label className="field">
          <span>Shift</span>
          <select
            className="select"
            value={selectedShift}
            onChange={e => setSelectedShift(e.target.value)}
            disabled={noShiftAvailable}
          >
            {shiftOptions.length === 0 ? (
              <option value="">No scheduled shifts</option>
            ) : (
              shiftOptions.map(opt => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))
            )}
          </select>
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
          <button className="btn primary" type="submit" disabled={busy || noShiftAvailable}>
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
          <div className="text-sm text-gray-600">No rider logs yet.</div>
        )}
        {!logsLoading && !logsError && recentLogs.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
            {recentLogs.map(entry => {
              const riders = Number(entry.riders_count ?? entry.ridersCount ?? 0);
              return (
                <li key={`${entry.AttractionID}-${entry.log_date}`}>
                  <div className="text-sm font-medium">
                    {entry.log_date} - {riders.toLocaleString()} riders
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
      roles={['employee']}
      fallback={
        <div className="page">
          <div className="panel">Only employees can view schedules.</div>
        </div>
      }
    >
      <ScheduleView />
    </RequireRole>
  );
}
