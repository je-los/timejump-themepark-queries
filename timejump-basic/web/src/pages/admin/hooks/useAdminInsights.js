import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../../auth';

const emptyPayload = { alerts: [], metrics: {}, recentChanges: [] };
let cachedInsights = null;

export function useAdminInsights(pollInterval = 60000) {
  const [data, setData] = useState(() => cachedInsights);
  const [loading, setLoading] = useState(!cachedInsights);
  const [error, setError] = useState('');
  const initializedRef = useRef(false);
  const hasCache = useRef(Boolean(cachedInsights));

  const fetchInsights = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const res = await api('/admin/insights');
      const payload = res?.data || emptyPayload;
      cachedInsights = payload;
      setData(payload);
    } catch (err) {
      if (!silent) {
        setError(err?.message || 'Unable to load admin insights.');
      }
      if (!cachedInsights) {
        setData(emptyPayload);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!initializedRef.current) {
      if (hasCache.current) {
        setLoading(false);
        fetchInsights({ silent: true });
      } else {
        fetchInsights();
      }
      initializedRef.current = true;
    }
    if (pollInterval === null) return undefined;
    const interval = setInterval(() => fetchInsights({ silent: true }), pollInterval);
    return () => clearInterval(interval);
  }, [fetchInsights, pollInterval]);

  const refresh = useCallback(() => fetchInsights({ silent: false }), [fetchInsights]);

  return {
    insights: data || emptyPayload,
    loading,
    error,
    refresh,
  };
}
