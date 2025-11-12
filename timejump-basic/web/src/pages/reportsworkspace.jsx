import React, { useEffect, useState } from 'react';
import RequireRole from '../components/requirerole.jsx';
import Reports from './reports.jsx';
import { api } from '../auth';

export default function ReportsWorkspace() {
  return (
    <RequireRole
      roles={['employee','manager','admin','owner']}
      fallback={<div className="container"><div className="panel">Reports are restricted to staff.</div></div>}
    >
      <WorkspaceShell />
    </RequireRole>
  );
}

function WorkspaceShell() {
  return (
    <div className="workspace-stack">
      <section id="operations" className="workspace-section">
        <SectionHeader
          title="Reports"
          description="Select the report you need and adjust filters to focus the dataset."
        />
        <Reports />
      </section>

    </div>
  );
}

function SectionHeader({ title, description }) {
  return (
    <header className="workspace-section__header">
      <h2>{title}</h2>
      <p>{description}</p>
    </header>
  );
}

function DataTable({ title, path, columns, emptyMessage, refreshKey = 0, onRefresh }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api(path)
      .then(j => { if (active) setRows(j.data || []); })
      .catch(err => {
        if (!active) return;
        if (err?.status === 403) {
          setRows([]);
        } else {
          setError(err?.message || 'Failed to load data.');
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [path, refreshKey]);

  return (
    <div className="workspace-panel">
      <div className="workspace-panel__top">
        <h3>{title}</h3>
        {onRefresh && (
          <button className="btn" type="button" onClick={onRefresh} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        )}
      </div>
      {loading && <div className="text-sm text-gray-700">Loading...</div>}
      {!loading && error && <div className="alert error">{error}</div>}
      {!loading && !error && rows.length === 0 && (
        <div className="workspace-table__empty">{emptyMessage}</div>
      )}
      {!loading && rows.length > 0 && (
        <div className="workspace-table">
          <table>
            <thead>
              <tr>{columns.map(col => <th key={col}>{col}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx}>
                  {columns.map(col => (
                    <td key={col}>{String(row[col] ?? row[col.toLowerCase()] ?? '')}</td>
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

















