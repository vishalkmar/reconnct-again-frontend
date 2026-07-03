import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2, ChevronLeft, CalendarCheck, MapPin, Clock } from 'lucide-react';
import api, { fileUrl } from '../../services/api';

const STATUS_BADGE = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-600' },
  pending: { label: 'Pending review', cls: 'bg-amber-100 text-amber-700' },
};

// A host listing's bookings feed. Bookings for host listings land in a later
// phase, so this shows the listing header + a real (currently empty) list.
export default function HostListingBookingsPage() {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.get(`/host/listings/${id}`)
      .then(({ data }) => { if (alive) setListing((data.data || data).listing); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  if (loading) return <div className="flex justify-center py-20 text-slate-400"><Loader2 className="animate-spin" size={24} /></div>;
  if (!listing) return <div className="max-w-3xl"><p className="text-ink-muted">Listing not found.</p><Link to="/host/listings" className="text-brand font-semibold">Back to listings</Link></div>;

  const badge = listing.isPublished ? { label: 'Published', cls: 'bg-emerald-100 text-emerald-700' } : (STATUS_BADGE[listing.status] || STATUS_BADGE.draft);
  const bookings = listing.bookings || [];

  return (
    <div className="max-w-4xl">
      <Link to="/host/listings" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink mb-4"><ChevronLeft size={16} /> Back to My Listings</Link>

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
        </div>
      </div>

      <h2 className="font-semibold text-ink mb-3 flex items-center gap-2"><CalendarCheck size={18} className="text-brand" /> Bookings</h2>
      {bookings.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-10 text-center text-ink-muted">
          No bookings yet. They'll appear here once your listing is live and guests book it.
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div key={b.id} className="bg-white rounded-xl shadow-soft p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold text-ink">{b.guest || 'Guest'}</div>
                <div className="text-xs text-ink-muted">{b.date} · {b.guests} guest(s)</div>
              </div>
              <div className="font-bold text-brand-dark">₹{Number(b.amount || 0).toLocaleString('en-IN')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
