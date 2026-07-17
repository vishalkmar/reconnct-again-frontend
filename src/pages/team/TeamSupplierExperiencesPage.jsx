import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Truck, Mail, Phone, Sparkles, ChevronRight, MapPin, Star,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';

const STAGE = {
  published: { label: 'Live', cls: 'bg-emerald-50 text-emerald-700' },
  qc_rejected: { label: 'Rejected', cls: 'bg-rose-50 text-rose-700' },
  approved: { label: 'Content approved · QC', cls: 'bg-amber-50 text-amber-700' },
  qc_assigned: { label: 'QCOPS assigned', cls: 'bg-indigo-50 text-indigo-700' },
  qc_acknowledged: { label: 'QCOPS acknowledged', cls: 'bg-indigo-50 text-indigo-700' },
  qc_onsite: { label: 'QCOPS on-site', cls: 'bg-blue-50 text-blue-700' },
  qc_feedback: { label: 'Awaiting decision', cls: 'bg-indigo-50 text-indigo-700' },
};
const statusBadge = (e) => {
  if (STAGE[e.reviewStage]) return STAGE[e.reviewStage];
  if (e.status === 'pending_review') return { label: 'Pending review', cls: 'bg-blue-50 text-blue-700' };
  if (e.status === 'archived') return { label: 'Rejected', cls: 'bg-rose-50 text-rose-700' };
  if (e.status === 'published') return { label: 'Live', cls: 'bg-emerald-50 text-emerald-700' };
  return { label: 'Draft', cls: 'bg-slate-100 text-slate-500' };
};

export default function TeamSupplierExperiencesPage() {
  const { supplierId } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/team/my-suppliers/${supplierId}/experiences`);
      setSupplier(res.data?.data?.supplier || null);
      setItems(res.data?.data?.items || []);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not load');
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>;

  return (
    <div className="max-w-4xl">
      <button onClick={() => navigate('/team/my-suppliers')} className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-brand mb-5"><ArrowLeft size={16} /> All suppliers</button>

      {supplier && (
        <div className="bg-white rounded-2xl shadow-soft p-5 mb-5 flex items-center gap-4">
          {supplier.image
            ? <img src={fileUrl(supplier.image)} alt="" className="w-14 h-14 rounded-xl object-cover border" />
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

      <h2 className="font-display font-bold text-lg mb-3">Their experiences <span className="text-ink-muted font-normal text-sm">({items.length})</span></h2>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-10 text-center">
          <div className="inline-flex w-14 h-14 rounded-full bg-brand/10 text-brand items-center justify-center mb-3"><Sparkles size={24} /></div>
          <p className="text-sm text-ink-muted">This supplier hasn’t added any experiences yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-soft overflow-hidden divide-y divide-slate-100">
          {items.map((e) => {
            const b = statusBadge(e);
            return (
              <Link key={e.id} to={`/team/experiences/${e.id}/view`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-alt">
                {e.mainImage
                  ? <img src={fileUrl(e.mainImage)} alt="" className="w-11 h-11 rounded-lg object-cover border shrink-0" />
                  : <div className="w-11 h-11 rounded-lg bg-surface-alt flex items-center justify-center text-ink-muted shrink-0"><Sparkles size={16} /></div>}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm text-ink truncate">{e.name}</div>
                  <div className="text-[11px] text-ink-muted truncate flex items-center gap-2">
                    {e.location && <span className="inline-flex items-center gap-1"><MapPin size={11} /> {e.location}</span>}
                    {e.qc?.overallRating && <span className="inline-flex items-center gap-0.5 text-amber-500"><Star size={11} className="fill-amber-400 text-amber-400" /> {e.qc.overallRating}</span>}
                  </div>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${b.cls}`}>{b.label}</span>
                <ChevronRight size={16} className="text-ink-muted shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
