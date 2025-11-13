import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../auth';
import { useAuth } from '../context/authcontext.jsx';

const REPORT_CONFIGS = [
  {
    key: 'cancellations',
    title: 'Ride Cancellations',
    description: 'Audit rainouts and other closures; filter by reason, attraction, or notes.',
    endpoint: '/reports/cancellations',
    emptyMessage: 'Run the report to see cancellation activity.',
    columns: ['attraction', 'cancel_date', 'reason_label'],
    badge: 'Operations',
    fields: [
      { key: 'start', label: 'Start Date', type: 'date', default: () => dateDaysAgo(14) },
      { key: 'end', label: 'End Date', type: 'date', default: () => today() },
      {
        key: 'reasons',
        label: 'Reasons',
        type: 'multiselect',
        optionsKey: 'reasons',
        size: 5,
        placeholder: 'All reasons',
        helper: 'Toggle the reasons you want included.',
      },
      { key: 'search', label: 'Search (ride or notes)', type: 'text', placeholder: 'Keywords...' },
    ],
    buildParams: (state) => {
      const params = new URLSearchParams();
      if (state.start) params.set('start', state.start);
      if (state.end) params.set('end', state.end);
      if (Array.isArray(state.reasons) && state.reasons.length) {
        params.set('reasons', state.reasons.join(','));
      }
      if (state.search) params.set('search', state.search);
      return params;
    },
  },
  {
    key: 'riders',
    title: 'Ride Demand Trends',
    description: 'See rider counts for a given day or roll aggregate metrics by month and attraction.',
    endpoint: '/reports/riders-per-day',
    emptyMessage: 'Choose filters to see rider counts.',
    badge: 'Guest Flow',
    columns: ['Name', 'log_date', 'period_start', 'riders_count', 'avg_riders', 'entry_count'],
    fields: [
      {
        key: 'group',
        label: 'Group By',
        type: 'select',
        options: [
          { value: 'day', label: 'Day' },
          { value: 'month', label: 'Month' },
        ],
        default: 'month',
        allowAll: false,
        helper: 'Switch to “Day” to focus on a single date’s rider counts.',
      },
      {
        key: 'month',
        label: 'Month (monthly mode)',
        type: 'month',
        default: '',
        helper: 'Pick a calendar month to auto-fill the range when grouping by month.',
      },
      { key: 'date', label: 'Ride Date (daily)', type: 'date', default: '', helper: 'Leave blank to see all recent log dates.' },
      { key: 'ride', label: 'Filter by Attraction', type: 'text', placeholder: 'Name or ID', helper: 'Type part of the ride name or use an ID.' },
      { key: 'top', label: 'Top Results', type: 'number', default: '50', helper: 'Limit the number of rows returned (1-500).' },
    ],
    buildParams: (state) => {
      const params = new URLSearchParams();
      const group = state.group || 'month';
      if (group) params.set('group', group);
      if (group === 'day') {
        if (state.date) params.set('date', state.date);
      } else if (state.month) {
        const range = monthToRange(state.month);
        if (range) {
          params.set('start', range.start);
          params.set('end', range.end);
        }
      }
      if (state.ride) params.set('ride', state.ride);
      if (state.top) params.set('top', state.top);
      return params;
    },
  },
  {
    key: 'maintenance',
    title: 'Maintenance Incidents',
    description: 'Filter maintenance tickets by severity, type, attraction, or keyword.',
    endpoint: '/maintenance',
    emptyMessage: 'Run the report to review maintenance history.',
    badge: 'Maintenance',
    columns: [
      'attraction_name',
      'Date_broken_down',
      'Date_fixed',
      'Severity_of_report',
      'type_of_maintenance',
      'Description_of_work',
      'status_label',
      'approved_by_supervisor_name',
    ],
    fields: [
      { key: 'start', label: 'Start Date', type: 'date', default: '' },
      { key: 'end', label: 'End Date', type: 'date', default: '' },
      {
        key: 'severity',
        label: 'Severity',
        type: 'select',
        optionsKey: 'maintenanceSeverities',
        allowAll: true,
        placeholder: 'All severities',
      },
      {
        key: 'type',
        label: 'Maintenance Type',
        type: 'select',
        optionsKey: 'maintenanceTypes',
        allowAll: true,
        placeholder: 'All types',
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: '', label: 'All statuses' },
          { value: 'reported', label: 'Reported' },
          { value: 'awaiting_approval', label: 'Awaiting Approval' },
          { value: 'approved', label: 'Approved' },
        ],
        allowAll: false,
      },
      {
        key: 'approvedBy',
        label: 'Approved By (name or ID)',
        type: 'text',
        placeholder: 'e.g. 10000014 or Helena',
      },
      { key: 'attraction', label: 'Attraction (ID or name)', type: 'text', placeholder: 'All attractions' },
      { key: 'search', label: 'Keyword search', type: 'text', placeholder: 'notes contain...' },
    ],
    buildParams: (state) => {
      const params = new URLSearchParams();
      if (state.start) params.set('start', state.start);
      if (state.end) params.set('end', state.end);
      if (state.severity) params.set('severity', state.severity);
      if (state.type) params.set('type', state.type);
      if (state.status) params.set('status', state.status);
      if (state.approvedBy) params.set('approvedBy', state.approvedBy);
      if (state.attraction) params.set('attraction', state.attraction);
      if (state.search) params.set('q', state.search);
      return params;
    },
  },
  {
    key: 'revenue',
    title: 'Revenue Overview',
    description: 'Combine ticket, dining, and gift sales into one report.',
    endpoint: '/reports/revenue',
    emptyMessage: 'Run the report to see revenue totals.',
    badge: 'Finance',
    columns: ['period_label', 'category', 'item_name', 'quantity', 'total_amount'],
    fields: [
      { key: 'start', label: 'Start Date', type: 'date', default: '' },
      { key: 'end', label: 'End Date', type: 'date', default: '' },
      {
        key: 'category',
        label: 'Category',
        type: 'select',
        options: [
          { value: '', label: 'All categories' },
          { value: 'ticket', label: 'Tickets' },
          { value: 'food', label: 'Food' },
          { value: 'gift', label: 'Gifts' },
        ],
        allowAll: false,
      },
      { key: 'search', label: 'Search item name', type: 'text', placeholder: 'e.g. VIP or Funnel Cake' },
    ],
    buildParams: (state) => {
      const params = new URLSearchParams();
      if (state.start) params.set('start', state.start);
      if (state.end) params.set('end', state.end);
      if (state.category) params.set('category', state.category);
      if (state.search) params.set('search', state.search);
      return params;
    },
  },
];

export default function Reports() {
  const { user, loading, refresh } = useAuth();
  const [activeReport, setActiveReport] = useState(REPORT_CONFIGS[0].key);
  const [formState, setFormState] = useState(() => buildDefaultState());
  const [dataMap, setDataMap] = useState({});
  const [errors, setErrors] = useState({});
  const [infos, setInfos] = useState({});
  const [loadingKey, setLoadingKey] = useState('');
  const [lastRun, setLastRun] = useState({});
  const [tableState, setTableState] = useState({});
  const [reasonOptions, setReasonOptions] = useState([]);
  const [maintenanceMeta, setMaintenanceMeta] = useState({ types: [], severities: [] });

  useEffect(() => {
    if (!user && !loading) refresh();
  }, [user, loading, refresh]);

  useEffect(() => {
    api('/cancellation-reasons')
      .then(json => {
        const rows = Array.isArray(json.data) ? json.data : [];
        const options = rows.map(row => ({
          value: row.code,
          label: row.label || row.reason || row.code,
        }));
        setReasonOptions(options);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    api('/maintenance/meta')
      .then(json => {
        setMaintenanceMeta({
          types: Array.isArray(json.data?.types) ? json.data.types : [],
          severities: Array.isArray(json.data?.severities) ? json.data.severities : [],
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // auto-run when changing report so data is ready
    runReport(activeReport, { silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeReport]);

  if (loading) return <Wrap><Panel>Loading...</Panel></Wrap>;
  if (!user) return <Wrap><Panel>Please login.</Panel></Wrap>;
  if (!['employee', 'manager', 'admin', 'owner'].includes(user.role)) {
    return <Wrap><Panel>Employees, managers, admins, or owners only.</Panel></Wrap>;
  }

  const activeConfig = REPORT_CONFIGS.find(cfg => cfg.key === activeReport) ?? REPORT_CONFIGS[0];
  const reportRows = dataMap[activeReport] || [];
  const hasRun = Object.prototype.hasOwnProperty.call(dataMap, activeReport);
  const activeError = errors[activeReport] || '';
  const activeInfo = infos[activeReport] || '';
  const isLoading = loadingKey === activeReport;
  const isMaintenanceReport = activeReport === 'maintenance';
  const lastSummary = lastRun[activeReport];
  const revenueSummary = activeReport === 'revenue' ? lastSummary?.summary : null;
  const revenueBreakdown = useMemo(() => {
    if (activeReport !== 'revenue' || !revenueSummary?.by_category) return [];
    return Object.entries(revenueSummary.by_category)
      .map(([key, value]) => ({ key, amount: Number(value ?? 0) }))
      .filter(item => Number.isFinite(item.amount));
  }, [activeReport, revenueSummary]);
  const tablePrefs = tableState[activeReport] || { search: '', sortKey: '', sortDir: 'asc' };

  const optionLookups = useMemo(() => ({
    reasons: reasonOptions,
    maintenanceTypes: maintenanceMeta.types.map(value => ({ value, label: formatLabel(value) })),
    maintenanceSeverities: maintenanceMeta.severities.map(value => ({ value, label: formatLabel(value) })),
  }), [reasonOptions, maintenanceMeta]);

  function updateTableState(reportKey, patch) {
    setTableState(prev => {
      const existing = prev[reportKey] || {};
      return {
        ...prev,
        [reportKey]: {
          search: '',
          sortKey: '',
          sortDir: 'asc',
          ...existing,
          ...patch,
        },
      };
    });
  }

  function handleSort(reportKey, column) {
    setTableState(prev => {
      const current = prev[reportKey] || {};
      let nextDir = 'asc';
      if (current.sortKey === column) {
        nextDir = current.sortDir === 'asc' ? 'desc' : 'asc';
      }
      return {
        ...prev,
        [reportKey]: {
          ...current,
          sortKey: column,
          sortDir: nextDir,
        },
      };
    });
  }

  const ridersForm = formState.riders || {};
  const riderGroup = String(ridersForm.group || 'month').toLowerCase() === 'day' ? 'day' : 'month';

  const currentColumns = useMemo(() => {
    if (activeReport !== 'riders') return activeConfig.columns;
    return riderGroup === 'day'
      ? ['Name', 'log_date', 'riders_count']
      : ['Name', 'period_label', 'riders_count', 'avg_riders', 'entry_count'];
  }, [activeReport, activeConfig.columns, riderGroup]);

  const visibleRows = useMemo(() => {
    if (!Array.isArray(reportRows)) return [];
    const searchTerm = (tablePrefs.search || '').trim().toLowerCase();
    const filtered = searchTerm
      ? reportRows.filter(row =>
          currentColumns.some(col => {
            const value = normalizeRow(row)[col] ?? normalizeRow(row)[col?.toLowerCase()];
            return value !== undefined && value !== null && String(value).toLowerCase().includes(searchTerm);
          }),
        )
      : reportRows;
    const sortKey = tablePrefs.sortKey;
    if (!sortKey) return filtered;
    const dir = tablePrefs.sortDir === 'desc' ? -1 : 1;
    return [...filtered].sort((a, b) => {
      const valA = normalizeRow(a)[sortKey] ?? normalizeRow(a)[sortKey?.toLowerCase()];
      const valB = normalizeRow(b)[sortKey] ?? normalizeRow(b)[sortKey?.toLowerCase()];
      return compareValues(valA, valB) * dir;
    });
  }, [reportRows, tablePrefs, currentColumns]);

  const formStateRef = useRef(formState);
  useEffect(() => {
    formStateRef.current = formState;
  }, [formState]);

  function updateField(reportKey, fieldKey, nextValue) {
    setFormState(prev => ({
      ...prev,
      [reportKey]: {
        ...prev[reportKey],
        [fieldKey]: nextValue,
      },
    }));
  }

  const runReport = useCallback(async (reportKey, options = {}) => {
    const config = REPORT_CONFIGS.find(cfg => cfg.key === reportKey);
    if (!config) return;
    const state = formStateRef.current?.[reportKey] || {};
    const params = config.buildParams(state);
    const queryString = params.toString();
    const url = queryString ? `${config.endpoint}?${queryString}` : config.endpoint;
    setLoadingKey(reportKey);
    if (!options.silent) {
      setErrors(prev => ({ ...prev, [reportKey]: '' }));
      setInfos(prev => ({ ...prev, [reportKey]: '' }));
    }
    try {
      const res = await api(url);
      const rows = Array.isArray(res.data) ? res.data : (res.rows || []);
      const summary = res.summary || res.meta?.summary || null;
      setDataMap(prev => ({ ...prev, [reportKey]: rows }));
      setLastRun(prev => ({
        ...prev,
        [reportKey]: {
          count: rows.length,
          at: new Date().toISOString(),
          summary,
        },
      }));
      if (!rows.length) {
        setInfos(prev => ({ ...prev, [reportKey]: 'No data matched those filters.' }));
      } else {
        setInfos(prev => ({ ...prev, [reportKey]: '' }));
      }
    } catch (err) {
      setErrors(prev => ({ ...prev, [reportKey]: err?.message || 'Unable to run report.' }));
      setDataMap(prev => ({ ...prev, [reportKey]: [] }));
    } finally {
      setLoadingKey('');
    }
  }, []);

  const autoRunReportsRef = useRef(new Set());
  useEffect(() => {
    if (!activeReport) return;
    if (autoRunReportsRef.current.has(activeReport)) return;
    autoRunReportsRef.current.add(activeReport);
    runReport(activeReport, { silent: true });
  }, [activeReport, runReport]);


  function handleSubmit(event) {
    event.preventDefault();
    runReport(activeReport);
  }

  function resetFilters(reportKey) {
    const config = REPORT_CONFIGS.find(cfg => cfg.key === reportKey);
    if (!config) return;
    setFormState(prev => ({
      ...prev,
      [reportKey]: createDefaultFields(config),
    }));
    // rerun with defaults
    setTimeout(() => runReport(reportKey), 0);
  }

  return (
    <div className="reports-grid">
      <aside className="panel panel--stretch" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {REPORT_CONFIGS.map(cfg => {
            return (
              <button
                key={cfg.key}
                type="button"
                className={`report-select-card ${cfg.key === activeReport ? 'report-select-card--active' : ''}`}
                onClick={() => setActiveReport(cfg.key)}
              >
                <div className="report-select-card__title">{cfg.title}</div>
              </button>
            );
          })}
        </div>
      </aside>

      <section style={{ display: 'grid', gap: 16 }}>
        <div className="panel panel--stretch" style={{ display: 'grid', gap: 16 }}>
          <header>
            <h3 style={{ marginTop: 0 }}>{activeConfig.title}</h3>
            <p className="muted" style={{ marginBottom: 0 }}>{activeConfig.description}</p>
          </header>
          <form onSubmit={handleSubmit} className="report-form" style={{ display: 'grid', gap: 12 }}>
            <div className="report-fields">
              {activeConfig.fields.map(field => {
                if (!shouldShowField(activeReport, field.key, formState[activeReport])) {
                  return null;
                }
                return (
                  <FilterField
                    key={field.key}
                    field={field}
                    value={formState[activeReport]?.[field.key]}
                    onChange={value => updateField(activeReport, field.key, value)}
                    options={resolveOptions(field, optionLookups)}
                  />
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn primary" type="submit" disabled={isLoading}>
                {isLoading ? 'Running...' : 'Refresh Data'}
              </button>
              <button className="btn" type="button" onClick={() => resetFilters(activeReport)} disabled={isLoading}>
                Reset Filters
              </button>
            </div>
            {activeError && <div className="alert error">{activeError}</div>}
            {!activeError && activeInfo && hasRun && (
              <div className="alert info">{activeInfo}</div>
            )}
          </form>
        </div>

        <div className="panel panel--stretch">
          <h3 style={{ marginTop: 0 }}>Results</h3>
          {isLoading && <div>Loading data...</div>}
          {!isLoading && activeError && <div className="alert error">{activeError}</div>}
          {!isLoading && !activeError && !hasRun && (
            <div className="report-empty">Choose a report on the left to load data.</div>
          )}
          {!isLoading && !activeError && hasRun && (
            <>
              {activeReport === 'revenue' && revenueSummary && (
                <div
                  className="report-summary-card"
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span className="muted" style={{ fontSize: 12 }}>Total Revenue</span>
                    <strong style={{ fontSize: 28 }}>
                      {formatCurrency(revenueSummary.total_revenue ?? 0)}
                    </strong>
                    {lastSummary?.at && (
                      <small className="muted">Updated {formatRelative(lastSummary.at)}</small>
                    )}
                  </div>
                  {!!revenueBreakdown.length && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                      {revenueBreakdown.map(item => (
                        <div
                          key={item.key}
                          style={{
                            flex: '1 1 140px',
                            minWidth: 140,
                            padding: 12,
                            border: '1px solid #f1f5f9',
                            borderRadius: 12,
                            background: '#f8fafc',
                          }}
                        >
                          <span className="muted" style={{ fontSize: 12 }}>
                            {formatLabel(item.key)}
                          </span>
                          <div style={{ fontWeight: 600 }}>
                            {formatCurrency(item.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
                <input
                  className="input"
                  type="text"
                  style={{ minWidth: 220, flex: '1 1 220px' }}
                  placeholder="Search rows..."
                  value={tablePrefs.search || ''}
                  onChange={e => updateTableState(activeReport, { search: e.target.value })}
                />
                {!!reportRows.length && (
                  <span className="muted" style={{ fontSize: 12 }}>
                    Showing {visibleRows.length} of {reportRows.length} rows
                  </span>
                )}
              </div>
              {isMaintenanceReport ? (
                <MaintenanceReportTable
                  rows={visibleRows}
                  emptyMessage={activeConfig.emptyMessage}
                />
              ) : (
                <ReportTable
                  rows={visibleRows}
                  columns={currentColumns}
                  emptyMessage={activeConfig.emptyMessage}
                  sortKey={tablePrefs.sortKey}
                  sortDir={tablePrefs.sortDir}
                  onSort={column => handleSort(activeReport, column)}
                />
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function Wrap({ children }) {
  return <div className="container" style={{ display: 'grid', gap: 12 }}>{children}</div>;
}

function Panel({ children }) {
  return <div className="panel">{children}</div>;
}

function shouldShowField(reportKey, fieldKey, state = {}) {
  if (reportKey !== 'riders') return true;
  const group = String(state?.group || 'month').toLowerCase() === 'day' ? 'day' : 'month';
  if (fieldKey === 'date') return group === 'day';
  if (fieldKey === 'month') return group === 'month';
  return true;
}

function FilterField({ field, value, onChange, options = [] }) {
  const { type, label, placeholder, size, allowAll = true } = field;
  const helper = field.helper;
  if (type === 'multiselect') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="field field--stack">
        <span>{label}</span>
        <div className="multiselect-grid" style={{ maxHeight: size ? `${size * 36}px` : '160px' }}>
          {options.map(opt => {
            const optionValue = opt.value ?? opt.label;
            const checked = selected.includes(optionValue);
            return (
              <label
                key={optionValue}
                className={`multiselect-chip ${checked ? 'multiselect-chip--active' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    if (checked) {
                      onChange(selected.filter(item => item !== optionValue));
                    } else {
                      onChange([...selected, optionValue]);
                    }
                  }}
                />
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
        {helper && <small className="field-helper">{helper}</small>}
      </div>
    );
  }

  if (type === 'select') {
    return (
      <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span>{label}</span>
        <select
          className="select"
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
        >
          {allowAll && <option value="">{placeholder || 'All options'}</option>}
          {options.map(opt => (
            <option key={opt.value || opt.label} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {helper && <small className="field-helper">{helper}</small>}
      </label>
    );
  }

  return (
    <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span>{label}</span>
      <input
        className="input"
        type={type === 'date' ? 'date' : type === 'number' ? 'number' : type === 'month' ? 'month' : 'text'}
        placeholder={placeholder}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        min={type === 'number' ? 1 : undefined}
      />
      {helper && <small className="field-helper">{helper}</small>}
    </label>
  );
}

function resolveOptions(field, optionLookups) {
  if (field.options) return field.options;
  if (field.optionsKey && optionLookups[field.optionsKey]) {
    return optionLookups[field.optionsKey];
  }
  return [];
}

function buildDefaultState() {
  const defaults = {};
  REPORT_CONFIGS.forEach(config => {
    defaults[config.key] = createDefaultFields(config);
  });
  return defaults;
}

function createDefaultFields(config) {
  const next = {};
  config.fields.forEach(field => {
    const base = typeof field.default === 'function' ? field.default() : field.default;
    if (field.type === 'multiselect') {
      next[field.key] = Array.isArray(base) ? base : (base ? [base] : []);
    } else {
      next[field.key] = base ?? '';
    }
  });
  return next;
}

function today() {
  return formatDateInput(new Date());
}

function dateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return formatDateInput(date);
}

function formatDateInput(date) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
}

function monthToRange(value) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null;
  const [yearStr, monthStr] = value.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
  const start = `${yearStr}-${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${yearStr}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

function ReportTable({ rows, columns, emptyMessage, sortKey, sortDir, onSort }) {
  const data = Array.isArray(rows) ? rows : [];
  if (!data.length) return <div className="report-empty">{emptyMessage}</div>;
  return (
    <div className="workspace-table">
      <table>
        <thead>
          <tr>
            {columns.map(col => {
              const active = sortKey === col;
              const dirSymbol = active ? (sortDir === 'desc' ? '▼' : '▲') : '';
              return (
                <th key={col}>
                  <button
                    type="button"
                    className="table-sort-btn"
                    onClick={() => onSort(col)}
                  >
                    {formatLabel(col)} {dirSymbol}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => {
            const normalized = normalizeRow(row);
            return (
              <tr key={idx}>
                {columns.map(col => {
                  const value = normalized[col] ?? normalized[toLower(col)];
                  return <td key={col}>{formatValue(value, col)}</td>;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MaintenanceReportTable({ rows, emptyMessage }) {
  const data = Array.isArray(rows) ? rows : [];
  if (!data.length) return <div className="report-empty">{emptyMessage}</div>;
  return (
    <div className="workspace-table">
      <table>
        <thead>
          <tr>
            <th>Attraction</th>
            <th>Type</th>
            <th>Severity</th>
            <th>Reported</th>
            <th>Resolved</th>
            <th>Status</th>
            <th>Approved By</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={row.RecordID ?? `${row.attraction_name}-${row.Date_broken_down}`}>
              <td>{row.attraction_name || row.AttractionID || '--'}</td>
              <td>{row.type_of_maintenance || '--'}</td>
              <td>{row.Severity_of_report || '--'}</td>
              <td>{formatDateOnly(row.Date_broken_down)}</td>
              <td>{formatDateOnly(row.Date_fixed)}</td>
              <td>{row.status_label || row.Status || 'Unknown'}</td>
              <td>{row.approved_by_supervisor_name || row.Approved_by_supervisor || 'Pending'}</td>
              <td>{row.Description_of_work || '--'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function normalizeRow(row) {
  if (!row || typeof row !== 'object') return {};
  return row;
}

function toLower(key) {
  return typeof key === 'string' ? key.toLowerCase() : key;
}

function formatLabel(key) {
  if (!key) return '';
  const label = key.replace(/_/g, ' ');
  return label.replace(/\b\w/g, ch => ch.toUpperCase());
}

function formatCurrency(value) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return '$0.00';
  return amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

function formatValue(value, column) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '';
    const abs = Math.abs(value);
    if (column && /amount|price|revenue/i.test(column)) {
      return `$${value.toFixed(2)}`;
    }
    if (Number.isInteger(value)) {
      return abs >= 1000 ? value.toLocaleString() : value;
    }
    return value.toFixed(2).replace(/\.00$/, '');
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
      const date = new Date(trimmed);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      }
    }
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
      const date = new Date(trimmed.replace(' ', 'T'));
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      }
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const date = new Date(`${trimmed}T00:00:00`);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      }
    }
    if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
      return trimmed.slice(0, 5);
    }
    return trimmed;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toLocaleString();
  }
  return String(value);
}

function compareValues(a, b) {
  const valA = parseValue(a);
  const valB = parseValue(b);
  if (valA < valB) return -1;
  if (valA > valB) return 1;
  return 0;
}

function parseValue(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  const str = String(value).trim();
  if (!str) return '';
  const num = Number(str);
  if (!Number.isNaN(num)) return num;
  if (/^\d{4}-\d{2}-\d{2}T/.test(str) || /^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const date = new Date(/T/.test(str) ? str : `${str}T00:00:00`);
    if (!Number.isNaN(date.getTime())) return date.getTime();
  }
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(str)) {
    const date = new Date(str.replace(' ', 'T'));
    if (!Number.isNaN(date.getTime())) return date.getTime();
  }
  if (/^\d{2}:\d{2}:\d{2}$/.test(str)) {
    return str.slice(0, 5);
  }
  return str.toLowerCase();
}

function formatRelative(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) {
    const mins = Math.round(diff / 60_000);
    return `${mins} min${mins === 1 ? '' : 's'} ago`;
  }
  if (diff < 86_400_000) {
    const hours = Math.round(diff / 3_600_000);
    return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDateOnly(value) {
  if (!value) return '--';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}



