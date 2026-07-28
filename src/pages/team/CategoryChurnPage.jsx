import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ArrowLeft, UserMinus, Truck, Home } from 'lucide-react';
import api from '../../services/api';

/*
  Best-effort churn view — providers who once listed in this CM's categories but
  have nothing live now (all their in-scope listings came down, or their account
  is disabled). The formal churn signal isn't wired yet; this surfaces the
  drop-offs so the module and its win-back emails are ready when it is.
*/
export default function CategoryChurnPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/team/category/churn')
      .then(({ data }) => setItems(data?.data?.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>;

  return (
    <div className="max-w-4xl">
      <Link to="/team/category" className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-brand mb-3"><ArrowLeft size={16} /> Category Overview</Link>
      <h1 className="text-2xl font-display font-bold mb-1">Churn</h1>
      <p className="text-sm text-ink-muted mb-1">Providers who’ve dropped off — nothing live in your categories right now.</p>
      <p className="text-[11px] text-amber-600 mb-4">Best-effort signal — the formal churn model is coming; Win-Back builds on this.</p>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center text-ink-muted">No churned providers — everyone’s still active. 🎉</div>
      ) : (
        <div className="space-y-2.5">
          {items.map((p) => (
            <div key={`${p.kind}-${p.id}`} className="bg-white rounded-2xl shadow-soft p-4 flex items-start gap-3">
              <span className={`inline-flex w-10 h-10 rounded-xl items-center justify-center shrink-0 ${p.kind === 'supplier' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                {p.kind === 'supplier' ? <Truck size={18} /> : <Home size={18} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-ink truncate flex items-center gap-2">
                  {p.name}
                  {!p.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-500">disabled</span>}
                </div>
                <div className="text-[11px] text-ink-muted truncate">{[p.email, p.phone].filter(Boolean).join(' · ') || '—'}</div>
                <div className="text-xs text-ink-muted mt-1">Had {p.total} listing{p.total !== 1 ? 's' : ''} in your categories: {p.listings.slice(0, 3).join(', ')}{p.listings.length > 3 ? '…' : ''}</div>
              </div>
              <UserMinus size={16} className="text-rose-400 shrink-0 mt-1" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
