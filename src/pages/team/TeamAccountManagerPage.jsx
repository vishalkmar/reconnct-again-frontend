import { useEffect, useState, useCallback } from 'react';
import { Loader2, Users, Truck, Mail, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';

export default function TeamAccountManagerPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/team/my-suppliers');
      setItems(res.data?.data?.items || []);
    } catch {
      toast.error('Could not load your suppliers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold mb-1">My Suppliers</h1>
        <p className="text-sm text-ink-muted">Suppliers assigned to you to guide and monitor — auto-assigned the moment they add their first experience.</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-soft p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
          <div className="inline-flex w-14 h-14 rounded-full bg-brand/10 text-brand items-center justify-center mb-4"><Users size={26} /></div>
          <h2 className="font-semibold text-lg">No suppliers assigned yet</h2>
          <p className="text-sm text-ink-muted mt-1">You&apos;ll show up here automatically once a supplier adds their first experience.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {items.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl shadow-soft p-5">
              <div className="flex items-center gap-3 mb-3">
                {s.image ? (
                  <img src={fileUrl(s.image)} alt="" className="w-11 h-11 rounded-xl object-cover border" />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-surface-alt flex items-center justify-center text-ink-muted"><Truck size={20} /></div>
                )}
                <div className="min-w-0">
                  <div className="font-semibold text-ink truncate">{s.companyName}</div>
                  {s.supplierName && <div className="text-[11px] text-ink-muted truncate">{s.supplierName}</div>}
                </div>
              </div>

              <div className="text-sm text-ink-muted space-y-1 mb-4">
                {s.email && <div className="flex items-center gap-1.5 truncate"><Mail size={13} /> {s.email}</div>}
                {s.phone && <div className="flex items-center gap-1.5 truncate"><Phone size={13} /> {s.phone}</div>}
                {!s.email && !s.phone && <span className="text-slate-300">No contact info yet</span>}
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
                <Stat value={s.stats.total} label="Total" />
                <Stat value={s.stats.pendingReview} label="Pending" tint="text-blue-600" />
                <Stat value={s.stats.published} label="Live" tint="text-emerald-600" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ value, label, tint = 'text-ink' }) {
  return (
    <div className="text-center">
      <div className={`text-lg font-bold ${tint}`}>{value}</div>
      <div className="text-[11px] text-ink-muted">{label}</div>
    </div>
  );
}
