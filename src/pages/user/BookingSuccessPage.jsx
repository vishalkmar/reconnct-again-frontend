import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CheckCircle2, AlertCircle, Loader2, MapPin, Calendar, Users, Clock, CreditCard,
  Printer, Download, ArrowRight, FileText, XCircle,
} from 'lucide-react';
import api, { fileUrl } from '../../services/api';

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

const fmtDateTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Cashfree redirects here as `/booking-success/:code?cf_order_id=...`. We
// immediately ask the backend to GET the order from Cashfree and flip the
// booking to confirmed if it's been paid. The webhook may have already done
// this server-side — either way our poll converges on the same answer.
export default function BookingSuccessPage() {
  const { code } = useParams();
  const [booking, setBooking] = useState(null);
  const [verifying, setVerifying] = useState(true);
  const [paid, setPaid] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pollExhausted, setPollExhausted] = useState(false);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  const verify = useCallback(async () => {
    try {
      const res = await api.get(`/payments/verify/${code}`);
      const data = res.data?.data || {};
      setBooking(data.booking || null);
      setPaid(!!data.paid);
      setFailed(!!data.failed);
      return { paid: !!data.paid, failed: !!data.failed };
    } catch (err) {
      setError(err.response?.data?.message || 'Could not verify payment status');
      return { paid: false, failed: false };
    }
  }, [code]);

  // Poll for up to ~30s in case Cashfree's webhook is still in flight when the
  // browser lands here. Each attempt re-fetches from /pg/orders so we'll catch
  // a fresh status the moment the payment is recorded. We stop the moment we
  // see paid=true, or the gateway tells us the attempt is definitively dead
  // (failed=true), or after 10 tries.
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const tick = async () => {
      if (cancelled) return;
      attempts += 1;
      const { paid: isPaid, failed: isFailed } = await verify();
      if (cancelled) return;
      setVerifying(false);
      if (!isPaid && !isFailed && attempts < 10) {
        pollRef.current = setTimeout(tick, 3000);
      } else if (!isPaid && !isFailed) {
        // Gave up after 10 tries with no terminal answer either way — stop
        // spinning forever and tell the user plainly instead.
        setPollExhausted(true);
      }
    };
    tick();
    return () => {
      cancelled = true;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [verify]);

  if (!booking && verifying) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-alt px-4 text-center">
        <Loader2 className="animate-spin text-brand" size={32} />
        <p className="mt-3 text-sm text-ink-muted">Confirming your payment with Cashfree…</p>
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

  return (
    <div className="min-h-screen bg-surface-alt pb-12 print:bg-white">
      <div className="container-app pt-6 max-w-4xl">
        {/* Status banner — success / failed / still-pending are three distinct
            states so a dead payment attempt never looks like an endless spinner. */}
        {paid ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-3 mb-5 print:hidden">
            <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={24} />
            <div className="flex-1">
              <h2 className="font-semibold text-emerald-900">Payment received — your booking is confirmed!</h2>
              <p className="text-sm text-emerald-800 mt-1">
                A confirmation email with this voucher has been sent to <strong>{booking.guest.email}</strong>.
              </p>
            </div>
          </div>
        ) : failed ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3 mb-5 print:hidden">
            <XCircle className="text-red-600 shrink-0 mt-0.5" size={24} />
            <div className="flex-1">
              <h2 className="font-semibold text-red-900">Payment failed</h2>
              <p className="text-sm text-red-800 mt-1">
                Cashfree couldn't complete this payment. If money was deducted it'll be refunded
                automatically within a few days — nothing else was charged. You can try again on the
                same booking.
              </p>
              <Link
                to={`/checkout/${booking.bookingCode}`}
                className="inline-flex items-center gap-1 mt-3 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:brightness-110"
              >
                Try again
              </Link>
            </div>
          </div>
        ) : pollExhausted ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3 mb-5 print:hidden">
            <Clock className="text-amber-600 shrink-0 mt-0.5" size={24} />
            <div className="flex-1">
              <h2 className="font-semibold text-amber-900">Still pending</h2>
              <p className="text-sm text-amber-800 mt-1">
                Cashfree hasn't confirmed this payment yet. It'll update automatically once it does —
                check the Transactions tab in a few minutes, or refresh this page.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3 mb-5 print:hidden">
            <Loader2 className="animate-spin text-amber-600 shrink-0 mt-0.5" size={24} />
            <div className="flex-1">
              <h2 className="font-semibold text-amber-900">Confirming your payment…</h2>
              <p className="text-sm text-amber-800 mt-1">
                Cashfree is still processing the transaction. This page will update automatically —
                you don't need to refresh.
              </p>
            </div>
          </div>
        )}

        {/* Action bar (print only) */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 print:hidden">
          <div className="text-sm text-ink-muted">
            Voucher <span className="font-mono font-bold text-ink">{booking.bookingCode}</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-white text-sm font-medium"
            >
              <Printer size={16} /> Print
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-white text-sm font-medium"
              title="Use 'Save as PDF' from the print dialog"
            >
              <Download size={16} /> Save PDF
            </button>
          </div>
        </div>

        {/* Voucher */}
        <article className="bg-white rounded-2xl shadow-soft overflow-hidden print:shadow-none print:rounded-none">
          {/* Header ribbon */}
          <div className="bg-gradient-to-r from-brand to-brand-dark text-white p-6 print:bg-brand">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-[11px] uppercase tracking-widest opacity-90">Booking voucher</div>
                <div className="font-mono font-bold text-2xl mt-1 tracking-wider">{booking.bookingCode}</div>
                <div className="text-xs mt-1 opacity-90 capitalize">
                  Status: <span className="font-semibold">{booking.status.replace('_', ' ')}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-widest opacity-90">Total paid</div>
                <div className="font-bold text-2xl">{fmtMoney(pricing.total, booking.currency)}</div>
                {booking.payment.paidAt && (
                  <div className="text-[11px] mt-1 opacity-90">
                    {fmtDateTime(booking.payment.paidAt)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Item snapshot */}
          <div className="p-6 flex flex-col sm:flex-row gap-5 border-b">
            <div className="sm:w-56 h-40 rounded-lg overflow-hidden bg-slate-100 shrink-0">
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
              <h1 className="font-display font-bold text-2xl leading-snug">{item?.name}</h1>
              {item?.hotel?.name && (
                <div className="text-sm text-ink-muted mt-1">{item.hotel.name}</div>
              )}
              {item?.location && (
                <div className="text-sm text-ink-muted mt-1 inline-flex items-center gap-1">
                  <MapPin size={14} /> {item.location}
                </div>
              )}
              {item?.detailHref && (
                <Link
                  to={item.detailHref}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline print:hidden"
                >
                  View experience details <ArrowRight size={12} />
                </Link>
              )}
            </div>
          </div>

          {/* Booking grid */}
          <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-5 border-b">
            <Detail
              icon={Calendar}
              label="When"
              value={
                booking.scheduledFor
                  ? booking.scheduledEndAt
                    ? `${fmtDate(booking.scheduledFor)} → ${fmtDate(booking.scheduledEndAt)}`
                    : fmtDate(booking.scheduledFor)
                  : '—'
              }
            />
            <Detail icon={Users} label="Guests" value={booking.guest.count} />
            <Detail
              icon={Clock}
              label={item?.type === 'room' ? 'Nights' : 'Duration'}
              value={booking.units}
            />
            <Detail
              icon={CreditCard}
              label="Payment ref"
              value={
                booking.payment.paymentId ? (
                  <span className="font-mono text-xs">{booking.payment.paymentId}</span>
                ) : '—'
              }
            />
          </div>

          {/* Guest details */}
          <div className="p-6 border-b">
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

          {/* Pricing */}
          <div className="p-6">
            <div className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3">Payment summary</div>
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
                <Row label={`Coupon ${pricing.couponCode || ''}`.trim()} value={`− ${fmtMoney(pricing.couponDiscount, booking.currency)}`} accent="text-emerald-600" />
              )}
              <div className="border-t mt-2 pt-2 flex items-center justify-between font-bold text-base">
                <span>Total paid</span>
                <span className="text-brand">{fmtMoney(pricing.total, booking.currency)}</span>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="p-6 bg-surface-alt/50 text-xs text-ink-muted leading-relaxed">
            Keep this voucher handy — you'll need to show the booking code at check-in.
            Need help? Reply to your confirmation email and our team will take care of it.
            <div className="mt-2">— Team Retreats by Traveon</div>
          </div>
        </article>

        {/* Footer actions */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            to="/dashboard"
            className="text-sm font-medium text-ink hover:text-brand"
          >
            ← Back to dashboard
          </Link>
          <Link
            to="/dashboard/bookings"
            className="inline-flex items-center gap-1 px-5 py-2.5 rounded-lg bg-brand text-white font-semibold hover:brightness-110"
          >
            View all my bookings <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      <style>{`
        @media print {
          @page { margin: 12mm; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}

function Detail({ icon: Icon, label, value }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-ink-muted uppercase tracking-wide mb-0.5">
        <Icon size={12} /> {label}
      </div>
      <div className="font-medium text-ink text-sm break-words">{value}</div>
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
