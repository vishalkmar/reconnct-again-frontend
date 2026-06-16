import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Pencil, Check, X, Trash2, Eye, EyeOff, Loader2, Tag, Layers, ListTree,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const TABS = [
  { key: 'audiences', label: 'Audiences', icon: Tag },
  { key: 'categories', label: 'Broad Categories', icon: Layers },
  { key: 'types', label: 'Types', icon: ListTree },
];

export default function ExperienceSetupPage() {
  const [tab, setTab] = useState('audiences');
  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold mb-1">Experience Setup</h1>
        <p className="text-sm text-ink-muted">Manage the audiences, broad categories and types used across every activity &amp; event. These also power the inline pickers in the form.</p>
      </div>

      <div className="flex gap-2 mb-5">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition ${
              tab === t.key ? 'bg-brand text-ink border-brand shadow-soft' : 'bg-white border-gray-200 text-ink-muted hover:text-brand'
            }`}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'audiences' && <FlatManager endpoint="/experience-taxonomy/audiences" label="Audience" />}
      {tab === 'categories' && <FlatManager endpoint="/experience-taxonomy/categories" label="Category" />}
      {tab === 'types' && <TypesManager />}
    </div>
  );
}

// ── Generic manager for a flat taxonomy (audiences / categories) ────────────
function FlatManager({ endpoint, label }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(endpoint, { params: { all: 'true' } });
      setItems(res.data?.data?.items || []);
    } catch { toast.error('Could not load'); } finally { setLoading(false); }
  }, [endpoint]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try { await api.post(endpoint, { name: newName.trim() }); setNewName(''); toast.success(`${label} added`); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); } finally { setAdding(false); }
  };

  return (
    <div className="bg-white rounded-2xl shadow-soft p-5">
      <div className="flex gap-2 mb-4">
        <input value={newName} onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder={`Add a ${label.toLowerCase()}…`}
          className="input flex-1" />
        <button onClick={add} disabled={adding} className="inline-flex items-center gap-2 px-4 rounded-lg bg-brand text-ink font-semibold disabled:opacity-60">
          {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Add
        </button>
      </div>
      {loading ? (
        <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((it) => (
            <Row key={it.id} item={it} endpoint={endpoint} label={label} onChange={load} />
          ))}
          {items.length === 0 && <li className="py-8 text-center text-sm text-ink-muted">Nothing yet.</li>}
        </ul>
      )}
    </div>
  );
}

function Row({ item, endpoint, label, onChange }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try { await api.put(`${endpoint}/${item.id}`, { name: name.trim() }); setEditing(false); onChange(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); } finally { setBusy(false); }
  };
  const toggle = async () => { try { await api.patch(`${endpoint}/${item.id}/toggle`); onChange(); } catch { toast.error('Failed'); } };
  const remove = async () => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    try { await api.delete(`${endpoint}/${item.id}`); toast.success('Deleted'); onChange(); } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  return (
    <li className="py-2.5 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        {editing ? (
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
            className="input py-1.5" />
        ) : (
          <span className={`text-sm font-medium ${item.isActive ? 'text-ink' : 'text-slate-400 line-through'}`}>
            {item.icon ? `${item.icon} ` : ''}{item.name}
            {item.isCustom && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-brand/10 text-brand">custom</span>}
          </span>
        )}
      </div>
      {editing ? (
        <>
          <IconBtn onClick={save} busy={busy}><Check size={15} className="text-emerald-600" /></IconBtn>
          <IconBtn onClick={() => { setEditing(false); setName(item.name); }}><X size={15} /></IconBtn>
        </>
      ) : (
        <>
          <IconBtn onClick={() => setEditing(true)}><Pencil size={14} /></IconBtn>
          <IconBtn onClick={toggle}>{item.isActive ? <EyeOff size={14} /> : <Eye size={14} />}</IconBtn>
          <IconBtn onClick={remove} danger><Trash2 size={14} /></IconBtn>
        </>
      )}
    </li>
  );
}

// ── Types manager — scoped to a selected category ───────────────────────────
function TypesManager() {
  const [cats, setCats] = useState([]);
  const [catId, setCatId] = useState('');
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api.get('/experience-taxonomy/categories', { params: { all: 'true' } })
      .then((res) => {
        const list = res.data?.data?.items || [];
        setCats(list);
        if (list.length && !catId) setCatId(String(list[0].id));
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTypes = useCallback(async (id) => {
    if (!id) { setTypes([]); return; }
    setLoading(true);
    try {
      const res = await api.get('/experience-taxonomy/types', { params: { categoryId: id, all: 'true' } });
      setTypes(res.data?.data?.items || []);
    } catch { toast.error('Could not load types'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTypes(catId); }, [catId, loadTypes]);

  const add = async () => {
    if (!newName.trim() || !catId) return;
    setAdding(true);
    try { await api.post('/experience-taxonomy/types', { name: newName.trim(), categoryId: catId }); setNewName(''); toast.success('Type added'); loadTypes(catId); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); } finally { setAdding(false); }
  };

  return (
    <div className="bg-white rounded-2xl shadow-soft p-5">
      <label className="label">Category</label>
      <select className="input mb-4" value={catId} onChange={(e) => setCatId(e.target.value)}>
        {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      <div className="flex gap-2 mb-4">
        <input value={newName} onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Add a type to this category…" className="input flex-1" />
        <button onClick={add} disabled={adding || !catId} className="inline-flex items-center gap-2 px-4 rounded-lg bg-brand text-ink font-semibold disabled:opacity-60">
          {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Add
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {types.map((it) => (
            <Row key={it.id} item={it} endpoint="/experience-taxonomy/types" label="Type" onChange={() => loadTypes(catId)} />
          ))}
          {types.length === 0 && <li className="py-8 text-center text-sm text-ink-muted">No types in this category yet.</li>}
        </ul>
      )}
    </div>
  );
}

function IconBtn({ onClick, children, danger, busy }) {
  return (
    <button type="button" onClick={onClick} disabled={busy}
      className={`p-2 rounded-lg transition ${danger ? 'text-rose-500 hover:bg-rose-50' : 'text-ink-muted hover:bg-surface-alt hover:text-brand'}`}>
      {busy ? <Loader2 size={14} className="animate-spin" /> : children}
    </button>
  );
}
