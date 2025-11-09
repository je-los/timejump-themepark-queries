import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../auth';

export const ROLE_LABEL = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  employee: 'Employee',
  customer: 'Customer',
};

export function formatRole(role) {
  if (!role) return 'Unknown';
  return ROLE_LABEL[role] || role.charAt(0).toUpperCase() + role.slice(1);
}

export function Wrap({ children }) {
  return (
    <div className="container" style={{ display: 'grid', gap: 12 }}>
      {children}
    </div>
  );
}

export function Panel({ children, className = '' }) {
  return <div className={`panel ${className}`.trim()}>{children}</div>;
}

export function normalizeColumns(columns) {
  return (columns || []).map(col => {
    if (typeof col === 'string') {
      const label = col
        .replace(/_/g, ' ')
        .replace(/\b\w/g, ch => ch.toUpperCase());
      return { key: col, label };
    }
    if (!col.label) {
      const label = col.key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, ch => ch.toUpperCase());
      return { ...col, label };
    }
    return col;
  });
}

function SortableHeader({ column, sortableKeys, sortKey, sortDir, onSort, style }) {
  const isSortable = sortableKeys.includes(column.key);
  const isActive = isSortable && sortKey === column.key;
  const nextDir = isActive && sortDir === 'asc' ? 'desc' : 'asc';
  const className = isSortable ? 'sortable-header' : undefined;

  return (
    <th style={style} className={className}>
      {isSortable ? (
        <button
          type="button"
          className="table-sort-button"
          onClick={() => {
            if (!isActive) {
              onSort(column.key, 'asc');
            } else {
              onSort(column.key, nextDir);
            }
          }}
        >
          <span>{column.label}</span>
          <span className={`sort-indicator ${isActive ? sortDir : 'none'}`} aria-hidden="true" />
        </button>
      ) : (
        column.label
      )}
    </th>
  );
}

export function ResourceTable({
  title,
  description,
  rows,
  columns,
  loading,
  error,
  emptyMessage,
  searchPlaceholder = 'Search...',
  sortableKeys = [],
}) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState(sortableKeys[0] ?? null);
  const [sortDir, setSortDir] = useState('asc');
  const normalizedColumns = useMemo(() => normalizeColumns(columns), [columns]);

  const filteredRows = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return rows || [];
    return (rows || []).filter(row =>
      normalizedColumns.some(col => {
        const raw = row?.[col.key];
        if (raw === undefined || raw === null) return false;
        return String(raw).toLowerCase().includes(value);
      })
    );
  }, [rows, normalizedColumns, query]);

  useEffect(() => {
    if (!sortableKeys.length) {
      if (sortKey !== null) setSortKey(null);
      return;
    }
    if (!sortableKeys.includes(sortKey)) {
      setSortKey(sortableKeys[0] ?? null);
      setSortDir('asc');
    }
  }, [sortableKeys, sortKey]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;
    const copy = [...filteredRows];
    copy.sort((a, b) => {
      const av = a?.[sortKey];
      const bv = b?.[sortKey];
      if (av === undefined || av === null) return 1;
      if (bv === undefined || bv === null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return copy;
  }, [filteredRows, sortKey, sortDir]);
  const handleSort = (key, direction) => {
    setSortKey(key);
    setSortDir(direction);
  };

  return (
    <Panel>
      <div className="dataset-header">
        <div>
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
      </div>
      <div className="admin-search-bar" style={{ maxWidth: 320 }}>
        <input
          className="input"
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          style={{ width: '100%' }}
        />
      </div>
      {loading && <div className="text-sm text-gray-600">Loading...</div>}
      {!loading && error && <div className="alert error">{error}</div>}
      {!loading && !error && (
        sortedRows.length === 0 ? (
          <div className="text-sm text-gray-600">{emptyMessage}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {normalizedColumns.map(col => (
                    <SortableHeader
                      key={col.key}
                      column={col}
                      sortableKeys={sortableKeys}
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={handleSort}
                      style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid #ececec' }}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, idx) => (
                  <tr key={row?.id ?? row?.slug ?? row?.lot ?? row?.lotId ?? idx}>
                    {normalizedColumns.map(col => {
                      const raw = row?.[col.key];
                      const value = col.render ? col.render(raw, row) : raw;
                      return (
                        <td key={col.key} style={{ padding: '6px', borderBottom: '1px solid #f5f5f5' }}>
                          {value || value === 0 ? value : '--'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </Panel>
  );
}

export function TableList({ rows, columns, emptyMessage }) {
  if (!rows || rows.length === 0) {
    return <div className="text-sm text-gray-600">{emptyMessage}</div>;
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid #ececec' }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.id ?? row.slug ?? row.lot ?? row.lotId ?? idx}>
              {columns.map(col => {
                const raw = row[col.key];
                const value = col.render ? col.render(raw, row) : raw;
                return (
                  <td key={col.key} style={{ padding: '6px', borderBottom: '1px solid #f5f5f5' }}>
                    {value || value === 0 ? value : '--'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SimpleTable({
  title,
  path,
  columns,
  emptyMessage = 'No records found.',
  searchPlaceholder = 'Search...',
  sortableKeys = [],
}) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState(sortableKeys[0] ?? null);
  const [sortDir, setSortDir] = useState('asc');

  const normalizedColumns = useMemo(() => normalizeColumns(columns), [columns]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api(path)
      .then(j => {
        if (cancelled) return;
        setRows(j.data || []);
      })
      .catch(err => {
        if (cancelled) return;
        if (err?.status === 401 || err?.status === 403) {
          setRows([]);
          setError('');
        } else {
          setError(err?.message || 'Unable to load data.');
          setRows([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  const filteredRows = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return rows;
    return rows.filter(row =>
      normalizedColumns.some(col => {
        const cell = row[col.key];
        return cell !== undefined && cell !== null && String(cell).toLowerCase().includes(value);
      })
    );
  }, [rows, query, normalizedColumns]);

  useEffect(() => {
    if (!sortableKeys.length) {
      if (sortKey !== null) setSortKey(null);
      return;
    }
    if (!sortableKeys.includes(sortKey)) {
      setSortKey(sortableKeys[0] ?? null);
      setSortDir('asc');
    }
  }, [sortableKeys, sortKey]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;
    const copy = [...filteredRows];
    copy.sort((a, b) => {
      const av = a?.[sortKey];
      const bv = b?.[sortKey];
      if (av === undefined || av === null) return 1;
      if (bv === undefined || bv === null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return copy;
  }, [filteredRows, sortKey, sortDir]);

  const handleSort = (key, direction) => {
    setSortKey(key);
    setSortDir(direction);
  };

  return (
    <Panel>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <div className="admin-search-bar" style={{ maxWidth: 320 }}>
        <input
          className="input"
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          style={{ width: '100%' }}
        />
      </div>
      {loading && <div className="text-sm text-gray-600">Loading...</div>}
      {!loading && error && <div className="alert error">{error}</div>}
      {!loading && !error && (
        sortedRows.length === 0 ? (
          <div className="text-sm text-gray-600">{emptyMessage}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {normalizedColumns.map(col => (
                    <SortableHeader
                      key={col.key}
                      column={col}
                      sortableKeys={sortableKeys}
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={handleSort}
                      style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid #eee' }}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, idx) => (
                  <tr key={idx}>
                    {normalizedColumns.map(col => (
                      <td key={col.key} style={{ padding: '6px', borderBottom: '1px solid #f3f3f3' }}>
                        {row[col.key] ?? '--'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </Panel>
  );
}
