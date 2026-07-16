import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, ChevronLeft, MapPin, Clock, Mail, Phone, CheckCircle2 } from 'lucide-react';
import api, { fileUrl } from '../../services/api';

const PILL = {
  upcoming: { label: 'Upcoming', cls: 'bg-brand/10 text-brand-dark' },
  completed: { label: 'Completed', cls: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-rose-100 text-rose-600' },
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};
const fmtDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Full itinerary + guest + payment detail for ONE booking on one of the
// host's own listings — mirrors the app's HostBookingDetailScreen. basePath
// lets the Supplier Portal (Phase 4) reuse this exact page.
export default function HostBookingDetailPage({ basePath = '/host' }) {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api.get(`${basePath}/bookings/${id}`)
      .then(({ data }) => { if (alive) setBooking((data.data || data).booking); })
      .catch((e) => { if (alive) setError(e.response?.data?.message || 'Could not load booking'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  if (loading) return <div className="flex justify-center py-20 text-slate-400"><Loader2 className="animate-spin" size={24} /></div>;
  if (error || !booking) {
    return (
      <div className="max-w-3xl">
        <p className="text-ink-muted">{error || 'Booking not found.'}</p>
        <Link to={`${basePath}/listings`} className="text-brand font-semibold">Back to My Listings</Link>
      </div>
    );
  }

  const pill = PILL[booking.status] || PILL.upcoming;
  const item = booking.item || {};

  return (
    <div className="max-w-3xl">
      <Link to={`${basePath}/listings`} className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink mb-4"><ChevronLeft size={16} /> Back to My Listings</Link>

      {/* Ribbon */}
      <div className="bg-brand rounded-2xl p-5 flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-black/60">Booking</div>
          <div className="text-lg font-mono font-bold">{booking.bookingCode}</div>
          <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${pill.cls}`}>{pill.label}</span>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold uppercase tracking-wide text-black/60">Base amount</div>
          <div className="text-xl font-bold">₹{Number(booking.baseAmount || 0).toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* Item */}
      <div className="bg-white rounded-2xl shadow-soft overflow-hidden mb-4 flex flex-col sm:flex-row">
        <div className="sm:w-48 h-36 bg-surface-alt shrink-0">
          {item.image ? <img src={fileUrl(item.image)} alt="" className="w-full h-full object-cover" /> : null}
        </div>
        <div className="p-5 flex-1">
          <div className="text-xs font-bold uppercase tracking-wide text-brand-dark">Experience</div>
          <h1 className="text-xl font-display font-bold mt-1">{item.name}</h1>
          <div className="flex items-center gap-3 text-sm text-ink-muted mt-1">
            {(item.city || item.location) && <span className="inline-flex items-center gap-1"><MapPin size={13} /> {item.city || item.location}</span>}
            {item.durationLabel && <span className="inline-flex items-center gap-1"><Clock size={13} /> {item.durationLabel}</span>}
          </div>
        </div>
      </div>

      {/* Trip details */}
      <div className="bg-white rounded-2xl shadow-soft p-5 mb-4 grid grid-cols-2 gap-4">
        <div><div className="text-[10px] font-bold uppercase text-ink-muted">When</div><div className="font-semibold mt-0.5">{fmtDate(booking.scheduledFor)}</div></div>
        <div><div className="text-[10px] font-bold uppercase text-ink-muted">Guests</div><div className="font-semibold mt-0.5">{booking.guest?.count || 1}</div></div>
        <div><div className="text-[10px] font-bold uppercase text-ink-muted">Units</div><div className="font-semibold mt-0.5">{booking.units || 1}</div></div>
        <div><div className="text-[10px] font-bold uppercase text-ink-muted">Paid at</div><div className="font-semibold mt-0.5">{booking.paidAt ? fmtDateTime(booking.paidAt) : '—'}</div></div>
        {booking.specialRequests && (
          <div className="col-span-2">
            <div className="text-[10px] font-bold uppercase text-ink-muted">Special requests / time slot</div>
            <div className="font-semibold mt-0.5">{booking.specialRequests}</div>
          </div>
        )}
      </div>

      {/* Guest */}
      <div className="bg-white rounded-2xl shadow-soft p-5 mb-4">
        <div className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-3">Who booked</div>
        <div className="font-semibold text-ink">{booking.guest?.name}</div>
        <div className="flex flex-wrap gap-4 mt-2 text-sm text-ink-muted">
          {booking.guest?.email && <a href={`mailto:${booking.guest.email}`} className="inline-flex items-center gap-1.5 hover:text-brand-dark"><Mail size={14} /> {booking.guest.email}</a>}
          {booking.guest?.phone && <span className="inline-flex items-center gap-1.5"><Phone size={14} /> {booking.guest.phone}</span>}
        </div>
      </div>

      {/* What's included */}
      {item.inclusions?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-soft p-5 mb-4">
          <div className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-3">What's included</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {item.inclusions.map((inc, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-ink">
                <CheckCircle2 size={15} className="text-brand shrink-0" />
                {typeof inc === 'string' ? inc : inc.title || inc.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment */}
      <div className="bg-white rounded-2xl shadow-soft p-5">
        <div className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-3">Payment</div>
        <div className="flex justify-between text-sm py-1.5 border-b border-gray-50"><span className="text-ink-muted">Payment reference</span><span className="font-mono font-semibold">{booking.paymentId || '—'}</span></div>
        <div className="flex justify-between text-sm py-1.5"><span className="text-ink-muted">Method</span><span className="font-semibold">{booking.paymentMethod || '—'}</span></div>
        <div className="mt-3 bg-brand/10 text-brand-dark text-xs rounded-lg p-3">
          Base amount excludes GST and the platform convenience fee — this is your payout basis, not the guest's total.
        </div>
      </div>
    </div>
  );
}
