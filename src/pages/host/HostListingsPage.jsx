import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, PlusCircle, Pencil, Trash2, MapPin, Clock, ImageOff, CalendarCheck, Search, X, MessageSquareWarning, Send, Eye, Hourglass, Globe, XCircle, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';

const STATUS_BADGE = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-600' },
  pending: { label: 'Pending review', cls: 'bg-amber-100 text-amber-700' },
  changes: { label: 'Objections', cls: 'bg-rose-100 text-rose-700' },
};

/*
  The owner-facing lifecycle, mirroring the BD's "My Experiences" board. The
  backend hands each listing a `tab` from the same submitterTab() derivation;
  under_progress (QCOPS asked for changes) folds into Under Review, since from
  the owner's side it's still simply "not decided yet".
*/
const TABS = [
  { key: 'in_queue', label: 'Under Review', icon: Hourglass, tone: 'bg-blue-50 text-blue-600' },
  { key: 'live', label: 'Published', icon: Globe, tone: 'bg-emerald-50 text-emerald-600' },
  { key: 'rejected', label: 'Rejected', icon: XCircle, tone: 'bg-rose-50 text-rose-600' },
  { key: 'delisted', label: 'Delisted', icon: Ban, tone: 'bg-slate-100 text-slate-500' },
];
/*
  The backend sends `tab` (from submitterTab), but an older/not-yet-deployed
  API won't — and defaulting a missing value to "Under Review" silently files
  LIVE listings under review, which is worse than being wrong loudly. So this
  falls back to deriving the same buckets from fields the API has always
  returned: isPublished, reviewStatus (the status column) and review.stage.
*/
const deriveTab = (l) => {
  const stage = l.review?.stage || null;
  if (stage === 'delisted') return 'delisted';
  if (l.isPublished || stage === 'live') return 'live';
  if (['rejected', 'qc_rejected'].includes(stage) || (l.reviewStatus === 'archived' && stage !== 'delisted')) return 'rejected';
  return 'in_queue'; // drafts, pending review, objections, QC visit, under progress
};
const tabOf = (l) => {
  const t = l.tab || deriveTab(l);
  return t === 'under_progress' ? 'in_queue' : t;
};

/*
  The free-form Edit wizard is for a plain draft only. Once it's been submitted
  — including while objections are open — the resolve page is the sole way in,
  so fixes always carry a note per section. Same as the BD board.
*/
/* Post-QC changes the platform has asked this supplier to make. Acknowledging
   is a written commitment, not a tick-box — it goes straight back onto the
   submitter's card as the record of what was promised, so the note is required. */
function UpChangesBlock({ listing, basePath, onDone }) {
  const up = listing.upChanges;
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!note.trim()) return toast.error('Please write how you’ll address this');
    setBusy(true);
    try {
      await api.post(`${basePath}/listings/${listing.id}/up-ack`, { note: note.trim() });
      toast.success('Acknowledgement sent');
      setOpen(false); setNote('');
      onDone && onDone();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not send');
    } finally { setBusy(false); }
  };

  return (
    <div className="mt-3 bg-amber-50 rounded-xl p-3 text-sm">
      <div className="text-[11px] font-bold uppercase tracking-wide text-amber-700 mb-1 flex items-center gap-1.5">
        <MessageSquareWarning size={13} /> {up.changeType || ''} changes requested
      </div>
      <p className="text-amber-900">{up.changeDetails || '—'}</p>
      {up.deadline && <p className="text-[11px] text-amber-700 mt-1">Agreed deadline: {up.deadline}</p>}

      {up.ack ? (
        <div className="mt-2 text-[12px] text-emerald-800 bg-white rounded-lg px-3 py-2">
          <span className="font-semibold">You acknowledged:</span> {up.ack.note}
        </div>
      ) : up.needsAck && (
        open ? (
          <div className="mt-2">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-ink">
              How will you address this? <span className="text-rose-500">*</span>
            </label>
            <textarea autoFocus rows={3} value={note} onChange={(e) => setNote(e.target.value)}
              className="mt-1.5 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-brand"
              placeholder="e.g. Washrooms and pool will be deep-cleaned by 25 Jul, photos shared after." />
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-ink-muted hover:bg-white">Cancel</button>
              <button onClick={send} disabled={busy}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60">
                {busy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Send acknowledgement
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setOpen(true)}
            className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700">
            <Send size={13} /> Acknowledge
          </button>
        )
      )}
    </div>
  );
}

const isPlainDraft = (l) => l.reviewStatus === 'draft' && l.status === 'draft' && !l.review?.stage;
const canEditOf = (l) => (typeof l.canEdit === 'boolean' ? l.canEdit : isPlainDraft(l));
const canDeleteOf = (l) => (typeof l.canDelete === 'boolean' ? l.canDelete : isPlainDraft(l));

// basePath lets the Supplier Portal (Phase 4) reuse this exact page against
// /supplier/listings instead of /host/listings.
export default function HostListingsPage({ basePath = '/host' }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('in_queue');
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
  const counts = useMemo(
    () => listings.reduce((a, l) => { const k = tabOf(l); a[k] = (a[k] || 0) + 1; return a; }, {}),
    [listings],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listings.filter((l) => tabOf(l) === tab).filter((l) => !q || (
      (l.title || '').toLowerCase().includes(q)
      || (l.city || '').toLowerCase().includes(q)
      || String(l.price || '').includes(q)
    ));
  }, [listings, query, tab]);

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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`bg-white rounded-2xl shadow-soft p-3.5 flex items-center gap-2.5 text-left transition-all ${tab === t.key ? 'ring-2 ring-brand' : 'hover:shadow-lg hover:-translate-y-0.5'}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${t.tone}`}><t.icon size={17} /></div>
              <div className="min-w-0">
                <div className="text-xl font-display font-bold leading-none">{counts[t.key] || 0}</div>
                <div className="text-[11px] text-ink-muted mt-0.5 truncate">{t.label}</div>
              </div>
            </button>
          ))}
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
          {query
            ? `No listings match "${query}" in ${TABS.find((t) => t.key === tab)?.label}.`
            : `Nothing in ${TABS.find((t) => t.key === tab)?.label}.`}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((l) => {
            const objectionCount = l.review?.objection || 0;
            // Only while the round is actually open. Not `status === 'changes'`
            // (a stale mirror that survives the round) and not a raw objection
            // count (Center Ops marks those up before sending them).
            const hasObjections = l.review?.stage === 'follow_up';
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

                  {l.upChanges && <UpChangesBlock listing={l} basePath={basePath} onDone={load} />}

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

                  {/* Once it's been submitted for review the owner can't edit
                      or delete it — same as the BD board. View details stands
                      in so they can still see exactly what was submitted. */}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                    {canEditOf(l) ? (
                      <Link to={`${basePath}/listings/${l.id}/edit`} className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium hover:bg-surface-alt transition ${l.isPublished ? '' : 'flex-1'}`}>
                        <Pencil size={14} /> Edit
                      </Link>
                    ) : (
                      <Link to={`${basePath}/listings/${l.id}/view`} className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition ${l.isPublished ? 'border hover:bg-surface-alt' : 'flex-1 bg-brand text-ink font-bold hover:brightness-105'}`}>
                        <Eye size={14} /> View
                      </Link>
                    )}
                    {/* Bookings only exist once it's actually live — offering
                        this on a listing still in review just leads to an
                        empty page. */}
                    {l.isPublished && (
                      <Link to={`${basePath}/listings/${l.id}/bookings`} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-brand text-ink text-sm font-bold hover:brightness-105 transition">
                        <CalendarCheck size={15} /> See Booking
                      </Link>
                    )}
                    {canDeleteOf(l) && (
                      <button onClick={() => remove(l.id)} disabled={removing === l.id} className="inline-flex items-center justify-center px-3 py-2.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition disabled:opacity-50" title="Delete">
                        {removing === l.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    )}
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
