import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2, Layers, Truck, ClipboardCheck, Star, Wallet, Rocket, UserMinus, Ban, HeartHandshake,
} from 'lucide-react';
import api from '../../services/api';

/*
  Category Manager landing. Everything here is already scoped server-side to the
  categories this manager owns (see the /team/category/* controller). The eight
  deep modules each get their own page; this overview is the at-a-glance board
  plus the doorways into them.
*/
const MODULES = [
  { to: '/team/category/suppliers', label: 'Suppliers', sub: 'Everyone listing in your categories', icon: Truck },
  { to: '/team/category/status', label: 'Experience Status', sub: 'Every listing’s phase in the pipeline', icon: ClipboardCheck },
  { to: '/team/category/reviews', label: 'Ratings & Reviews', sub: 'What guests are saying', icon: Star },
  { to: '/team/category/revenue', label: 'Revenue', sub: 'Earnings, bookings & trends', icon: Wallet },
  { to: '/team/category/onboardings', label: 'Live Onboardings', sub: 'Everything live right now', icon: Rocket },
  { to: '/team/category/churn', label: 'Churn', sub: 'Suppliers who’ve dropped off', icon: UserMinus },
  { to: '/team/category/delisted', label: 'Delisted', sub: 'Why listings came down', icon: Ban },
  { to: '/team/category/winback', label: 'Win-Back', sub: 'Bring them back (coming soon)', icon: HeartHandshake },
];

export default function CategoryOverviewPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/team/category/summary')
      .then(({ data: d }) => setData(d?.data || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>;

  const cats = data?.categories || [];
  const s = data?.stats || {};

  return (
    <div className="max-w-6xl">
      <div className="mb-5">
        <h1 className="text-2xl font-display font-bold mb-1">Category Overview</h1>
        <p className="text-sm text-ink-muted">Everything in the broad categories you manage — suppliers, listings, revenue and reviews, all in one place.</p>
      </div>

      {/* Assigned categories */}
      <div className="bg-white rounded-2xl shadow-soft p-5 mb-5">
        <div className="flex items-center gap-2 mb-3 text-ink-muted text-xs font-bold uppercase tracking-wide"><Layers size={14} /> Your categories</div>
        {cats.length === 0 ? (
          <p className="text-sm text-ink-muted">No categories assigned to you yet — an admin assigns them in Team Management.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => (
              <span key={c.id} className="text-sm font-semibold px-3 py-1.5 rounded-full bg-brand/10 text-brand-dark">{c.name}</span>
            ))}
          </div>
        )}
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat label="Experiences" value={s.experiences ?? 0} />
        <Stat label="Suppliers" value={s.suppliers ?? 0} />
        <Stat label="Live" value={s.live ?? 0} tone="ok" />
        <Stat label="In review" value={s.inReview ?? 0} tone="warn" />
        <Stat label="Rejected" value={s.rejected ?? 0} tone="bad" />
        <Stat label="Delisted" value={s.delisted ?? 0} tone="bad" />
        <Stat label="Categories" value={s.categories ?? 0} />
      </div>

      {/* Module doorways */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {MODULES.map((m) => (
          <Link key={m.to} to={m.to}
            className="bg-white rounded-2xl shadow-soft p-4 flex items-start gap-3 hover:shadow-lg hover:-translate-y-0.5 transition">
            <span className="inline-flex w-10 h-10 rounded-xl bg-brand/10 text-brand-dark items-center justify-center shrink-0"><m.icon size={20} /></span>
            <span className="min-w-0">
              <span className="block font-semibold text-ink">{m.label}</span>
              <span className="block text-xs text-ink-muted">{m.sub}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }) {
  const c = tone === 'ok' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : tone === 'bad' ? 'text-rose-600' : 'text-ink';
  return (
    <div className="bg-white rounded-2xl shadow-soft p-4 text-center">
      <div className={`text-2xl font-display font-bold ${c}`}>{value}</div>
      <div className="text-[11px] text-ink-muted mt-1">{label}</div>
    </div>
  );
}
