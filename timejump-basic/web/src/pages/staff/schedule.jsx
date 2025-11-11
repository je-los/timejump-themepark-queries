import React, { useEffect, useMemo, useState } from 'react';
import RequireRole from '../../components/requirerole.jsx';
import { api } from '../../auth.js';

function ScheduleView() {
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
