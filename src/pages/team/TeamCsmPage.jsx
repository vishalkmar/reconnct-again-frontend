import { useEffect, useState, useCallback } from 'react';
import { Loader2, HeartHandshake, Mail, Phone, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';

export default function TeamCsmPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/team/my-customers');
      setItems(res.data?.data?.items || []);
    } catch {
      toast.error('Could not load your customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold mb-1">My Customers</h1>
        <p className="text-sm text-ink-muted">Customers assigned to you to follow up with — auto-assigned the moment they hit a failed payment or a cancellation.</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-soft p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
          <div className="inline-flex w-14 h-14 rounded-full bg-brand/10 text-brand items-center justify-center mb-4"><HeartHandshake size={26} /></div>
          <h2 className="font-semibold text-lg">No customers assigned yet</h2>
          <p className="text-sm text-ink-muted mt-1">You&apos;ll show up here automatically once a customer needs a follow-up.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {items.map((u) => (
            <div key={u.id} className="bg-white rounded-2xl shadow-soft p-5">
              <div className="flex items-center gap-3 mb-3">
                {u.avatarUrl ? (
                  <img src={fileUrl(u.avatarUrl)} alt="" className="w-11 h-11 rounded-full object-cover border" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-surface-alt flex items-center justify-center text-ink-muted font-bold">
                    {(u.name || u.email || '?')[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-semibold text-ink truncate">{u.name || 'Traveller'}</div>
                  {u.email && <div className="text-[11px] text-ink-muted truncate">{u.email}</div>}
                </div>
              </div>

              <div className="text-sm text-ink-muted space-y-1 mb-4">
                {u.phone && <div className="flex items-center gap-1.5 truncate"><Phone size={13} /> {u.phone}</div>}
                {u.email && <div className="flex items-center gap-1.5 truncate"><Mail size={13} /> {u.email}</div>}
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
                <Stat value={u.stats.total} label="Bookings" />
                <Stat value={u.stats.failedPayments} label="Failed" tint="text-rose-600" />
                <Stat value={u.stats.cancelled} label="Cancelled" tint="text-slate-500" />
              </div>

              {(u.stats.failedPayments > 0 || u.stats.cancelled > 0) && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-rose-600 font-medium">
                  <AlertCircle size={13} /> Needs a follow-up
                </div>
              )}
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
