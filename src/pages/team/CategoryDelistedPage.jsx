import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Ban } from 'lucide-react';
import api from '../../services/api';
import CategoryStatusDetailModal from './CategoryStatusDetailModal.jsx';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

// Listings taken down in this CM's categories — with the reason and, on click,
// the full pipeline trail (who objected, what QCOPS said, every message).
export default function CategoryDelistedPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState(null);

  useEffect(() => {
    api.get('/team/category/delisted')
      .then(({ data }) => setItems(data?.data?.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>;

  return (
    <div className="max-w-4xl">
      <Link to="/team/category" className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-brand mb-3"><ArrowLeft size={16} /> Category Overview</Link>
      <h1 className="text-2xl font-display font-bold mb-1">Delisted</h1>
      <p className="text-sm text-ink-muted mb-4">Listings that came down — {items.length} in your categories. Click one for the full story.</p>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center text-ink-muted">Nothing delisted in your categories.</div>
      ) : (
        <div className="space-y-2.5">
          {items.map((i) => (
            <button key={i.id} onClick={() => setDetailId(i.id)}
              className="w-full bg-white rounded-2xl shadow-soft p-4 flex items-start gap-3 text-left hover:shadow-lg hover:-translate-y-0.5 transition">
              <span className="inline-flex w-10 h-10 rounded-xl bg-slate-100 text-slate-500 items-center justify-center shrink-0"><Ban size={18} /></span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-ink truncate">{i.name}</div>
                <div className="text-[11px] text-ink-muted truncate">{i.provider} · {i.providerKind} · delisted {fmtDate(i.delistedAt)}</div>
                {i.reason && <div className="text-sm text-rose-700 bg-rose-50 rounded-lg px-3 py-1.5 mt-2">{i.reason}</div>}
              </div>
            </button>
          ))}
        </div>
      )}

      {detailId && <CategoryStatusDetailModal id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}
