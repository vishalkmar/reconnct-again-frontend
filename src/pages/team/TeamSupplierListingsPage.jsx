import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Truck, Mail, Phone, Sparkles, ChevronRight, MapPin,
  Clock, RefreshCw, Globe, XCircle, Ban,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';

const TABS = [
  { key: 'all', label: 'All', icon: Sparkles },
  { key: 'in_queue', label: 'In Queue', icon: Clock },
  { key: 'under_progress', label: 'Under Progress', icon: RefreshCw },
  { key: 'live', label: 'Live', icon: Globe },
  { key: 'rejected', label: 'Rejected', icon: XCircle },
  { key: 'delisted', label: 'Delisted', icon: Ban },
];
const BADGE = {
  in_queue: ['In review', 'bg-blue-50 text-blue-700'],
  under_progress: ['Under progress', 'bg-amber-50 text-amber-700'],
  live: ['Live', 'bg-emerald-50 text-emerald-700'],
  rejected: ['Rejected', 'bg-rose-50 text-rose-700'],
  delisted: ['Delisted', 'bg-slate-100 text-slate-500'],
};

export default function TeamSupplierListingsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/team/review-stats/my-suppliers/${id}/experiences`);
      setSupplier(res.data?.data?.supplier || null);
      setItems(res.data?.data?.items || []);
      setCounts(res.data?.data?.counts || {});
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => (tab === 'all' ? items : items.filter((i) => i.tab === tab)), [items, tab]);

  if (loading) return <div className="p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>;

  return (
    <div className="max-w-4xl">
      <button onClick={() => navigate('/team/suppliers')} className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-brand mb-5"><ArrowLeft size={16} /> All suppliers</button>

      {supplier && (
        <div className="bg-white rounded-2xl shadow-soft p-5 mb-5 flex items-center gap-4">
          {supplier.image ? <img src={fileUrl(supplier.image)} alt="" className="w-14 h-14 rounded-xl object-cover border" />
            : <div className="w-14 h-14 rounded-xl bg-surface-alt flex items-center justify-center text-ink-muted"><Truck size={22} /></div>}
          <div className="min-w-0">
            <h1 className="text-xl font-display font-bold truncate">{supplier.companyName}</h1>
            {supplier.supplierName && <div className="text-sm text-ink-muted">{supplier.supplierName}</div>}
            <div className="text-xs text-ink-muted flex flex-wrap gap-x-4 mt-0.5">
              {supplier.email && <span className="inline-flex items-center gap-1"><Mail size={12} /> {supplier.email}</span>}
              {supplier.phone && <span className="inline-flex items-center gap-1"><Phone size={12} /> {supplier.phone}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Tab filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition ${tab === t.key ? 'bg-brand text-ink border-brand' : 'border-gray-200 text-ink-muted hover:bg-surface-alt'}`}>
            <t.icon size={14} /> {t.label} <span className="text-[11px] opacity-70">{counts[t.key] || 0}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-10 text-center">
          <div className="inline-flex w-14 h-14 rounded-full bg-brand/10 text-brand items-center justify-center mb-3"><Sparkles size={24} /></div>
          <p className="text-sm text-ink-muted">No listings in this stage.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-soft overflow-hidden divide-y divide-slate-100">
          {filtered.map((e) => {
            const [label, cls] = BADGE[e.tab] || ['—', 'bg-slate-100'];
            return (
              <Link key={e.id} to={`/team/experiences/${e.id}/view`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-alt">
                {e.mainImage ? <img src={fileUrl(e.mainImage)} alt="" className="w-11 h-11 rounded-lg object-cover border shrink-0" />
                  : <div className="w-11 h-11 rounded-lg bg-surface-alt flex items-center justify-center text-ink-muted shrink-0"><Sparkles size={16} /></div>}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm text-ink truncate">{e.name}</div>
                  {e.location && <div className="text-[11px] text-ink-muted truncate inline-flex items-center gap-1"><MapPin size={11} /> {e.location}</div>}
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${cls}`}>{label}</span>
                <ChevronRight size={16} className="text-ink-muted shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
