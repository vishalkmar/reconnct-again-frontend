import { useCallback, useEffect, useRef, useState } from 'react';
import publicApi from '../services/publicApi';

/*
  Tiny fetch-state hook for the public landing pages:
    const { data, loading, error, reload } = useAsync(() => publicApi.taxonomy(), []);
  Stale responses (deps changed mid-flight) are dropped.
*/
export function useAsync(fn, deps = [], { skip = false } = {}) {
  const [state, setState] = useState({ data: null, loading: !skip, error: '' });
  const seq = useRef(0);

  const run = useCallback(() => {
    if (skip) { setState({ data: null, loading: false, error: '' }); return; }
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: '' }));
    Promise.resolve()
      .then(fn)
      .then((data) => { if (id === seq.current) setState({ data, loading: false, error: '' }); })
      .catch((e) => {
        if (id === seq.current) {
          setState({ data: null, loading: false, error: e?.response?.data?.message || e?.message || 'Something went wrong' });
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, ...deps]);

  useEffect(() => { run(); }, [run]);
  return { ...state, reload: run };
}

// Taxonomy is the same for every page — fetch once per session and share.
let taxonomyCache = null;
let taxonomyInflight = null;
export function useTaxonomy() {
  // `loaded` lets sections show a skeleton (not nothing) until the first
  // response, so content below doesn't jump when the taxonomy arrives.
  const [tax, setTax] = useState(taxonomyCache ? { ...taxonomyCache, loaded: true } : { categories: [], audiences: [], loaded: false });
  useEffect(() => {
    if (taxonomyCache) return undefined;
    let alive = true;
    taxonomyInflight = taxonomyInflight || publicApi.taxonomy().then((d) => {
      taxonomyCache = { categories: d?.categories || [], audiences: d?.audiences || [] };
      return taxonomyCache;
    }).catch((e) => { taxonomyInflight = null; throw e; });
    taxonomyInflight.then((t) => { if (alive) setTax({ ...t, loaded: true }); })
      .catch(() => { if (alive) setTax((x) => ({ ...x, loaded: true })); });
    return () => { alive = false; };
  }, []);
  return tax;
}

export { publicApi };
