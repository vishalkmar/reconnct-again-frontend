import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Loader2, ChevronLeft, ChevronRight, Filter, Star, Trash2, Eye, X,
  MapPin, Calendar, BarChart3, RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import DatePicker from '../../components/common/DatePicker.jsx';
import { fmtDateTime } from '../../components/user/bookingFormatters.js';

const PAGE_SIZES = [25, 50, 100];

const DATE_OPTIONS = [
  { value: '', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'month', label: 'This month' },
  { value: '3months', label: 'Last 3 months' },
  { value: '6months', label: 'Last 6 months' },
  { value: 'year', label: 'This year' },
  { value: 'custom', label: 'Custom range' },
];

export default function AdminReviewsPage() {
  const [filters, setFilters] = useState({ search: '', categoryId: '', audienceId: '', experienceId: '', dateRange: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState({ categories: [], audiences: [], experiences: [] });
  const [viewing, setViewing] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    api.get('/admin/experience-reviews/filter-options')
      .then((res) => setOptions(res.data?.data || {}))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await api.get('/admin/experience-reviews', { params });
      setData(res.data?.data || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load reviews');
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters]);

  useEffect(() => { load(); }, [load]);

  const updateFilter = (key, value) => { setFilters((p) => ({ ...p, [key]: value })); setPage(1); };
  const resetFilters = () => { setFilters({ search: '', categoryId: '', audienceId: '', experienceId: '', dateRange: '', from: '', to: '' }); setPage(1); };
  const hasFilters = Object.values(filters).some(Boolean);

  const remove = async (review) => {
    if (!window.confirm(`Delete this review by ${review.user?.name || 'this user'}? This cannot be undone.`)) return;
    setDeletingId(review.id);
    try {
      const res = await api.delete(`/admin/experience-reviews/${review.id}`);
      toast.success(res.data?.message || 'Review deleted');
      setViewing((v) => (v && v.id === review.id ? null : v));
      load(); // re-fetch from DB so every surface reflects the deletion live
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete review');
    } finally {
      setDeletingId(null);
    }
  };

  const items = data?.items || [];
  const totalPages = data?.pagination?.pages || 1;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold mb-1">Review Management</h1>
          <p className="text-ink-muted text-sm">Every rating &amp; review submitted for a completed experience — live from the database.</p>
        </div>
        <Link
          to="/admin/reviews/analytics"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ink text-white text-sm font-semibold hover:bg-ink/90 transition"
        >
          <BarChart3 size={16} /> View analysis of Review and rating
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-soft p-4 mb-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-muted mb-3">
          <Filter size={14} /> Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="relative lg:col-span-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              placeholder="Search reviewer or review text…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
            />
          </div>
          <select value={filters.categoryId} onChange={(e) => updateFilter('categoryId', e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:border-brand outline-none">
            <option value="">All categories</option>
            {(options.categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filters.audienceId} onChange={(e) => updateFilter('audienceId', e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:border-brand outline-none">
            <option value="">Who is this for — all</option>
            {(options.audiences || []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select value={filters.experienceId} onChange={(e) => updateFilter('experienceId', e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:border-brand outline-none">
            <option value="">All activities</option>
            {(options.experiences || []).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select value={filters.dateRange} onChange={(e) => updateFilter('dateRange', e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:border-brand outline-none">
            {DATE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        {filters.dateRange === 'custom' && (
          <div className="grid grid-cols-2 gap-2 mt-3 max-w-md">
            <DatePicker value={filters.from} onChange={(iso) => updateFilter('from', iso)} placeholder="From" compact size="sm" ariaLabel="From" />
            <DatePicker value={filters.to} min={filters.from || undefined} onChange={(iso) => updateFilter('to', iso)} placeholder="To" compact size="sm" ariaLabel="To" />
          </div>
        )}
        {hasFilters && (
          <div className="mt-3 text-right">
            <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-brand">
              <RotateCcw size={12} /> Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px]">
            <thead className="bg-surface-alt/60 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="text-left px-4 py-3">Reviewer</th>
                <th className="text-left px-4 py-3">Review</th>
                <th className="text-left px-4 py-3">Rating</th>
                <th className="text-left px-4 py-3">Experience</th>
                <th className="text-left px-4 py-3">Activity</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-ink-muted"><Loader2 className="animate-spin inline-block text-brand" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-ink-muted">No reviews match the current filters.</td></tr>
              ) : items.map((r) => (
                <ReviewRow key={r.id} r={r} onView={() => setViewing(r)} onDelete={() => remove(r)} deleting={deletingId === r.id} />
              ))}
            </tbody>
          </table>
        </div>

        {!loading && items.length > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t bg-surface-alt/30 flex-wrap">
            <div className="text-xs text-ink-muted">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, data?.pagination?.total || 0)} of {data?.pagination?.total || 0}
            </div>
            <div className="flex items-center gap-2">
              <select value={limit} onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(1); }} className="px-2 py-1.5 rounded border border-gray-200 text-xs bg-white">
                {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} / page</option>)}
              </select>
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 rounded border border-gray-200 disabled:opacity-50 hover:bg-white"><ChevronLeft size={14} /></button>
              <span className="text-xs font-semibold text-ink">{page} / {totalPages}</span>
              <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1.5 rounded border border-gray-200 disabled:opacity-50 hover:bg-white"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {viewing && (
        <ViewModal review={viewing} onClose={() => setViewing(null)} onDelete={() => remove(viewing)} deleting={deletingId === viewing.id} />
      )}
    </div>
  );
}

function Stars({ n }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={13} className={i <= n ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} />
      ))}
    </span>
  );
}

function ReviewRow({ r, onView, onDelete, deleting }) {
  return (
    <tr className="hover:bg-surface-alt/40 transition">
      <td className="px-4 py-3 align-top">
        <div className="font-semibold text-ink text-sm">{r.user?.name || 'Guest'}</div>
        <div className="text-xs text-ink-muted">{r.user?.email || '—'}</div>
      </td>
      <td className="px-4 py-3 align-top max-w-[260px]">
        <p className="text-sm text-ink line-clamp-2">{r.message || <span className="italic text-ink-muted">No written review</span>}</p>
        <div className="text-[11px] text-ink-muted mt-0.5">{fmtDateTime(r.createdAt)}</div>
      </td>
      <td className="px-4 py-3 align-top"><Stars n={r.rating} /></td>
      <td className="px-4 py-3 align-top">
        <div className="text-sm font-medium text-ink truncate max-w-[180px]">{r.experience?.name || '—'}</div>
        <div className="text-xs text-ink-muted flex items-center gap-1"><MapPin size={11} />{r.experience?.city || r.experience?.location || '—'}</div>
      </td>
      <td className="px-4 py-3 align-top text-xs text-ink-muted">
        <div className="flex items-center gap-1"><Calendar size={11} />{r.activity?.date ? fmtDateTime(r.activity.date) : '—'}</div>
      </td>
      <td className="px-4 py-3 align-top text-right whitespace-nowrap">
        <button onClick={onView} title="View" className="p-1.5 rounded hover:bg-surface-alt text-ink-muted hover:text-brand mr-1"><Eye size={15} /></button>
        <button onClick={onDelete} disabled={deleting} title="Delete" className="p-1.5 rounded hover:bg-rose-50 text-ink-muted hover:text-rose-600 disabled:opacity-50">
          {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
        </button>
      </td>
    </tr>
  );
}

function ViewModal({ review: r, onClose, onDelete, deleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-card max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-display font-bold">Review details</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-surface-alt"><X size={18} /></button>
        </div>

        {r.experience?.image && (
          <img src={fileUrl(r.experience.image)} alt="" className="w-full h-36 object-cover rounded-xl mb-4" />
        )}

        <div className="space-y-3 text-sm">
          <Row label="Reviewer">{r.user?.name || 'Guest'} {r.user?.email && <span className="text-ink-muted">— {r.user.email}</span>}</Row>
          <Row label="Rating"><Stars n={r.rating} /></Row>
          <Row label="Review">{r.message || <span className="italic text-ink-muted">No written review</span>}</Row>
          <Row label="Experience">{r.experience?.name || '—'}</Row>
          <Row label="Location">{r.experience?.location || r.experience?.city || '—'}</Row>
          <Row label="Activity date">{r.activity?.date ? fmtDateTime(r.activity.date) : '—'}{r.activity?.endDate ? ` – ${fmtDateTime(r.activity.endDate)}` : ''}</Row>
          <Row label="Submitted">{fmtDateTime(r.createdAt)}</Row>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onDelete} disabled={deleting} className="px-4 py-2 rounded-lg text-sm font-semibold text-rose-600 border border-rose-200 hover:bg-rose-50 disabled:opacity-50 inline-flex items-center gap-1.5">
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold bg-ink text-white hover:bg-ink/90">Close</button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex gap-3">
      <div className="w-32 shrink-0 text-ink-muted">{label}</div>
      <div className="flex-1 text-ink">{children}</div>
    </div>
  );
}
