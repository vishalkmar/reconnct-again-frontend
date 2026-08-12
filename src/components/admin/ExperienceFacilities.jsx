import {
  useEffect, useMemo, useRef, useState,
} from 'react';
import { Check, X, Search, ChevronDown, Plus } from 'lucide-react';
import api from '../../services/api';
import { FACILITY_OPTIONS } from '../../constants/facilities.js';

/**
 * Facilities picker — a searchable multi-select dropdown over a large curated
 * list (constants/facilities.js) merged with the shared Facility taxonomy
 * (GET /facilities) and any custom names already chosen. Stored as a flat array
 * of names. Controlled via value + onChange.
 */
export default function ExperienceFacilities({ value = [], onChange }) {
  const selected = Array.isArray(value) ? value : [];
  const [tax, setTax] = useState([]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    api.get('/facilities')
      .then((res) => setTax((res.data?.data?.items || []).map((f) => f.name).filter(Boolean)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const allOptions = useMemo(
    () => Array.from(new Set([...FACILITY_OPTIONS, ...tax, ...selected])).sort((a, b) => a.localeCompare(b)),
    [tax, selected],
  );
  const term = q.trim().toLowerCase();
  const filtered = useMemo(() => (term ? allOptions.filter((o) => o.toLowerCase().includes(term)) : allOptions), [allOptions, term]);
  const exactExists = allOptions.some((o) => o.toLowerCase() === term);

  const toggle = (name) => onChange(selected.includes(name) ? selected.filter((x) => x !== name) : [...selected, name]);
  const addCustom = () => {
    const n = q.trim();
    if (!n) return;
    if (!allOptions.some((o) => o.toLowerCase() === n.toLowerCase())) onChange([...selected, n]);
    setQ('');
  };

  return (
    <div ref={ref} className="relative">
      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selected.map((name) => (
            <span key={name} className="inline-flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full bg-brand/10 text-ink text-sm font-medium border border-brand/30">
              {name}
              <button type="button" onClick={() => toggle(name)} className="p-0.5 text-ink-muted hover:text-rose-600"><X size={13} /></button>
            </span>
          ))}
        </div>
      )}

      {/* Search control */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (!exactExists) addCustom(); } }}
          placeholder={`Search ${FACILITY_OPTIONS.length}+ facilities, or type to add your own…`}
          className="input pl-9 pr-9"
        />
        <ChevronDown size={16} className={`absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`} onClick={() => setOpen((o) => !o)} />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-72 overflow-y-auto">
          {term && !exactExists && (
            <button type="button" onClick={addCustom} className="w-full text-left px-4 py-2.5 text-sm text-brand font-semibold hover:bg-brand/5 inline-flex items-center gap-1.5">
              <Plus size={14} /> Add “{q.trim()}”
            </button>
          )}
          {filtered.length === 0 && !term ? (
            <div className="px-4 py-3 text-sm text-ink-muted">Start typing to search…</div>
          ) : filtered.map((name) => {
            const on = selected.includes(name);
            return (
              <button key={name} type="button" onClick={() => toggle(name)}
                className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-sm text-left hover:bg-surface-alt ${on ? 'text-ink font-semibold' : 'text-ink'}`}>
                {name}
                {on && <Check size={15} className="text-brand shrink-0" />}
              </button>
            );
          })}
          {filtered.length === 0 && term && exactExists && (
            <div className="px-4 py-3 text-sm text-ink-muted">Already listed.</div>
          )}
        </div>
      )}

      <p className="text-[11px] text-ink-muted mt-1.5">{selected.length} selected · search the list or type a new facility and press Enter.</p>
    </div>
  );
}
