import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2, ChevronLeft, CalendarCheck, MapPin, Clock } from 'lucide-react';
import api, { fileUrl } from '../../services/api';

const STATUS_BADGE = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-600' },
  pending: { label: 'Pending review', cls: 'bg-amber-100 text-amber-700' },
};

// Booking status pill (upcoming until the date passes, then completed).
const BOOKING_PILL = {
  upcoming: { label: 'Upcoming', cls: 'bg-brand/10 text-brand-dark' },
  completed: { label: 'Completed', cls: 'bg-slate-100 text-slate-600' },
  cancelled: { label: 'Cancelled', cls: 'bg-rose-100 text-rose-600' },
};

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
];

// A host listing's bookings feed — same upcoming/completed buckets as the
// app. basePath lets the Supplier Portal (Phase 4) reuse this exact page.
export default function HostListingBookingsPage({ basePath = '/host' }) {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    let alive = true;
    api.get(`${basePath}/listings/${id}`)
      .then(({ data }) => { if (alive) setListing((data.data || data).listing); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  const bookings = useMemo(() => listing?.bookings || [], [listing]);
  const counts = useMemo(
    () => TABS.reduce((a, t) => { a[t.key] = t.key === 'all' ? bookings.length : bookings.filter((b) => b.status === t.key).length; return a; }, {}),
    [bookings],
  );
  const shown = useMemo(() => {
    const rows = tab === 'all' ? bookings : bookings.filter((b) => b.status === tab);
    return [...rows].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [bookings, tab]);
  const revenue = useMemo(() => bookings.filter((b) => b.status === 'completed').reduce((n, b) => n + Number(b.amount || 0), 0), [bookings]);

  if (loading) return <div className="flex justify-center py-20 text-slate-400"><Loader2 className="animate-spin" size={24} /></div>;
  if (!listing) return <div className="max-w-3xl"><p className="text-ink-muted">Listing not found.</p><Link to={`${basePath}/listings`} className="text-brand font-semibold">Back to listings</Link></div>;

  const badge = listing.isPublished ? { label: 'Published', cls: 'bg-emerald-100 text-emerald-700' } : (STATUS_BADGE[listing.status] || STATUS_BADGE.draft);

  return (
    <div className="max-w-4xl">
      <Link to={`${basePath}/listings`} className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink mb-4"><ChevronLeft size={16} /> Back to My Listings</Link>

      <div className="bg-white rounded-2xl shadow-soft overflow-hidden mb-6 flex flex-col sm:flex-row">
        <div className="sm:w-56 h-40 bg-surface-alt shrink-0">
          {listing.image ? <img src={fileUrl(listing.image)} alt="" className="w-full h-full object-cover" /> : null}
        </div>
        <div className="p-5 flex-1">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.cls}`}>{badge.label}</span>
          <h1 className="text-xl font-display font-bold mt-2">{listing.title}</h1>
          <div className="flex items-center gap-3 text-sm text-ink-muted mt-1">
            {listing.city && <span className="inline-flex items-center gap-1"><MapPin size={13} /> {listing.city}</span>}
            {listing.durationLabel && <span className="inline-flex items-center gap-1"><Clock size={13} /> {listing.durationLabel}</span>}
          </div>
          <div className="mt-2 text-brand-dark font-bold">{listing.price ? `₹${Number(listing.price).toLocaleString('en-IN')}` : '—'}<span className="text-xs font-normal text-ink-muted"> / {listing.priceUnit}</span></div>
          {revenue > 0 && (
            <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              Earned ₹{revenue.toLocaleString('en-IN')}
            </div>
          )}
        </div>
      </div>

      <h2 className="font-semibold text-ink mb-3 flex items-center gap-2"><CalendarCheck size={18} className="text-brand" /> Bookings</h2>

      {/* Upcoming / Completed tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                active ? 'bg-brand text-white border-brand shadow-soft' : 'border-gray-200 text-ink hover:border-brand/40 hover:text-brand'
              }`}
            >
              {t.label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20' : 'bg-slate-100 text-ink-muted'}`}>{counts[t.key] || 0}</span>
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-10 text-center text-ink-muted">
          {bookings.length === 0
            ? "No bookings yet. They'll appear here once your listing is live and guests book it."
            : `No ${tab === 'all' ? '' : tab} bookings.`}
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((b) => {
            const pill = BOOKING_PILL[b.status] || BOOKING_PILL.upcoming;
            return (
              <Link key={b.id} to={`${basePath}/bookings/${b.id}`} className="bg-white rounded-xl shadow-soft p-4 flex items-center justify-between gap-3 hover:shadow-md transition">
                <div className="min-w-0">
                  <div className="font-semibold text-ink truncate">{b.guest || 'Guest'}</div>
                  <div className="text-xs text-ink-muted">{b.date} · {b.guests} guest(s)</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-brand-dark">₹{Number(b.amount || 0).toLocaleString('en-IN')}</div>
                  <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${pill.cls}`}>{pill.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
