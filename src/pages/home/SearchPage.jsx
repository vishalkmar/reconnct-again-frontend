import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, X, Clock, TrendingUp } from 'lucide-react';
import publicApi from '../../services/publicApi';
import { useTaxonomy } from '../../hooks/usePublicApi';
import { useGeo } from '../../context/GeoContext.jsx';
import useDocumentMeta from '../../hooks/useDocumentMeta';
import { iconForCategory } from '../../utils/categoryIcons';
import ExperienceCard from '../../components/landing/cards/ExperienceCard.jsx';
import { ResultsSkeleton } from '../../components/landing/sections/SearchResults.jsx';

const RECENT_KEY = 'rc_recent_searches';
const readRecent = () => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').slice(0, 8); } catch { return []; } };

/*
  /search — the app's Search tab: focused search box, recent searches (this
  device), category shortcuts, and live results as you type.
*/
export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState(readRecent);
  const { categories } = useTaxonomy();
  const { coords } = useGeo();
  const inputRef = useRef(null);
  useDocumentMeta({ title: 'Search · Reconnct', description: 'Search experiences on Reconnct.' });

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const term = q.trim();
    setParams(term ? { q: term } : {}, { replace: true });
    if (!term) { setResults(null); return undefined; }
    let alive = true;
    setBusy(true);
    const t = setTimeout(() => {
      publicApi.listExperiences({ q: term, ...(coords ? { lat: coords.lat, lon: coords.lon } : {}) })
        .then((d) => { if (alive) setResults(d?.items || []); })
        .catch(() => { if (alive) setResults([]); })
        .finally(() => { if (alive) setBusy(false); });
    }, 350);
    return () => { alive = false; clearTimeout(t); };
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const remember = (term) => {
    const t = term.trim();
    if (!t) return;
    const next = [t, ...recent.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 8);
    setRecent(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };
  const clearRecent = () => { setRecent([]); try { localStorage.removeItem(RECENT_KEY); } catch { /* ignore */ } };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
      <form role="search" onSubmit={(e) => { e.preventDefault(); remember(q); inputRef.current?.blur(); }}
        className="flex items-center bg-white rounded-full h-12 pl-4 pr-1.5 shadow-soft border border-rc-border">
        <Search size={17} className="text-rc-ink-faint" />
        <input
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Experiences, destinations…"
          aria-label="Search experiences"
          className="flex-1 min-w-0 bg-transparent px-2.5 text-[15px] focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {q && <button type="button" aria-label="Clear" onClick={() => setQ('')} className="grid place-items-center w-9 h-9 rounded-full text-rc-ink-faint hover:bg-rc-bg"><X size={16} /></button>}
      </form>

      {!q.trim() ? (
        <>
          {recent.length > 0 && (
            <section className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-sans text-sm font-extrabold text-rc-ink">Recent searches</h2>
                <button type="button" onClick={clearRecent} className="text-xs font-bold text-rc-brand">Clear</button>
              </div>
              <ul className="divide-y divide-rc-border bg-white rounded-2xl shadow-soft">
                {recent.map((r) => (
                  <li key={r}>
                    <button type="button" onClick={() => setQ(r)} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left">
                      <Clock size={15} className="text-rc-ink-faint" />{r}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {categories.length > 0 && (
            <section className="mt-6">
              <h2 className="font-sans text-sm font-extrabold text-rc-ink mb-2 flex items-center gap-1.5"><TrendingUp size={15} className="text-rc-brand-dark" />Browse by category</h2>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => {
                  const Icon = iconForCategory(c.name);
                  return (
                    <Link key={c.id} to={`/experiences?categoryIds=${c.id}`} className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full bg-white border border-rc-border text-sm font-semibold text-rc-ink">
                      <Icon size={14} className="text-rc-ink-muted" />{c.name}
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </>
      ) : (
        <section className="mt-5" onClickCapture={() => remember(q)}>
          <p className="text-sm text-rc-ink-muted mb-3" aria-live="polite">{busy ? 'Searching…' : `${(results || []).length} result${(results || []).length === 1 ? '' : 's'}`}</p>
          {busy && !results ? <ResultsSkeleton count={4} /> : (results || []).length ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {results.map((it) => <ExperienceCard key={it.id} item={it} />)}
            </div>
          ) : <p className="text-center text-rc-ink-muted py-10">No experiences match “{q.trim()}”.</p>}
        </section>
      )}
    </div>
  );
}
