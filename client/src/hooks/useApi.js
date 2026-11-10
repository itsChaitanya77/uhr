import { useCallback, useEffect, useRef, useState } from 'react';
import api, { apiError } from '../api/client';

/** GET helper with loading / error / reload. Pass `skip` to defer the request. */
export function useApi(url, { skip = false } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState(null);
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (skip || !url) return;
    const mine = ++seq.current;
    setLoading(true);
    try {
      const res = await api.get(url);
      if (mine === seq.current) { setData(res.data); setError(null); }
    } catch (e) {
      if (mine === seq.current) setError(apiError(e));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [url, skip]);

  useEffect(() => { load(); return () => { seq.current += 1; }; }, [load]);
  return { data, loading, error, reload: load, setData };
}

/** Wraps a mutation: tracks `saving`, surfaces errors through a toast, returns the response data or null. */
export function useAction(toast) {
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const run = useCallback(async (fn, successMessage) => {
    setSaving(true);
    setFieldErrors({});
    try {
      const res = await fn();
      if (successMessage) toast.success(successMessage);
      return res?.data ?? true;
    } catch (e) {
      const err = apiError(e);
      setFieldErrors(err.fieldErrors);
      toast.error(err.message);
      return null;
    } finally {
      setSaving(false);
    }
  }, [toast]);
  return { run, saving, fieldErrors, setFieldErrors };
}
