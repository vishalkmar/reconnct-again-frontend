import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus, Pencil, Eye, EyeOff, Trash2, Loader2, Search, Truck, Mail, Phone,
  Users as UsersIcon, CheckCircle2, XCircle, UserCog,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import ContractsList from '../../components/admin/ContractsList.jsx';
import { PERIOD_OPTIONS, rangeForPeriod } from '../../utils/datePresets.js';

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

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

function SupplierListPanel() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [period, setPeriod] = useState('');
  const [statusF, setStatusF] = useState(''); // '' | 'active' | 'disabled' | 'kam'
  const [rev, setRev] = useState({}); // supplierId -> { b2b, b2c }
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

  // Per-supplier B2B/B2C revenue (paid bookings) for the two revenue columns.
  useEffect(() => {
    api.get('/admin/b2b/supplier-revenue')
      .then((res) => {
        const map = {};
        (res.data?.data?.items || []).forEach((r) => { map[r.supplierId] = r; });
        setRev(map);
      })
      .catch(() => {});
  }, []);

  const toggle = async (id) => {
    try { await api.patch(`/suppliers/${id}/toggle`); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };
  const remove = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? Linked experiences will be detached (not deleted).`)) return;
    try { const res = await api.delete(`/suppliers/${id}`); toast.success(res.data?.message || 'Deleted'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const range = period === 'custom' ? { from: '', to: '' } : rangeForPeriod(period);
  const inRange = (s) => {
    if (!range.from && !range.to) return true;
    const d = (s.createdAt || '').slice(0, 10);
    if (!d) return true;
    if (range.from && d < range.from) return false;
    if (range.to && d > range.to) return false;
    return true;
  };
  // Search + date scope drives both the stat cards and the table.
  const base = items.filter((s) => {
    const t = q.trim().toLowerCase();
    const matchQ = !t || s.companyName?.toLowerCase().includes(t) || s.supplierName?.toLowerCase().includes(t) || s.email?.toLowerCase().includes(t);
    return matchQ && inRange(s);
  });
  const activeN = base.filter((s) => s.isActive).length;
  const disabledN = base.length - activeN;
  const kamN = base.filter((s) => s.accountManagerId).length;
  const filtered = base.filter((s) => (
    statusF === 'active' ? s.isActive : statusF === 'disabled' ? !s.isActive : statusF === 'kam' ? s.accountManagerId : true
  ));

  return (
    <div>
      {/* Stat cards — click to filter the list */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <SupStat icon={UsersIcon} label="Suppliers" value={base.length} active={!statusF} onClick={() => setStatusF('')} tint="text-blue-600 bg-blue-50" ring="ring-blue-300" />
        <SupStat icon={CheckCircle2} label="Active" value={activeN} active={statusF === 'active'} onClick={() => setStatusF(statusF === 'active' ? '' : 'active')} tint="text-emerald-600 bg-emerald-50" ring="ring-emerald-300" />
        <SupStat icon={XCircle} label="Disabled" value={disabledN} active={statusF === 'disabled'} onClick={() => setStatusF(statusF === 'disabled' ? '' : 'disabled')} tint="text-rose-600 bg-rose-50" ring="ring-rose-300" />
        <SupStat icon={UserCog} label="With account manager" value={kamN} active={statusF === 'kam'} onClick={() => setStatusF(statusF === 'kam' ? '' : 'kam')} tint="text-purple-600 bg-purple-50" ring="ring-purple-300" />
      </div>

      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search company, name, email…"
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none" />
          </div>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:border-brand outline-none">
            {PERIOD_OPTIONS.filter((o) => o.value !== 'custom').map((o) => <option key={o.value} value={o.value}>{o.value === '' ? 'Joined: all time' : o.label}</option>)}
          </select>
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
            <div className="col-span-4">Company</div>
            <div className="col-span-2">Contact</div>
            <div className="col-span-2 text-right">B2B revenue</div>
            <div className="col-span-2 text-right">B2C revenue</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          <ul className="divide-y divide-slate-100">
            {filtered.map((s) => (
              <li key={s.id} className="grid grid-cols-12 gap-2 px-4 sm:px-5 py-3.5 items-center">
                <div className="col-span-12 md:col-span-4 min-w-0 flex items-center gap-3">
                  {s.image ? (
                    <img src={fileUrl(s.image)} alt="" className="w-10 h-10 rounded-lg object-cover border" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-surface-alt flex items-center justify-center text-ink-muted"><Truck size={18} /></div>
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-ink truncate flex items-center gap-2">
                      {s.companyName}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${s.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{s.isActive ? 'Active' : 'Disabled'}</span>
                    </div>
                    {s.supplierName && <div className="text-[11px] text-ink-muted truncate">{s.supplierName}</div>}
                  </div>
                </div>
                <div className="col-span-6 md:col-span-2 text-sm text-ink-muted min-w-0">
                  {s.email && <div className="truncate inline-flex items-center gap-1"><Mail size={12} /> {s.email}</div>}
                  {s.phone && <div className="truncate inline-flex items-center gap-1"><Phone size={12} /> {s.phone}</div>}
                  {!s.email && !s.phone && '—'}
                </div>
                <div className="col-span-4 md:col-span-2 text-right">
                  <button onClick={() => navigate(`/admin/suppliers/${s.id}/revenue`)} title="View B2B vs B2C bookings"
                    className="font-semibold text-blue-700 hover:underline">{inr(rev[s.id]?.b2b)}</button>
                </div>
                <div className="col-span-4 md:col-span-2 text-right">
                  <button onClick={() => navigate(`/admin/suppliers/${s.id}/revenue`)} title="View B2B vs B2C bookings"
                    className="font-semibold text-emerald-700 hover:underline">{inr(rev[s.id]?.b2c)}</button>
                </div>
                <div className="col-span-4 md:col-span-2 flex items-center justify-end gap-1">
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

function SupStat({ icon: Icon, label, value, active, onClick, tint, ring }) {
  return (
    <button type="button" onClick={onClick}
      className={`bg-white rounded-2xl shadow-soft p-3.5 flex items-center gap-3 text-left transition ring-2 ${active ? ring : 'ring-transparent'} hover:shadow-md`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${tint} shrink-0`}><Icon size={20} /></div>
      <div className="min-w-0">
        <div className="text-xs text-ink-muted truncate">{label}</div>
        <div className="text-xl font-bold text-ink">{value}</div>
      </div>
    </button>
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
