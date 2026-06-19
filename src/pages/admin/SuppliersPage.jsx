import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus, Pencil, Eye, EyeOff, Trash2, Loader2, Search, Truck, Mail, Phone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import ContractsList from '../../components/admin/ContractsList.jsx';

export default function SuppliersPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'contracts' ? 'contracts' : 'suppliers';
  const setTab = (t) => setParams(t === 'contracts' ? { tab: 'contracts' } : {}, { replace: true });

  return (
    <div className="max-w-6xl">
      <div className="mb-5">
        <h1 className="text-2xl font-display font-bold mb-1">Suppliers &amp; Contract</h1>
        <p className="text-sm text-ink-muted">Manage partners and the B2B contracts between you and them.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        <TabBtn active={tab === 'suppliers'} onClick={() => setTab('suppliers')}>Suppliers</TabBtn>
        <TabBtn active={tab === 'contracts'} onClick={() => setTab('contracts')}>Contracts</TabBtn>
      </div>

      {tab === 'suppliers' ? <SupplierListPanel /> : <ContractsList />}
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2.5 text-sm font-semibold -mb-px border-b-2 transition ${
        active ? 'border-brand text-brand' : 'border-transparent text-ink-muted hover:text-ink'
      }`}>
      {children}
    </button>
  );
}

function SupplierListPanel() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/suppliers');
      setItems(res.data?.data?.items || []);
    } catch {
      toast.error('Could not load suppliers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (id) => {
    try { await api.patch(`/suppliers/${id}/toggle`); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };
  const remove = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? Linked experiences will be detached (not deleted).`)) return;
    try { const res = await api.delete(`/suppliers/${id}`); toast.success(res.data?.message || 'Deleted'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const filtered = items.filter((s) => {
    if (!q.trim()) return true;
    const t = q.trim().toLowerCase();
    return s.companyName?.toLowerCase().includes(t) || s.supplierName?.toLowerCase().includes(t) || s.email?.toLowerCase().includes(t);
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search company, name, email…"
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none" />
        </div>
        <Link to="/admin/suppliers/new" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand text-ink font-semibold hover:brightness-105">
          <Plus size={18} /> New supplier
        </Link>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-soft p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
          <div className="inline-flex w-14 h-14 rounded-full bg-brand/10 text-brand items-center justify-center mb-4"><Truck size={26} /></div>
          <h2 className="font-semibold text-lg">No suppliers yet</h2>
          <p className="text-sm text-ink-muted mt-1">Add your first partner / vendor.</p>
          <Link to="/admin/suppliers/new" className="inline-block mt-5 px-5 py-2.5 rounded-lg bg-brand text-ink font-semibold">New supplier</Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
          <div className="hidden md:grid grid-cols-12 px-5 py-3 bg-surface-alt text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            <div className="col-span-5">Company</div>
            <div className="col-span-4">Contact</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          <ul className="divide-y divide-slate-100">
            {filtered.map((s) => (
              <li key={s.id} className="grid grid-cols-12 gap-2 px-4 sm:px-5 py-3.5 items-center">
                <div className="col-span-12 md:col-span-5 min-w-0 flex items-center gap-3">
                  {s.image ? (
                    <img src={fileUrl(s.image)} alt="" className="w-10 h-10 rounded-lg object-cover border" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-surface-alt flex items-center justify-center text-ink-muted"><Truck size={18} /></div>
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-ink truncate flex items-center gap-2">
                      {s.companyName}
                      {!s.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">Disabled</span>}
                    </div>
                    {s.supplierName && <div className="text-[11px] text-ink-muted truncate">{s.supplierName}</div>}
                  </div>
                </div>
                <div className="col-span-6 md:col-span-4 text-sm text-ink-muted min-w-0">
                  {s.email && <div className="truncate inline-flex items-center gap-1"><Mail size={12} /> {s.email}</div>}
                  {s.phone && <div className="truncate inline-flex items-center gap-1"><Phone size={12} /> {s.phone}</div>}
                  {!s.email && !s.phone && '—'}
                </div>
                <div className="col-span-3 md:col-span-1">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {s.isActive ? 'Active' : 'Off'}
                  </span>
                </div>
                <div className="col-span-9 md:col-span-2 flex items-center justify-end gap-1">
                  <IconBtn title="Edit" onClick={() => navigate(`/admin/suppliers/${s.id}/edit`)}><Pencil size={15} /></IconBtn>
                  <IconBtn title={s.isActive ? 'Disable' : 'Enable'} onClick={() => toggle(s.id)}>{s.isActive ? <EyeOff size={15} /> : <Eye size={15} />}</IconBtn>
                  <IconBtn title="Delete" danger onClick={() => remove(s.id, s.companyName)}><Trash2 size={15} /></IconBtn>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function IconBtn({ title, onClick, children, danger }) {
  return (
    <button type="button" title={title} onClick={onClick}
      className={`p-2 rounded-lg transition ${danger ? 'text-rose-500 hover:bg-rose-50' : 'text-ink-muted hover:bg-surface-alt hover:text-brand'}`}>
      {children}
    </button>
  );
}
