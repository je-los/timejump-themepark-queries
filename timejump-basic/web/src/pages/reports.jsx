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
      { key: 'attraction', label: 'Attraction (ID or name)', type: 'text', placeholder: 'e.g. 12 or Rapids' },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'active', label: 'Active' },
          { value: 'cleared', label: 'Cleared' },
          { value: 'all', label: 'All' },
        ],
        allowAll: false,
        default: 'active',
      },
      { key: 'limit', label: 'Top Results', type: 'number', default: '50', helper: '1-500 rows' },
    ],
    buildParams: (state) => {
      const params = new URLSearchParams();
      if (state.start) params.set('start', state.start);
      if (state.end) params.set('end', state.end);
      if (Array.isArray(state.reasons) && state.reasons.length) {
        params.set('reasons', state.reasons.join(','));
      }
      if (state.search) params.set('search', state.search);
      if (state.attraction) params.set('attraction', state.attraction);
      if (state.status) params.set('status', state.status);
      const limitVal = Number(state.limit);
      if (Number.isInteger(limitVal) && limitVal > 0 && limitVal <= 500) params.set('limit', String(limitVal));
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
    columns: ['Name', 'log_date', 'period_start', 'riders_count', 'avg_riders', 'entry_count', 'employee_name'],
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
      const groupParam = group === 'month' ? 'day' : group; // fetch daily rows so we can list entries per month
      if (groupParam) params.set('group', groupParam);
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
      { key: 'limit', label: 'Top Results', type: 'number', default: '50', helper: '1-500 rows' },
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
      const limitVal = Number(state.limit);
      if (Number.isInteger(limitVal) && limitVal > 0 && limitVal <= 500) params.set('limit', String(limitVal));
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
    columns: ['period_label', 'category', 'item_name', 'quantity', 'total_amount', 'customer_email'],
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
          { value: 'parking', label: 'Parking' },
        ],
        allowAll: false,
      },
      { key: 'search', label: 'Search item name', type: 'text', placeholder: 'e.g. VIP or Funnel Cake' },
      { key: 'limit', label: 'Top Results', type: 'number', default: '50', helper: '1-500 rows' },
    ],
    buildParams: (state) => {
      const params = new URLSearchParams();
      if (state.start) params.set('start', state.start);
      if (state.end) params.set('end', state.end);
      if (state.category) params.set('category', state.category);
      if (state.search) params.set('search', state.search);
      const limitVal = Number(state.limit);
      if (Number.isInteger(limitVal) && limitVal > 0 && limitVal <= 500) params.set('limit', String(limitVal));
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
  const isCancellationsReport = activeReport === 'cancellations';
  const isRevenueReport = activeReport === 'revenue';
  const lastSummary = lastRun[activeReport];
  const revenueSummary = activeReport === 'revenue' ? lastSummary?.summary : null;
  const revenueBreakdown = useMemo(() => {
    if (activeReport !== 'revenue') return [];
    const categories = ['ticket', 'food', 'gift', 'parking'];
    const byCat = revenueSummary?.by_category || {};
    return categories
      .map(key => ({ key, amount: Number(byCat[key] ?? 0) }))
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
  const isRidersMonthlyView = activeReport === 'riders' && riderGroup === 'month';
  const isRidersDailyView = activeReport === 'riders' && riderGroup === 'day';

  const currentColumns = useMemo(() => {
    if (activeReport !== 'riders') return activeConfig.columns;
    return riderGroup === 'day'
      ? ['Name', 'log_date', 'riders_count', 'employee_name']
      : ['Name', 'period_label', 'riders_count', 'avg_riders', 'entry_count', 'employee_name'];
  }, [activeReport, activeConfig.columns, riderGroup]);

  const visibleRows = useMemo(() => {
    if (!Array.isArray(reportRows)) return [];
    const scopedRows = (isRidersMonthlyView && ridersForm.month)
      ? reportRows.filter(row => isWithinMonth(row, ridersForm.month))
      : reportRows;
    const searchTerm = (tablePrefs.search || '').trim().toLowerCase();
    const filtered = searchTerm
      ? scopedRows.filter(row =>
          currentColumns.some(col => {
            const value = normalizeRow(row)[col] ?? normalizeRow(row)[col?.toLowerCase()];
            return value !== undefined && value !== null && String(value).toLowerCase().includes(searchTerm);
          }),
        )
      : scopedRows;
    const sortKey = tablePrefs.sortKey;
    let sorted = filtered;
    if (sortKey) {
      const dir = tablePrefs.sortDir === 'desc' ? -1 : 1;
      sorted = [...filtered].sort((a, b) => {
        const valA = normalizeRow(a)[sortKey] ?? normalizeRow(a)[sortKey?.toLowerCase()];
        const valB = normalizeRow(b)[sortKey] ?? normalizeRow(b)[sortKey?.toLowerCase()];
        return compareValues(valA, valB) * dir;
      });
    }
    const limitNum = Number(tablePrefs.limit);
    if (Number.isInteger(limitNum) && limitNum > 0) {
      return sorted.slice(0, limitNum);
    }
    return sorted;
  }, [reportRows, tablePrefs, currentColumns, isRidersMonthlyView, ridersForm.month]);

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
                            border: '1px solid #e2e8f0',
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
              ) : isRevenueReport ? (
                <RevenueGroupedList
                  rows={visibleRows}
                  emptyMessage={activeConfig.emptyMessage}
                />
              ) : isCancellationsReport ? (
                <CancellationsReportList
                  rows={visibleRows}
                  emptyMessage={activeConfig.emptyMessage}
                />
              ) : isRidersDailyView ? (
                <RidersDailyList
                  rows={visibleRows}
                  emptyMessage={activeConfig.emptyMessage}
                />
              ) : isRidersMonthlyView ? (
                <RidersMonthlyList
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

function formatPeriodLabel(mode, isoDate) {
  if (!isoDate) return '';
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  if (mode === 'month') {
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
  }
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function ReportTable({ rows, columns, emptyMessage, sortKey, sortDir, onSort }) {
  const data = Array.isArray(rows) ? rows : [];
  if (!data.length) return <div className="report-empty">{emptyMessage}</div>;
  const isRevenue = columns.includes('customer_email');
  const revenueBadgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    background: '#e0f2fe',
    color: '#0369a1',
    textTransform: 'capitalize',
  };
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
            const highlight = isRevenue && ['ticket', 'food', 'gift'].includes(String(normalized.category || '').toLowerCase());
            return (
              <tr key={idx} style={highlight ? { background: '#f8fafc' } : undefined}>
                {columns.map(col => {
                  const value = normalized[col] ?? normalized[toLower(col)];
                  if (isRevenue && col === 'category') {
                    return (
                      <td key={col}>
                        <span style={revenueBadgeStyle}>{formatLabel(value)}</span>
                      </td>
                    );
                  }
                  if (isRevenue && col === 'customer_email') {
                    return (
                      <td key={col} style={{ color: '#0f172a' }}>
                        {value || '--'}
                      </td>
                    );
                  }
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

function RidersMonthlyList({ rows, emptyMessage }) {
  const data = Array.isArray(rows) ? rows : [];
  if (!data.length) return <div className="report-empty">{emptyMessage}</div>;

  const groups = Array.from(
    data.reduce((map, row) => {
      const dateStr = row.period_start || row.log_date || row.period || row.period_label || 'unknown';
      const monthDate = toMonthDate(dateStr);
      const monthKey = monthDate.key;
      const monthLabel = monthDate.label;
      const sortValue = monthDate.sortValue;
      if (!map.has(monthKey)) {
        map.set(monthKey, {
          key: monthKey,
          label: monthLabel,
          sortValue,
          total: 0,
          attractions: new Map(),
        });
      }
      const group = map.get(monthKey);

      const riders = Number(row.riders_count || row.riders || 0);
      group.total += Number.isFinite(riders) ? riders : 0;

      const attractionId = row.AttractionID || row.AttractionId || row.attraction_id || row.attractionId || row.Name || row.name || 'Attraction';
      const attractionName = row.Name || row.name || row.attraction_name || `Attraction ${attractionId || ''}`;
      if (!group.attractions.has(attractionId)) {
        group.attractions.set(attractionId, {
          id: attractionId,
          name: attractionName,
          total: 0,
          count: 0,
          entries: [],
        });
      }
      const ride = group.attractions.get(attractionId);
      ride.total += Number.isFinite(riders) ? riders : 0;
      ride.count += 1;
      ride.entries.push({
        date: row.log_date || row.period_start || row.period_label || '',
        riders,
        employee: row.employee_name || row.EmployeeName || row.employee || '',
      });

      return map;
    }, new Map()).values(),
  ).sort((a, b) => b.sortValue - a.sortValue);

  return (
    <div className="riders-monthly-list" style={{ display: 'grid', gap: 16 }}>
      {groups.map(group => (
        <div
          key={group.key}
          className="panel"
          style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 12 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <div>
              <h4 style={{ margin: 0 }}>{group.label}</h4>
            </div>
            <div style={{ fontWeight: 600 }}>
              Total riders: {formatNumber(group.total)}
            </div>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {Array.from(group.attractions.values()).map(ride => (
              <div key={`${group.key}-${ride.id}`} style={{ border: '1px solid #f1f5f9', borderRadius: 10, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 600 }}>{ride.name || 'Attraction'}</div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', fontSize: 13, color: '#0f172a' }}>
                    <span>Ride total: <strong>{formatNumber(ride.total)}</strong></span>
                    <span style={{ color: '#475569' }}>
                      Avg: <strong>{ride.count ? formatNumber(ride.total / ride.count) : '--'}</strong>
                    </span>
                  </div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 13, color: '#1f2937', fontWeight: 600, padding: '6px 4px' }}>
                    <span>Date</span>
                    <span>Riders</span>
                    <span>Logged By</span>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
                    {ride.entries
                      .slice()
                      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
                      .map((entry, idx) => (
                      <li key={`${group.key}-${ride.id}-${idx}`} style={{ fontSize: 13, color: '#475569', borderBottom: '1px solid #f8fafc', padding: '6px 4px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                          <span>{entry.date ? formatDateOnly(entry.date) : '--'}</span>
                          <span>{formatNumber(entry.riders)}</span>
                          <span>{entry.employee || '--'}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: '#475569' }}>
            Monthly total: <strong>{formatNumber(group.total)}</strong>
          </div>
        </div>
      ))}
    </div>
  );
}

function RevenueGroupedList({ rows, emptyMessage }) {
  const data = Array.isArray(rows) ? rows : [];
  if (!data.length) return <div className="report-empty">{emptyMessage}</div>;

  const groups = Array.from(
    data.reduce((map, row) => {
      const itemName = row.item_name || row.name || 'Item';
      if (!map.has(itemName)) {
        map.set(itemName, {
          item: itemName,
          category: row.category || '',
          total_amount: 0,
          total_qty: 0,
          rows: [],
        });
      }
      const group = map.get(itemName);
      const amt = Number(row.total_amount || 0);
      const qty = Number(row.quantity || 0);
      if (Number.isFinite(amt)) group.total_amount += amt;
      if (Number.isFinite(qty)) group.total_qty += qty;
      group.rows.push({
        period: row.period_label || row.period_start || '',
        qty,
        amt,
        customer: row.customer_email || '',
      });
      return map;
    }, new Map()).values(),
  ).sort((a, b) => Number(b.total_amount || 0) - Number(a.total_amount || 0));

  const badgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    background: '#e0f2fe',
    color: '#0f172a',
    textTransform: 'capitalize',
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {groups.map(group => (
        <div
          key={group.item}
          className="panel"
          style={{
            padding: 14,
            border: '1px solid #dbeafe',
            borderRadius: 12,
            background: 'linear-gradient(135deg, #eff6ff 0%, #e0f2fe 50%, #fff 100%)',
            boxShadow: '0 6px 18px rgba(15,23,42,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            <div style={{ fontWeight: 700, color: '#0f172a' }}>{group.item}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {group.category && <span style={badgeStyle}>{formatLabel(group.category)}</span>}
              <span style={{ fontSize: 13, color: '#0f172a' }}>
                Total: <strong>{formatCurrency(group.total_amount)}</strong>
              </span>
              <span style={{ fontSize: 12, color: '#475569' }}>
                {formatNumber(group.total_qty)} sold
              </span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 1fr', gap: 8, fontSize: 13, fontWeight: 700, color: '#0f172a', padding: '6px 4px' }}>
            <span>Period</span>
            <span style={{ textAlign: 'right' }}>Revenue</span>
            <span>Customer</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
            {group.rows.map((row, idx) => (
              <li
                key={`${group.item}-${idx}`}
                style={{
                  padding: '8px 6px',
                  borderBottom: '1px solid #e2e8f0',
                  fontSize: 13,
                  color: '#0f172a',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 1fr', gap: 8, alignItems: 'center' }}>
                  <span>{row.period || '--'}</span>
                  <span style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(row.amt)}</span>
                  <span style={{ color: '#0f172a' }}>{row.customer || '—'}</span>
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  Qty: {formatNumber(row.qty)}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function RidersDailyList({ rows, emptyMessage }) {
  const data = Array.isArray(rows) ? rows : [];
  if (!data.length) return <div className="report-empty">{emptyMessage}</div>;

  const groups = Array.from(
    data.reduce((map, row) => {
      const date = row.log_date || row.period_start || row.period || row.period_label || '';
      const key = date || 'unknown';
      const label = date ? formatDateOnly(date) : 'Unknown Date';
      if (!map.has(key)) {
        map.set(key, {
          key,
          label,
          total: 0,
          entries: [],
        });
      }
      const group = map.get(key);
      const riders = Number(row.riders_count || row.riders || 0);
      group.total += Number.isFinite(riders) ? riders : 0;
      group.entries.push({
        name: row.Name || row.name || row.attraction_name || `Attraction ${row.AttractionID || ''}`,
        riders,
        employee: row.employee_name || row.EmployeeName || row.employee || '',
      });
      return map;
    }, new Map()).values(),
  ).sort((a, b) => (a.key || '').localeCompare(b.key || ''));

  return (
    <div className="riders-daily-list" style={{ display: 'grid', gap: 12 }}>
      {groups.map(group => (
        <div key={group.key} className="panel" style={{ padding: 14, border: '1px solid #e5e7eb', borderRadius: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            <h4 style={{ margin: 0 }}>{group.label}</h4>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', fontSize: 13, color: '#0f172a' }}>
              <span>Daily total: <strong>{formatNumber(group.total)}</strong></span>
              <span style={{ color: '#475569' }}>
                Avg per entry: <strong>{group.entries.length ? formatNumber(group.total / group.entries.length) : '--'}</strong>
              </span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 1fr', gap: 8, fontSize: 13, color: '#1f2937', fontWeight: 600, padding: '6px 4px' }}>
            <span>Attraction</span>
            <span style={{ textAlign: 'right' }}>Riders</span>
            <span>Logged By</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
            {group.entries.map((entry, idx) => (
              <li key={`${group.key}-${idx}`} style={{ padding: '6px 4px', borderBottom: '1px solid #f8fafc', fontSize: 13, color: '#475569' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 1fr', gap: 8, alignItems: 'center' }}>
                  <span>{entry.name}</span>
                  <span style={{ textAlign: 'right', fontWeight: 600 }}>{formatNumber(entry.riders)}</span>
                  <span>{entry.employee || '--'}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function CancellationsReportList({ rows, emptyMessage }) {
  const data = Array.isArray(rows) ? rows : [];
  if (!data.length) return <div className="report-empty">{emptyMessage}</div>;

  const groups = Array.from(
    data.reduce((map, row) => {
      const key = row.cancel_date || row.date || 'unknown';
      const label = key ? formatDateOnly(key) : 'Unknown Date';
      if (!map.has(key)) {
        map.set(key, { key, label, entries: [] });
      }
      map.get(key).entries.push(row);
      return map;
    }, new Map()).values(),
  ).sort((a, b) => (b.key || '').localeCompare(a.key || ''));

  const statusBadge = (cleared) => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    background: cleared ? '#ecfdf3' : '#fef3c7',
    color: cleared ? '#166534' : '#92400e',
  });

  const reasonBadge = {
    display: 'inline-flex',
    padding: '2px 8px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    background: '#e0f2fe',
    color: '#0369a1',
    textTransform: 'capitalize',
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {groups.map(group => (
        <div key={group.key} className="panel" style={{ padding: 14, border: '1px solid #e5e7eb', borderRadius: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            <h4 style={{ margin: 0 }}>{group.label}</h4>
            <span className="muted" style={{ fontSize: 12 }}>{group.entries.length} cancellation(s)</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
            {group.entries.map(entry => {
              const cleared = Number(entry.cleared || 0) === 1;
              const impacted = Array.isArray(entry.impacted_schedules) ? entry.impacted_schedules : [];
              return (
                <li key={entry.cancel_id || `${entry.attraction_id}-${entry.cancel_date}`} style={{ padding: 10, border: '1px solid #f1f5f9', borderRadius: 10, background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>
                      {entry.attraction || `Attraction ${entry.attraction_id}`}
                      {entry.attraction_id && (
                        <span style={{ marginLeft: 6, fontSize: 12, color: '#94a3b8' }}>#{entry.attraction_id}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={reasonBadge}>{entry.reason_label || entry.reason || 'Unspecified'}</span>
                      <span style={statusBadge(cleared)}>{cleared ? 'Cleared' : 'Active'}</span>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>ID #{entry.cancel_id || '--'}</span>
                    </div>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: '#475569' }}>
                    Logged: {formatDateOnly(entry.cancel_date)}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a', marginBottom: 4 }}>
                      Impacted shifts: {formatNumber(entry.impacted_count || impacted.length || 0)}
                    </div>
                    {impacted.length > 0 && (
                      <div style={{ display: 'grid', gap: 4 }}>
                        {impacted.slice(0, 4).map(imp => (
                          <div key={`${entry.cancel_id}-${imp.schedule_id}`} style={{ fontSize: 12, color: '#475569', borderBottom: '1px solid #f8fafc', paddingBottom: 4 }}>
                            <span style={{ marginRight: 8 }}>{formatDateOnly(imp.shift_date)}</span>
                            <span style={{ marginRight: 8 }}>{(imp.start_time || '').slice(0, 5)} - {(imp.end_time || '').slice(0, 5)}</span>
                            <span>{imp.employee_name || 'Unassigned'}</span>
                          </div>
                        ))}
                        {impacted.length > 4 && (
                          <div style={{ fontSize: 12, color: '#94a3b8' }}>+{impacted.length - 4} more</div>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function MaintenanceReportTable({ rows, emptyMessage }) {
  const data = Array.isArray(rows) ? rows : [];
  if (!data.length) return <div className="report-empty">{emptyMessage}</div>;

  const groups = Array.from(
    data.reduce((map, row) => {
      const key = row.AttractionID || row.attraction_name || 'Unknown';
      const name = row.attraction_name || `Attraction ${row.AttractionID || ''}` || 'Attraction';
      if (!map.has(key)) {
        map.set(key, { key, name, rows: [] });
      }
      map.get(key).rows.push(row);
      return map;
    }, new Map()).values(),
  ).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const headerStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 130px 120px 120px 120px 140px',
    gap: 10,
    fontSize: 13,
    fontWeight: 600,
    color: '#1f2937',
    padding: '6px 4px',
  };
  const rowStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 130px 120px 120px 120px 140px',
    gap: 10,
    fontSize: 13,
    color: '#0f172a',
    padding: '6px 4px',
    borderBottom: '1px solid #f8fafc',
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {groups.map(group => (
        <div key={group.key} className="panel" style={{ padding: 14, border: '1px solid #cbd5e1', borderRadius: 12, background: '#f8fbff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            <h4 style={{ margin: 0, color: '#0f172a' }}>{group.name}</h4>
            <span style={{ fontSize: 12, color: '#0369a1', fontWeight: 600 }}>{group.rows.length} incident(s)</span>
          </div>
          <div style={headerStyle}>
            <span>Description</span>
            <span>Type</span>
            <span>Severity</span>
            <span>Reported</span>
            <span>Resolved</span>
            <span>Status / Approved By</span>
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            {group.rows.map(row => (
              <div key={row.RecordID ?? `${group.key}-${row.Date_broken_down}-${row.type_of_maintenance || row.Type}`}>
                <div style={{ ...rowStyle, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 3px 12px rgba(15,23,42,0.05)' }}>
                  <span>{row.Description_of_work || '--'}</span>
                  <span>{row.type_of_maintenance || row.Type || '--'}</span>
                  <span>{row.Severity_of_report || '--'}</span>
                  <span>{formatDateOnly(row.Date_broken_down)}</span>
                  <span>{formatDateOnly(row.Date_fixed)}</span>
                  <span>
                    <div style={{ fontWeight: 700 }}>{row.status_label || row.Status || 'Unknown'}</div>
                    <div style={{ fontSize: 12, color: '#0ea5e9' }}>{row.approved_by_supervisor_name || row.Approved_by_supervisor || 'Pending'}</div>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
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

function formatNumber(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return '--';
  return num.toLocaleString();
}

function isWithinMonth(row, monthValue) {
  if (!monthValue || !/^\d{4}-\d{2}$/.test(monthValue)) return true;
  const range = monthToRange(monthValue);
  if (!range) return true;
  const dateStr = row.log_date || row.period_start || row.period || row.period_label || '';
  if (!dateStr) return false;
  const ts = Date.parse(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
  const startTs = Date.parse(`${range.start}T00:00:00`);
  const endTs = Date.parse(`${range.end}T23:59:59`);
  if (!Number.isFinite(ts) || !Number.isFinite(startTs) || !Number.isFinite(endTs)) return true;
  return ts >= startTs && ts <= endTs;
}

function toMonthDate(value) {
  if (!value) {
    return { key: 'unknown', label: 'Unknown Period', sortValue: 0 };
  }
  const parsed = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return { key: String(value), label: String(value), sortValue: 0 };
  }
  const monthKey = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-01`;
  return {
    key: monthKey,
    label: formatPeriodLabel('month', monthKey),
    sortValue: parsed.getTime(),
  };
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
  // Try native parse first (covers ISO strings with time)
  let date = new Date(value);
  if (Number.isNaN(date.getTime()) && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date = new Date(`${value}T00:00:00`);
  }
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}



