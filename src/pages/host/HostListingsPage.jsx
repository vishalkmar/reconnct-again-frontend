import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, PlusCircle, Pencil, Trash2, MapPin, Clock, ImageOff, CalendarCheck, Search, X, MessageSquareWarning, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';

const STATUS_BADGE = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-600' },
  pending: { label: 'Pending review', cls: 'bg-amber-100 text-amber-700' },
  changes: { label: 'Objections', cls: 'bg-rose-100 text-rose-700' },
};

// basePath lets the Supplier Portal (Phase 4) reuse this exact page against
// /supplier/listings instead of /host/listings.
export default function HostListingsPage({ basePath = '/host' }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null);
  const [query, setQuery] = useState('');
  const isSupplier = basePath === '/supplier';
  // Suppliers can self-add listings only once they already have a live one.
  const [canAdd, setCanAdd] = useState(!isSupplier);

  const load = () => {
    setLoading(true);
    api.get(`${basePath}/listings`)
      .then(({ data }) => setListings((data.data || data).listings || []))
      .catch(() => toast.error('Could not load your listings'))
      .finally(() => setLoading(false));
    if (isSupplier) {
      api.get(`${basePath}/summary`)
        .then(({ data }) => setCanAdd(!!(data.data || data).canAddListing))
        .catch(() => {});
    }
  };
  useEffect(load, []);

  // Search by name, location or price — client-side, over the host's own
  // (small) listing set.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return listings;
    return listings.filter((l) => (
      (l.title || '').toLowerCase().includes(q)
      || (l.city || '').toLowerCase().includes(q)
      || String(l.price || '').includes(q)
    ));
  }, [listings, query]);

  const remove = async (id) => {
    if (!window.confirm('Delete this listing? This cannot be undone.')) return;
    setRemoving(id);
    try {
      await api.delete(`${basePath}/listings/${id}`);
      setListings((prev) => prev.filter((l) => l.id !== id));
      toast.success('Listing deleted');
    } catch {
      toast.error('Could not delete');
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">My Listings</h1>
          <p className="text-sm text-ink-muted mt-1">Your experiences — drafts, pending review and published.</p>
        </div>
        {canAdd ? (
          <Link to={`${basePath}/listings/new`} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand text-ink font-semibold hover:brightness-105 transition">
            <PlusCircle size={18} /> Create Listing
          </Link>
        ) : (
          <button disabled title="Available once your first experience is live" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-200 text-slate-400 font-semibold cursor-not-allowed">
            <PlusCircle size={18} /> Create Listing
          </button>
        )}
      </div>

      {isSupplier && !canAdd && (
        <div className="mb-5 flex items-start gap-2.5 bg-amber-50 text-amber-800 rounded-xl px-4 py-3 text-sm">
          <PlusCircle size={16} className="mt-0.5 shrink-0" />
          You can add your own listings once your first experience is <strong>live</strong> on the platform. Your account manager onboards the first one — after that, this unlocks.
        </div>
      )}

      {listings.length > 0 && (
        <div className="relative mb-5 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, location or price…"
            className="w-full pl-10 pr-9 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink" aria-label="Clear search">
              <X size={15} />
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20 text-slate-400"><Loader2 className="animate-spin" size={24} /></div>
      ) : listings.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-alt mx-auto flex items-center justify-center mb-3">
            <PlusCircle size={26} className="text-brand" />
          </div>
          <h3 className="font-semibold text-ink">No listings yet</h3>
          <p className="text-sm text-ink-muted mt-1 mb-4">{isSupplier && !canAdd ? 'Your account manager will onboard your first experience. Once it’s live, you can add more here.' : 'Create your first experience to start hosting.'}</p>
          {(!isSupplier || canAdd) && (
          <Link to={`${basePath}/listings/new`} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand text-ink font-semibold hover:brightness-105 transition">
            <PlusCircle size={18} /> Create Listing
          </Link>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-10 text-center text-ink-muted">
          No listings match "{query}".
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((l) => {
            const objectionCount = l.review?.objection || 0;
            const hasObjections = l.status === 'changes' || objectionCount > 0;
            const badge = l.isPublished
              ? { label: 'Published', cls: 'bg-emerald-100 text-emerald-700' }
              : hasObjections ? STATUS_BADGE.changes : (STATUS_BADGE[l.status] || STATUS_BADGE.draft);
            return (
              <div key={l.id} className="bg-white rounded-2xl shadow-soft overflow-hidden flex flex-col border border-transparent hover:border-brand/15 hover:shadow-lg transition-all">
                <div className="relative h-40 bg-surface-alt">
                  {l.image ? (
                    <img src={fileUrl(l.image)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageOff size={28} /></div>
                  )}
                  <span className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full ${badge.cls}`}>{badge.label}</span>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-semibold text-ink line-clamp-1">{l.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-ink-muted mt-1.5">
                    {l.city && <span className="inline-flex items-center gap-1"><MapPin size={12} /> {l.city}</span>}
                    {l.durationLabel && <span className="inline-flex items-center gap-1"><Clock size={12} /> {l.durationLabel}</span>}
                  </div>
                  <div className="mt-2 text-brand-dark font-bold">
                    {l.price ? `₹${Number(l.price).toLocaleString('en-IN')}` : '—'}<span className="text-xs font-normal text-ink-muted"> / {l.priceUnit}</span>
                  </div>

                  {hasObjections && (
                    <Link to={`${basePath}/listings/${l.id}/resolve`}
                      className="mt-3 flex items-center gap-2 bg-rose-50 hover:bg-rose-100 transition rounded-xl px-3 py-2.5 text-sm">
                      <MessageSquareWarning size={16} className="text-rose-600 shrink-0" />
                      <span className="flex-1 min-w-0 text-rose-800 font-semibold truncate">
                        {objectionCount > 0 ? `${objectionCount} objection${objectionCount > 1 ? 's' : ''} to fix` : 'Center Ops requested changes'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-rose-700 font-semibold shrink-0"><Send size={13} /> Resolve</span>
                    </Link>
                  )}

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                    <Link to={`${basePath}/listings/${l.id}/edit`} className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium hover:bg-surface-alt transition">
                      <Pencil size={14} /> Edit
                    </Link>
                    <Link to={`${basePath}/listings/${l.id}/bookings`} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-brand text-ink text-sm font-bold hover:brightness-105 transition">
                      <CalendarCheck size={15} /> See Booking
                    </Link>
                    <button onClick={() => remove(l.id)} disabled={removing === l.id} className="inline-flex items-center justify-center px-3 py-2.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition disabled:opacity-50" title="Delete">
                      {removing === l.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
