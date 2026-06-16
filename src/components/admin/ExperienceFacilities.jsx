import { useEffect, useState } from 'react';
import { Plus, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

/**
 * Facilities picker — toggle chips sourced from the shared Facility taxonomy
 * (same list retreats/hotels use, GET /facilities) plus inline custom add.
 * Stored as a flat array of facility names. Controlled via value + onChange.
 */
export default function ExperienceFacilities({ value = [], onChange }) {
  const selected = Array.isArray(value) ? value : [];
  const [suggestions, setSuggestions] = useState([]);
  const [adding, setAdding] = useState(false);
  const [custom, setCustom] = useState('');

  useEffect(() => {
    api.get('/facilities')
      .then((res) => setSuggestions((res.data?.data?.items || []).map((f) => f.name).filter(Boolean)))
      .catch(() => {});
  }, []);

  const toggle = (name) => {
    onChange(selected.includes(name) ? selected.filter((x) => x !== name) : [...selected, name]);
  };

  const addCustom = () => {
    const n = custom.trim();
    if (!n) return;
    if (selected.some((x) => x.toLowerCase() === n.toLowerCase())) { toast('Already added'); setCustom(''); setAdding(false); return; }
    onChange([...selected, n]);
    setCustom(''); setAdding(false);
  };

  // Merge suggestions + any already-selected custom names not in suggestions.
  const chips = Array.from(new Set([...suggestions, ...selected]));

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((name) => (
        <button key={name} type="button" onClick={() => toggle(name)}
          className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-sm font-medium border transition ${
            selected.includes(name) ? 'bg-brand text-ink border-brand shadow-soft' : 'bg-white text-ink border-gray-200 hover:border-brand/50 hover:text-brand'
          }`}>
          {name}{selected.includes(name) && <Check size={13} className="ml-1" />}
        </button>
      ))}

      {!adding ? (
        <button type="button" onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border border-dashed border-brand/50 text-brand hover:bg-brand/10 transition">
          <Plus size={14} /> Add custom
        </button>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full border border-brand bg-white pl-3 pr-1 py-1">
          <input autoFocus value={custom} onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } if (e.key === 'Escape') setAdding(false); }}
            placeholder="Facility name" className="text-sm outline-none w-32" />
          <button type="button" onClick={addCustom} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-full"><Check size={15} /></button>
          <button type="button" onClick={() => { setAdding(false); setCustom(''); }} className="p-1 text-gray-400 hover:bg-gray-100 rounded-full"><X size={15} /></button>
        </span>
      )}
    </div>
  );
}
