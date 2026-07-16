import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Loader2, Truck, Mail, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import { useTeamAuth } from '../../context/TeamAuthContext.jsx';

export default function TeamSuppliersPage() {
  const { member } = useTeamAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/suppliers');
      const mine = (res.data?.data?.items || []).filter((s) => s.createdByTeamMemberId === member.id);
      setItems(mine);
    } catch {
      toast.error('Could not load suppliers');
    } finally {
      setLoading(false);
    }
  }, [member.id]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold mb-1">My Suppliers</h1>
          <p className="text-sm text-ink-muted">Vendors you&apos;ve onboarded.</p>
        </div>
        <Link to="new" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand text-ink font-semibold hover:brightness-105">
          <Plus size={18} /> New supplier
        </Link>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-soft p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
          <div className="inline-flex w-14 h-14 rounded-full bg-brand/10 text-brand items-center justify-center mb-4"><Truck size={26} /></div>
          <h2 className="font-semibold text-lg">No suppliers yet</h2>
          <p className="text-sm text-ink-muted mt-1">Onboard your first partner / vendor.</p>
          <Link to="new" className="inline-block mt-5 px-5 py-2.5 rounded-lg bg-brand text-ink font-semibold">New supplier</Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {items.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 sm:px-5 py-3.5">
                {s.image ? (
                  <img src={fileUrl(s.image)} alt="" className="w-10 h-10 rounded-lg object-cover border shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-surface-alt flex items-center justify-center text-ink-muted shrink-0"><Truck size={18} /></div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-ink truncate flex items-center gap-2">
                    {s.companyName}
                    {!s.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">Disabled</span>}
                  </div>
                  {s.supplierName && <div className="text-[11px] text-ink-muted truncate">{s.supplierName}</div>}
                </div>
                <div className="text-sm text-ink-muted min-w-0 hidden sm:block">
                  {s.email && <div className="truncate inline-flex items-center gap-1"><Mail size={12} /> {s.email}</div>}
                  {s.phone && <div className="truncate inline-flex items-center gap-1"><Phone size={12} /> {s.phone}</div>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
