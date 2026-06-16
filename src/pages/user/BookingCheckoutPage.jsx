import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Loader2, MapPin, Calendar, Users, FileText, AlertCircle, CreditCard, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import { initCashfree } from '../../services/cashfree';

const fmtMoney = (n, currency = 'INR') =>
  `${currency === 'INR' ? '₹' : currency + ' '}${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};

// Renders right after Booking Preview commits a row. Phase 5 will replace
// the "Pay now" button with the real Cashfree redirect. Until then the page
// shows the full voucher preview so the user (and you) can verify the data
// pipeline end-to-end.
export default function BookingCheckoutPage() {
  const { code } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paying, setPaying] = useState(false);

  const handlePay = async () => {
    if (paying) return;
    setPaying(true);
    try {
      // 1) Backend creates (or returns) a Cashfree order. We never expose the
      // app-secret to the client — the session id is the only thing the SDK
      // needs to spin up hosted checkout.
      const orderRes = await api.post(`/payments/orders/${code}`);
      const { paymentSessionId, mode } = orderRes.data?.data || {};
      if (!paymentSessionId) throw new Error('Could not initialise payment');

      const cashfree = await initCashfree(mode);

      // 2) `redirectTarget: '_self'` is the cleanest UX — full-page redirect
      // to Cashfree's hosted form, then back to /booking-success/:code (the
      // return_url we passed when creating the order). No popups, no
      // postMessage glue.
      const result = await cashfree.checkout({
        paymentSessionId,
        redirectTarget: '_self',
      });
      // We only reach here if the user cancels / the SDK reports an error
      // inline. The success path is handled by the return URL.
      if (result?.error) {
        toast.error(result.error.message || 'Payment cancelled');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Could not start payment');
    } finally {
      setPaying(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/bookings/me/${code}`)
      .then((res) => { if (!cancelled) setBooking(res.data?.data?.booking || null); })
      .catch((err) => { if (!cancelled) setError(err.response?.data?.message || 'Could not load booking'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-alt">
        <Loader2 className="animate-spin text-brand" size={28} />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-alt px-4 text-center">
        <AlertCircle size={36} className="text-rose-500 mb-3" />
        <h1 className="text-xl font-semibold">{error || 'Booking not found'}</h1>
        <Link to="/dashboard/bookings" className="mt-5 px-5 py-2.5 rounded-lg bg-brand text-white font-medium">
          Go to my bookings
        </Link>
      </div>
    );
  }

  const item = booking.item;
  const pricing = booking.pricing;
  const isPending = booking.status === 'pending_payment';

  return (
    <div className="min-h-screen bg-surface-alt pb-12">
      <div className="bg-white border-b">
        <div className="container-app py-4 flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs text-ink-muted">
            Booking <span className="font-mono font-bold text-ink">{booking.bookingCode}</span>
          </div>
          <StatusBadge status={booking.status} />
        </div>
      </div>

      <div className="container-app pt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Voucher preview */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
            {/* Voucher header ribbon */}
            <div className="bg-gradient-to-r from-brand to-brand-dark text-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-widest opacity-90">Booking voucher</div>
                  <div className="font-mono font-bold text-lg mt-0.5">{booking.bookingCode}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-widest opacity-90">Total</div>
                  <div className="font-bold text-xl">{fmtMoney(pricing.total, booking.currency)}</div>
                </div>
              </div>
            </div>

            {/* Item snapshot */}
            <div className="p-5 flex flex-col sm:flex-row gap-5 border-b">
              <div className="sm:w-48 h-32 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                {item?.image ? (
                  <img src={fileUrl(item.image)} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-ink-muted">
                    <FileText size={28} />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-brand mb-1">
                  {item?.type === 'package' && 'Retreat'}
                  {item?.type === 'room' && 'Hotel Room'}
                  {item?.type === 'event' && 'Event'}
                  {item?.type === 'addon' && 'Add-on Activity'}
                </div>
                <h1 className="font-display font-bold text-xl leading-snug">{item?.name}</h1>
                {item?.hotel?.name && (
                  <div className="text-sm text-ink-muted mt-1">{item.hotel.name}</div>
                )}
                {item?.location && (
                  <div className="text-sm text-ink-muted mt-1 inline-flex items-center gap-1">
                    <MapPin size={13} /> {item.location}
                  </div>
                )}
              </div>
            </div>

            {/* Booking details grid */}
            <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border-b">
              <Detail icon={Calendar} label="When" value={
                booking.scheduledFor
                  ? booking.scheduledEndAt
                    ? `${fmtDate(booking.scheduledFor)} → ${fmtDate(booking.scheduledEndAt)}`
                    : fmtDate(booking.scheduledFor)
                  : '—'
              } />
              <Detail icon={Users} label="Guests" value={booking.guest.count} />
              <Detail
                icon={Clock}
                label={item?.type === 'room' ? 'Nights' : 'Duration'}
                value={booking.units}
              />
              <Detail icon={CreditCard} label="Payment" value={booking.payment.paidAt ? 'Paid' : 'Pending'} />
            </div>

            {/* Guest snapshot */}
            <div className="p-5 border-b">
              <div className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3">Lead traveller</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <KV label="Name" value={booking.guest.name} />
                <KV label="Email" value={booking.guest.email} />
                <KV label="Phone" value={booking.guest.phone} />
              </div>
              {booking.specialRequests && (
                <div className="mt-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">Special requests</div>
                  <p className="text-sm text-ink">{booking.specialRequests}</p>
                </div>
              )}
            </div>

            {/* Price breakdown */}
            <div className="p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3">Price breakdown</div>
              <div className="space-y-2 text-sm">
                <Row label={`${fmtMoney(pricing.unitPrice, booking.currency)} × ${booking.units || booking.guest.count}`} value={fmtMoney(pricing.subtotal, booking.currency)} />
                {pricing.gst > 0 && (
                  <Row label={booking.item?.pricedAt?.gstRate ? `GST (${booking.item.pricedAt.gstRate}%)` : 'GST'} value={fmtMoney(pricing.gst, booking.currency)} />
                )}
                {pricing.tcs > 0 && (
                  <Row label={booking.item?.pricedAt?.tcsRate ? `TCS (${booking.item.pricedAt.tcsRate}%)` : 'TCS'} value={fmtMoney(pricing.tcs, booking.currency)} />
                )}
                {pricing.walletDiscount > 0 && (
                  <Row label="Wallet credit" value={`− ${fmtMoney(pricing.walletDiscount, booking.currency)}`} accent="text-emerald-600" />
                )}
                {pricing.couponDiscount > 0 && (
                  <Row label={`Coupon ${pricing.couponCode || ''}`} value={`− ${fmtMoney(pricing.couponDiscount, booking.currency)}`} accent="text-emerald-600" />
                )}
                <div className="border-t mt-2 pt-2 flex items-center justify-between font-bold text-base">
                  <span>Total</span>
                  <span className="text-brand">{fmtMoney(pricing.total, booking.currency)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Pay now CTA */}
        <aside className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-soft p-5 sticky top-20">
            {isPending ? (
              <>
                <h3 className="font-semibold text-ink">Complete your booking</h3>
                <p className="text-sm text-ink-muted mt-1">
                  We've reserved this booking for you. Pay to lock in the price and receive your voucher by email.
                </p>
                <button
                  type="button"
                  onClick={handlePay}
                  disabled={paying}
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-brand text-white font-semibold py-3 rounded-lg hover:brightness-110 disabled:opacity-60 transition"
                >
                  {paying ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
                  {paying ? 'Connecting to Cashfree…' : `Pay ${fmtMoney(pricing.total, booking.currency)}`}
                </button>
                <div className="mt-3 text-[11px] text-ink-muted text-center leading-relaxed">
                  Secure payment by Cashfree. We never see or store your card details.
                </div>
                <Link
                  to="/dashboard/bookings"
                  className="mt-3 block text-center w-full py-2.5 rounded-lg border border-gray-200 hover:bg-surface-alt text-sm font-medium"
                >
                  View my bookings
                </Link>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-ink">Booking confirmed</h3>
                <p className="text-sm text-ink-muted mt-1">
                  A voucher and confirmation email have been sent to {booking.guest.email}.
                </p>
                <Link
                  to="/dashboard/bookings"
                  className="mt-5 w-full block text-center py-2.5 rounded-lg bg-brand text-white font-semibold hover:brightness-110"
                >
                  Go to my bookings
                </Link>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending_payment: { label: 'Pending payment', cls: 'bg-amber-100 text-amber-800' },
    confirmed: { label: 'Confirmed', cls: 'bg-emerald-100 text-emerald-700' },
    completed: { label: 'Completed', cls: 'bg-blue-100 text-blue-700' },
    cancelled: { label: 'Cancelled', cls: 'bg-rose-100 text-rose-700' },
    refunded: { label: 'Refunded', cls: 'bg-slate-100 text-slate-700' },
  };
  const cfg = map[status] || { label: status, cls: 'bg-slate-100 text-slate-700' };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function Detail({ icon: Icon, label, value }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-ink-muted uppercase tracking-wide mb-0.5">
        <Icon size={12} /> {label}
      </div>
      <div className="font-medium text-ink">{value}</div>
    </div>
  );
}

function KV({ label, value }) {
  return (
    <div>
      <div className="text-xs text-ink-muted uppercase tracking-wide">{label}</div>
      <div className="font-medium text-ink break-words">{value || '—'}</div>
    </div>
  );
}

function Row({ label, value, accent = '' }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-muted">{label}</span>
      <span className={`font-medium ${accent || 'text-ink'}`}>{value}</span>
    </div>
  );
}
