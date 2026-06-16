import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Star, Check, X as XIcon, Trash2, Search, Mail,
  MessageSquare, ExternalLink, Clock,
  Package as PackageIcon, CalendarDays, Hotel as HotelIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx';

const ENTITY_TABS = [
  { value: 'package', label: 'Packages',  icon: PackageIcon },
  { value: 'event',   label: 'Events',    icon: CalendarDays },
  { value: 'hotel',   label: 'Hotels',    icon: HotelIcon },
];

const STATUS_TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'all', label: 'All' },
];

export default function ReviewsPage() {
  const [entityType, setEntityType] = useState('package');
  const [status, setStatus] = useState('pending');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [pendingByType, setPendingByType] = useState({ package: 0, event: 0, hotel: 0 });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/reviews/admin/list', {
        params: {
          entityType,
          status,
          search: search || undefined,
          page,
          limit: 20,
        },
      });
      setItems(res.data.data.items);
      setPendingByType(res.data.data.pendingByType || { package: 0, event: 0, hotel: 0 });
      setPagination(res.data.data.pagination);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [entityType, status, search]);

  useEffect(() => {
    load(1);
  }, [load]);

  const toggle = async (review) => {
    if (togglingId) return; // guard against rapid double-clicks
    setTogglingId(review.id);
    // Compute the desired state up-front and send it explicitly so the call
    // is idempotent — any duplicate fire from the click handler or StrictMode
    // produces the same end state instead of flipping the value back.
    const desired = !review.isApproved;
    try {
      const res = await api.patch(`/reviews/${review.id}/approve`, { approved: desired });
      const updated = res.data?.data?.review;
      toast.success(updated?.isApproved ? 'Approved' : 'Unapproved');
      load(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setTogglingId(null);
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/reviews/${deleteId}`);
      toast.success('Review deleted');
      setDeleteId(null);
      load(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const totalPending = Object.values(pendingByType).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-3">
            Reviews
            {totalPending > 0 && (
              <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full">
                <Clock size={12} /> {totalPending} pending
              </span>
            )}
          </h1>
          <p className="text-ink-muted text-sm">
            Moderate guest reviews across Packages, Events and Hotels. Approving auto-updates the entity's rating &amp; review count.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" size={16} />
          <input
            className="input pl-9"
            placeholder="Search by name, title or comment…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Entity-type tabs — packages / events / hotels */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {ENTITY_TABS.map((t) => {
          const Icon = t.icon;
          const active = entityType === t.value;
          const pending = pendingByType[t.value] || 0;
          return (
            <button
              key={t.value}
              onClick={() => setEntityType(t.value)}
              className={`px-4 py-3 rounded-xl border-2 text-left transition flex items-center gap-3 ${
                active
                  ? 'border-brand bg-brand/5 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${active ? 'bg-brand text-white' : 'bg-slate-100 text-ink-muted'}`}>
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`font-semibold ${active ? 'text-brand' : 'text-ink'}`}>{t.label}</div>
                <div className="text-xs text-ink-muted">
                  {pending > 0 ? `${pending} pending` : 'All caught up'}
                </div>
              </div>
              {pending > 0 && (
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                  {pending}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Status tabs — pending / approved / all */}
      <div className="flex items-center gap-2 mb-6 border-b">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setStatus(t.value)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
              status === t.value
                ? 'border-brand text-brand'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center">
          <MessageSquare size={40} className="mx-auto text-ink-muted mb-3" />
          <p className="text-ink-muted">
            {status === 'pending'
              ? `No ${entityType} reviews waiting for approval. Nice!`
              : `No ${entityType} reviews yet.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <ReviewRow
              key={r.id}
              review={r}
              onToggle={toggle}
              onDelete={() => setDeleteId(r.id)}
              busy={togglingId === r.id}
            />
          ))}
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <button
            disabled={pagination.page <= 1}
            onClick={() => load(pagination.page - 1)}
            className="btn-outline text-sm disabled:opacity-50"
          >Previous</button>
          <span className="text-sm">
            Page <strong>{pagination.page}</strong> / {pagination.pages}
          </span>
          <button
            disabled={pagination.page >= pagination.pages}
            onClick={() => load(pagination.page + 1)}
            className="btn-outline text-sm disabled:opacity-50"
          >Next</button>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete review?"
        message="This permanently removes the review. If it was approved, the entity's rating will be recomputed."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
}

function ReviewRow({ review: r, onToggle, onDelete, busy }) {
  const entity = r.entity;
  return (
    <div className="card p-5 flex flex-col md:flex-row gap-4">
      {/* Entity thumb */}
      <div className="shrink-0 w-full md:w-32 h-24 rounded-lg overflow-hidden bg-slate-100 relative">
        {entity?.image ? (
          <img
            src={fileUrl(entity.image)}
            alt={entity.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-muted">
            <MessageSquare size={20} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            {entity ? (
              <Link
                to={`${entity.publicPath}/${entity.slug}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-display font-semibold hover:text-brand inline-flex items-center gap-1"
              >
                {entity.name}
                <ExternalLink size={12} />
              </Link>
            ) : (
              <span className="text-sm text-ink-muted italic">
                {r.entityType[0].toUpperCase() + r.entityType.slice(1)} deleted
              </span>
            )}
            <div className="flex items-center gap-3 text-xs text-ink-muted mt-0.5 flex-wrap">
              <span className="text-[10px] uppercase tracking-widest font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                {r.entityType}
              </span>
              <span className="font-medium text-ink">{r.name}</span>
              {r.email && (
                <span className="inline-flex items-center gap-1">
                  <Mail size={12} /> {r.email}
                </span>
              )}
              <span>· {new Date(r.createdAt).toLocaleString()}</span>
            </div>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-1 rounded-full ${
              r.isApproved
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {r.isApproved ? 'APPROVED' : 'PENDING'}
          </span>
        </div>

        {r.rating && (
          <div className="flex items-center gap-0.5 text-amber-500 mt-2">
            {Array.from({ length: r.rating }).map((_, i) => (
              <Star key={i} size={14} className="fill-current" />
            ))}
          </div>
        )}

        {r.title && <h4 className="font-semibold mt-2 text-sm">{r.title}</h4>}
        {r.comment && (
          <p className="text-sm text-ink-muted mt-1 whitespace-pre-line">{r.comment}</p>
        )}

        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t">
          <button
            onClick={() => onToggle(r)}
            disabled={busy}
            className={
              `${r.isApproved
                ? 'btn-ghost text-xs'
                : 'btn bg-emerald-600 text-white hover:bg-emerald-700 text-xs px-3 py-1.5'
              } disabled:opacity-60 disabled:cursor-wait`
            }
          >
            {r.isApproved ? <XIcon size={14} /> : <Check size={14} />}
            {busy ? '…' : (r.isApproved ? 'Unapprove' : 'Approve')}
          </button>
          <button
            onClick={onDelete}
            className="btn-ghost text-xs text-red-600 hover:bg-red-50"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}
