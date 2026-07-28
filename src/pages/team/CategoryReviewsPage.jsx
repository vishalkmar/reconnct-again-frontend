import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Star, Search } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line,
} from 'recharts';
import api from '../../services/api';

const fmtMonth = (m) => { const [y, mo] = String(m).split('-'); return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][(+mo) - 1] || ''} ${y}`; };
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/*
  Ratings & Reviews for the CM's categories — the same analytics the admin gets,
  scoped to their listings: average, how many, the star distribution, the trend
  over time, per-listing breakdown and every individual review.
*/
export default function CategoryReviewsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api.get('/team/category/reviews')
      .then(({ data: d }) => setData(d?.data || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const sum = data?.summary;
  const distData = useMemo(() => (sum
    ? [5, 4, 3, 2, 1].map((s) => ({ star: `${s}★`, count: sum.distribution[s] || 0 }))
    : []), [sum]);
  const trendData = useMemo(() => (sum ? sum.trend.map((t) => ({ month: fmtMonth(t.month), average: t.average, count: t.count })) : []), [sum]);
  const reviews = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = data?.reviews || [];
    if (!q) return all;
    return all.filter((r) => [r.name, r.experienceName, r.comment, r.title].filter(Boolean).some((v) => v.toLowerCase().includes(q)));
  }, [data, query]);

  if (loading) return <div className="p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>;

  return (
    <div className="max-w-5xl">
      <Link to="/team/category" className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-brand mb-3"><ArrowLeft size={16} /> Category Overview</Link>
      <h1 className="text-2xl font-display font-bold mb-1">Ratings & Reviews</h1>
      <p className="text-sm text-ink-muted mb-4">What guests are saying about listings in your categories.</p>

      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-2xl shadow-soft p-4 text-center">
          <div className="text-3xl font-display font-bold text-amber-500 inline-flex items-center gap-1 justify-center"><Star size={22} className="fill-amber-400 text-amber-400" />{sum?.average ?? 0}</div>
          <div className="text-[11px] text-ink-muted mt-1">Average rating</div>
        </div>
        <div className="bg-white rounded-2xl shadow-soft p-4 text-center">
          <div className="text-3xl font-display font-bold text-ink">{sum?.count ?? 0}</div>
          <div className="text-[11px] text-ink-muted mt-1">Total reviews</div>
        </div>
        <div className="bg-white rounded-2xl shadow-soft p-4 text-center">
          <div className="text-3xl font-display font-bold text-emerald-600">{sum ? (sum.distribution[5] || 0) + (sum.distribution[4] || 0) : 0}</div>
          <div className="text-[11px] text-ink-muted mt-1">4–5 star</div>
        </div>
        <div className="bg-white rounded-2xl shadow-soft p-4 text-center">
          <div className="text-3xl font-display font-bold text-rose-600">{sum ? (sum.distribution[1] || 0) + (sum.distribution[2] || 0) : 0}</div>
          <div className="text-[11px] text-ink-muted mt-1">1–2 star</div>
        </div>
      </div>

      {(sum?.count || 0) === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center text-ink-muted">No reviews yet for your categories.</div>
      ) : (
        <>
          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-2xl shadow-soft p-4">
              <div className="text-sm font-semibold text-ink mb-3">Star distribution</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={distData} layout="vertical" margin={{ left: 4, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="star" tick={{ fontSize: 12 }} width={34} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#F9B402" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-2xl shadow-soft p-4">
              <div className="text-sm font-semibold text-ink mb-3">Average over time</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData} margin={{ left: -18, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="average" stroke="#16A34A" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Per-experience */}
          {(data?.byExperience || []).length > 0 && (
            <div className="bg-white rounded-2xl shadow-soft p-4 mb-4">
              <div className="text-sm font-semibold text-ink mb-3">By listing</div>
              <ul className="divide-y divide-slate-100">
                {data.byExperience.map((x) => (
                  <li key={x.experienceId} className="flex items-center gap-2 py-2">
                    <span className="flex-1 min-w-0 truncate text-sm text-ink">{x.name}</span>
                    <span className="text-[11px] text-ink-muted">{x.count} review{x.count !== 1 ? 's' : ''}</span>
                    <span className="text-sm font-bold text-amber-600 inline-flex items-center gap-0.5"><Star size={12} className="fill-amber-400 text-amber-400" />{x.average}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* All reviews */}
          <div className="relative mb-3 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search reviews…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none" />
          </div>
          <div className="space-y-2.5">
            {reviews.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl shadow-soft p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-ink text-sm">{r.name}</span>
                  <span className="inline-flex items-center gap-0.5 text-amber-600 text-xs">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} size={11} className="fill-amber-400 text-amber-400" />)}</span>
                  {!r.isApproved && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">pending approval</span>}
                  <span className="text-[11px] text-ink-muted ml-auto">{fmtDate(r.createdAt)}</span>
                </div>
                <div className="text-[11px] text-ink-muted mb-1">{r.experienceName}</div>
                {r.title && <div className="text-sm font-semibold text-ink">{r.title}</div>}
                {r.comment && <div className="text-sm text-ink-muted mt-0.5">{r.comment}</div>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
