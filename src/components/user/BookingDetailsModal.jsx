import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  X, MapPin, Calendar, Users, Clock, CreditCard, FileText, Printer, Download,
  ArrowRight, AlertCircle, Loader2, XCircle, ExternalLink, Hotel as HotelIcon,
  CheckCircle2, RefreshCcw, ChevronRight, ChevronLeft, ShieldCheck, Info, Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import { TYPE_LABEL, STATUS_BADGE, fmtMoney, fmtDate, fmtDateTime, categorize } from './bookingFormatters';

// Refund-status badges used both in the cancel flow's success step AND in
// the persistent "Booking cancelled" banner at the bottom of the modal.
const REFUND_STATUS_BADGE = {
  none:       { label: 'No refund',         cls: 'bg-slate-100 text-slate-700' },
  pending:    { label: 'Refund pending',    cls: 'bg-amber-100 text-amber-800' },
  processing: { label: 'Refund processing', cls: 'bg-blue-100 text-blue-800' },
  completed:  { label: 'Refund completed',  cls: 'bg-emerald-100 text-emerald-700' },
  failed:     { label: 'Refund failed',     cls: 'bg-rose-100 text-rose-700' },
};

/**
 * Full-detail booking modal used by BOTH the bookings page and the
 * transactions page. Closing rules:
 *   • Click backdrop OR press Esc → close (unless cancelling is in flight).
 *   • Cancel action opens an inline confirm step inside the same modal so
 *     the user doesn't lose context.
 *
 * Print uses the same window.print() trick as BookingSuccessPage. We add a
 * `.print-only-target` class to the voucher card and hide the rest via the
 * inline print stylesheet at the bottom of the file.
 */
export default function BookingDetailsModal({ booking, open, onClose, onChanged }) {
  // Multi-step cancel flow:
  //   null      = action bar visible, no cancel UI open
  //   'reason'  = step 1 — radio list of reasons + custom text
  //   'confirm' = step 2 — refund preview + final confirm
  //   'done'    = step 3 — success/result summary
  const [cancelStep, setCancelStep] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [reasonCode, setReasonCode] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [cancelResult, setCancelResult] = useState(null);

  useEffect(() => {
    if (!open) {
      setCancelStep(null);
      setCancelling(false);
      setReasonCode('');
      setReasonText('');
      setQuote(null);
      setQuoteLoading(false);
      setCancelResult(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !cancelling) onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, cancelling, onClose]);

  if (!open || !booking) return null;

  const item = booking.item || {};
  const pricing = booking.pricing || {};
  const status = booking.status;
  const cat = categorize(booking);
  const canCancel = (status === 'pending_payment' || status === 'confirmed') && cat !== 'completed';
  const canPay = status === 'pending_payment';

  // Step 1 → 2: fetch the refund quote so the user sees exactly what they'll
  // get back before they commit. Quote is server-computed so the tier resolution
  // can't be tampered with from the browser.
  const handleProceedToConfirm = async () => {
    if (!reasonCode) {
      toast.error('Please pick a reason');
      return;
    }
    if (reasonCode === 'other' && !reasonText.trim()) {
      toast.error('Please tell us a bit about your reason');
      return;
    }
    setQuoteLoading(true);
    try {
      const res = await api.get(`/bookings/me/${booking.bookingCode}/cancel-quote`);
      setQuote(res.data?.data || null);
      setCancelStep('confirm');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load refund quote');
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    setCancelling(true);
    try {
      const res = await api.post(`/bookings/me/${booking.bookingCode}/cancel`, {
        reasonCode,
        reason: reasonText.trim() || undefined,
      });
      setCancelResult(res.data?.data || null);
      setCancelStep('done');
      toast.success('Booking cancelled');
      // Refresh the list/details quietly in the background — the modal stays
      // open on the result screen so the user can read the refund info.
      onChanged?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  // Use the quote's reasons list if available; otherwise fall back to a hard
  // copy so the UI still renders if the quote endpoint is offline.
  const reasonOptions = quote?.reasons || [
    { code: 'plan_change',     label: 'My plan has changed' },
    { code: 'found_better',    label: 'Found a better option' },
    { code: 'price_high',      label: 'The price feels too high' },
    { code: 'payment_issue',   label: 'I had a payment issue' },
    { code: 'emergency',       label: 'Personal emergency / illness' },
    { code: 'travel_restrict', label: 'Travel restrictions / weather' },
    { code: 'wrong_dates',     label: 'Wrong dates booked by mistake' },
    { code: 'other',           label: 'Other (please specify)' },
  ];

  const badge = STATUS_BADGE[status] || { label: status, cls: 'bg-slate-100 text-slate-700' };

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/55 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={() => !cancelling && onClose?.()}
    >
      <div
        className="relative w-full max-w-3xl my-auto bg-white rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto booking-voucher-print"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close + actions row */}
        <div className="absolute top-3 right-3 z-10 flex gap-2 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="p-2 rounded-full bg-white/90 hover:bg-white text-ink shadow border border-gray-200"
            aria-label="Print voucher"
            title="Print"
          >
            <Printer size={16} />
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="p-2 rounded-full bg-white/90 hover:bg-white text-ink shadow border border-gray-200"
            aria-label="Save as PDF"
            title="Save as PDF (uses 'Save as PDF' from the print dialog)"
          >
            <Download size={16} />
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={cancelling}
            className="p-2 rounded-full bg-white/90 hover:bg-white text-ink shadow border border-gray-200 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Header ribbon */}
        <div className="bg-gradient-to-r from-brand to-brand-dark text-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap pr-32 print:pr-0">
            <div>
              <div className="text-[11px] uppercase tracking-widest opacity-90">Booking voucher</div>
              <div className="font-mono font-bold text-xl sm:text-2xl mt-1 tracking-wider break-all">
                {booking.bookingCode}
              </div>
              <div className="mt-2">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-widest opacity-90">
                {status === 'pending_payment' ? 'Amount due' : 'Total'}
              </div>
              <div className="font-bold text-xl sm:text-2xl">{fmtMoney(pricing.total, booking.currency)}</div>
              {booking.payment?.paidAt && (
                <div className="text-[11px] opacity-90 mt-1">{fmtDateTime(booking.payment.paidAt)}</div>
              )}
            </div>
          </div>
        </div>

        {/* Item snapshot */}
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-5 border-b">
          <div className="sm:w-44 h-32 rounded-lg overflow-hidden bg-slate-100 shrink-0">
            {item?.image ? (
              <img src={fileUrl(item.image)} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-ink-muted">
                <FileText size={28} />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-brand mb-1">
              {TYPE_LABEL[item.type] || 'Booking'}
            </div>
            <h2 className="font-display font-bold text-lg sm:text-xl leading-snug">{item?.name}</h2>
            {item?.hotel?.name && (
              <div className="text-sm text-ink-muted mt-1 inline-flex items-center gap-1">
                <HotelIcon size={13} /> {item.hotel.name}
              </div>
            )}
            {item?.location && (
              <div className="text-sm text-ink-muted mt-1 inline-flex items-center gap-1">
                <MapPin size={13} /> {item.location}
              </div>
            )}
            {item?.detailHref && (
              <Link
                to={item.detailHref}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline print:hidden"
              >
                View experience <ArrowRight size={12} />
              </Link>
            )}
          </div>
        </div>

        {/* Details grid */}
        <div className="p-5 sm:p-6 grid grid-cols-2 md:grid-cols-4 gap-4 border-b">
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
          <Detail icon={Users} label="Guests" value={booking.guest?.count} />
          <Detail
            icon={Clock}
            label={item?.type === 'room' ? 'Nights' : 'Duration'}
            value={booking.units}
          />
          <Detail
            icon={CreditCard}
            label="Payment"
            value={booking.payment?.paidAt ? 'Paid' : status === 'cancelled' ? 'Cancelled' : 'Pending'}
          />
        </div>

        {/* Guest snapshot */}
        <div className="p-5 sm:p-6 border-b">
          <div className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3">Lead traveller</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <KV label="Name" value={booking.guest?.name} />
            <KV label="Email" value={booking.guest?.email} />
            <KV label="Phone" value={booking.guest?.phone} />
          </div>
          {booking.specialRequests && (
            <div className="mt-4">
              <div className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">Special requests</div>
              <p className="text-sm text-ink whitespace-pre-wrap">{booking.specialRequests}</p>
            </div>
          )}
        </div>

        {/* Payment details */}
        <div className="p-5 sm:p-6 border-b">
          <div className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3">Payment</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <KV label="Order id" value={booking.payment?.orderId ? <span className="font-mono text-xs">{booking.payment.orderId}</span> : '—'} />
            <KV label="Payment id" value={booking.payment?.paymentId ? <span className="font-mono text-xs">{booking.payment.paymentId}</span> : '—'} />
            <KV label="Method" value={booking.payment?.method ? <span className="capitalize">{booking.payment.method}</span> : '—'} />
            <KV label="Paid at" value={booking.payment?.paidAt ? fmtDateTime(booking.payment.paidAt) : '—'} />
          </div>
        </div>

        {/* Pricing */}
        <div className="p-5 sm:p-6 bg-surface-alt/40">
          <div className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3">Price breakdown</div>
          <div className="space-y-1.5 text-sm">
            <Row label={`${fmtMoney(pricing.unitPrice, booking.currency)} × ${booking.units || booking.guest?.count || 1}`} value={fmtMoney(pricing.subtotal, booking.currency)} />
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
              <span>{status === 'pending_payment' ? 'Total payable' : 'Total paid'}</span>
              <span className="text-brand">{fmtMoney(pricing.total, booking.currency)}</span>
            </div>
          </div>
        </div>

        {/* Cancellation + refund info — shown whenever the booking is in any
            cancelled-ish state. Refund status badge surfaces Cashfree settlement
            state independent of the booking status. */}
        {(status === 'cancelled' || status === 'refunded') && booking.cancelledAt && (
          <div className="p-5 sm:p-6 bg-rose-50 border-t border-rose-100 text-sm text-rose-900">
            <div className="font-semibold mb-1 flex items-center gap-2 flex-wrap">
              <XCircle size={16} />
              <span>Booking cancelled on {fmtDateTime(booking.cancelledAt)}</span>
              {booking.refundStatus && booking.refundStatus !== 'none' && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${REFUND_STATUS_BADGE[booking.refundStatus]?.cls || 'bg-slate-100 text-slate-700'}`}>
                  {REFUND_STATUS_BADGE[booking.refundStatus]?.label || booking.refundStatus}
                </span>
              )}
            </div>
            {booking.cancellationReason && (
              <div className="text-rose-800 mt-1">Reason: {booking.cancellationReason}</div>
            )}
            {booking.refundAmount > 0 && (
              <div className="text-rose-800 mt-1">
                Refund: <strong>{fmtMoney(booking.refundAmount, booking.currency)}</strong>
                {booking.refundStatus === 'processing' && <> · Processing — usually reflects within 5–7 business days</>}
                {booking.refundStatus === 'completed' && <> · Settled to your original payment method</>}
                {booking.refundStatus === 'failed' && <> · Refund failed — our team will follow up</>}
              </div>
            )}
          </div>
        )}

        {/* Action bar */}
        <div className="p-5 sm:p-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            to="/dashboard/bookings"
            className="text-sm font-medium text-ink-muted hover:text-brand"
            onClick={onClose}
          >
            ← All bookings
          </Link>

          <div className="flex flex-wrap gap-2">
            {canPay && (
              <Link
                to={`/checkout/${booking.bookingCode}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:brightness-110"
              >
                <CreditCard size={14} /> Pay now
              </Link>
            )}
            {canCancel && !cancelStep && (
              <button
                type="button"
                onClick={() => setCancelStep('reason')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-rose-200 text-rose-700 text-sm font-semibold hover:bg-rose-50"
              >
                <XCircle size={14} /> Cancel booking
              </button>
            )}
          </div>
        </div>

        {/* Multi-step cancel flow */}
        {cancelStep && (
          <div className="px-5 sm:px-6 pb-5 sm:pb-6 print:hidden">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-4 text-xs">
              <StepPill active={cancelStep === 'reason'} done={cancelStep !== 'reason'} num={1} label="Why?" />
              <div className="flex-1 h-px bg-slate-200" />
              <StepPill active={cancelStep === 'confirm'} done={cancelStep === 'done'} num={2} label="Refund preview" />
              <div className="flex-1 h-px bg-slate-200" />
              <StepPill active={cancelStep === 'done'} done={false} num={3} label="Done" />
            </div>

            {cancelStep === 'reason' && (
              <div className="bg-surface-alt/40 rounded-xl p-4">
                <div className="flex items-center gap-2 text-ink mb-3">
                  <Info size={16} className="text-amber-600" />
                  <span className="text-sm font-semibold">Help us understand — why are you cancelling?</span>
                </div>
                <div className="space-y-1.5">
                  {reasonOptions.map((opt) => (
                    <label
                      key={opt.code}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition ${
                        reasonCode === opt.code
                          ? 'border-brand bg-brand/5 ring-1 ring-brand/30'
                          : 'border-slate-200 hover:bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={opt.code}
                        checked={reasonCode === opt.code}
                        onChange={() => setReasonCode(opt.code)}
                        className="accent-brand"
                      />
                      <span className="text-sm text-ink">{opt.label}</span>
                    </label>
                  ))}
                </div>
                {(reasonCode === 'other' || reasonCode) && (
                  <textarea
                    rows={3}
                    value={reasonText}
                    onChange={(e) => setReasonText(e.target.value)}
                    placeholder={reasonCode === 'other' ? 'Tell us more (required)' : 'Add any extra context (optional)'}
                    className="mt-3 w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none text-sm bg-white"
                    maxLength={250}
                  />
                )}
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCancelStep(null)}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium hover:bg-white"
                  >Keep booking</button>
                  <button
                    type="button"
                    onClick={handleProceedToConfirm}
                    disabled={quoteLoading || !reasonCode}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-sm font-semibold hover:brightness-110 disabled:opacity-60"
                  >
                    {quoteLoading ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />}
                    See refund details
                  </button>
                </div>
              </div>
            )}

            {cancelStep === 'confirm' && quote && (
              <RefundPreview
                quote={quote}
                onBack={() => setCancelStep('reason')}
                onConfirm={handleConfirmCancel}
                cancelling={cancelling}
                currency={booking.currency}
              />
            )}

            {cancelStep === 'done' && cancelResult && (
              <CancelResult result={cancelResult} currency={booking.currency} onClose={onClose} />
            )}
          </div>
        )}
      </div>

      {/* Print-only stylesheet — hides the dimmer/scroll container chrome and
          shows only the voucher when the user prints. */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .booking-voucher-print, .booking-voucher-print * { visibility: visible !important; }
          .booking-voucher-print {
            position: absolute !important;
            inset: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
          }
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
      <div className="font-medium text-ink text-sm break-words">{value || '—'}</div>
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

// ───────────── Multi-step cancel sub-components ─────────────

function StepPill({ active, done, num, label }) {
  const cls = active
    ? 'bg-brand text-white'
    : done
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-slate-100 text-slate-500';
  return (
    <div className={`px-2.5 py-1 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 ${cls}`}>
      {done ? <CheckCircle2 size={11} /> : <span className="w-3.5 h-3.5 rounded-full bg-white/30 text-[10px] flex items-center justify-center font-bold">{num}</span>}
      {label}
    </div>
  );
}

function RefundPreview({ quote, onBack, onConfirm, cancelling, currency }) {
  const refund = quote.refund || {};
  const policy = quote.policy || {};
  const tier = refund.tier || {};
  const isRefundable = policy.isRefundable !== false;
  const pct = refund.refundPercent || 0;

  return (
    <div className="bg-surface-alt/40 rounded-xl p-4">
      {/* Headline */}
      <div className={`rounded-xl p-4 mb-3 ${pct >= 100 ? 'bg-emerald-50 border border-emerald-100' : pct > 0 ? 'bg-amber-50 border border-amber-100' : 'bg-rose-50 border border-rose-100'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${pct >= 100 ? 'bg-emerald-100 text-emerald-700' : pct > 0 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
            {pct >= 100 ? <CheckCircle2 size={22} /> : pct > 0 ? <RefreshCcw size={22} /> : <XCircle size={22} />}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider font-bold text-ink-muted">You'll get back</div>
            <div className="text-2xl font-bold text-ink">
              {fmtMoney(refund.refundAmount, currency)}
              <span className="text-sm font-semibold text-ink-muted ml-2">({pct}% of {fmtMoney(quote.totalPaid, currency)})</span>
            </div>
            <div className="text-xs text-ink-muted mt-0.5">{tier.label || 'Per platform policy'}</div>
          </div>
        </div>
      </div>

      {/* Breakdown table */}
      <div className="bg-white rounded-lg p-3 mb-3 text-sm">
        <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
          <span className="text-ink-muted">Total paid</span>
          <span className="font-semibold">{fmtMoney(quote.totalPaid, currency)}</span>
        </div>
        <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
          <span className="text-ink-muted">Hours until check-in</span>
          <span className="font-semibold">{refund.hoursToCheckIn !== null ? `${refund.hoursToCheckIn}h` : '—'}</span>
        </div>
        <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
          <span className="text-ink-muted">Refund tier</span>
          <span className="font-semibold">{pct}% refund</span>
        </div>
        {refund.nonRefundableAmount > 0 && (
          <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
            <span className="text-ink-muted">Non-refundable portion</span>
            <span className="font-semibold text-rose-600">{fmtMoney(refund.nonRefundableAmount, currency)}</span>
          </div>
        )}
        {quote.walletPortion > 0 && (
          <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
            <span className="text-ink-muted inline-flex items-center gap-1"><Wallet size={11} /> Wallet portion (instant)</span>
            <span className="font-semibold text-emerald-600">{fmtMoney(quote.walletPortion, currency)}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-2 text-base font-bold">
          <span>You receive</span>
          <span className="text-brand">{fmtMoney(refund.refundAmount, currency)}</span>
        </div>
      </div>

      {/* Policy note */}
      {!isRefundable && (
        <div className="bg-rose-50 border border-rose-100 text-rose-900 text-xs rounded-lg p-3 mb-3 flex items-start gap-2">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>This item is marked non-refundable by the host — no money will be returned regardless of the policy tiers.</span>
        </div>
      )}
      {refund.processingNote && pct > 0 && (
        <div className="bg-blue-50 border border-blue-100 text-blue-900 text-xs rounded-lg p-3 mb-3 flex items-start gap-2">
          <ShieldCheck size={14} className="shrink-0 mt-0.5" />
          <span>{refund.processingNote}</span>
        </div>
      )}

      {/* Tier ladder for transparency */}
      {(policy.tiers || []).length > 1 && (
        <details className="bg-white rounded-lg p-3 mb-3 text-xs">
          <summary className="font-semibold text-ink-muted cursor-pointer">See the full refund policy</summary>
          <div className="mt-2 space-y-1">
            {policy.tiers.map((t, i) => {
              const active = t.hoursBeforeCheckIn === tier.hoursBeforeCheckIn && t.refundPercent === tier.refundPercent;
              return (
                <div key={i} className={`flex items-center justify-between py-1 px-2 rounded ${active ? 'bg-brand/10 font-semibold' : ''}`}>
                  <span className="text-ink-muted">{t.label || `≥ ${t.hoursBeforeCheckIn}h before check-in`}</span>
                  <span className={`${active ? 'text-brand' : 'text-ink'}`}>{t.refundPercent}%</span>
                </div>
              );
            })}
          </div>
        </details>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={cancelling}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium hover:bg-white disabled:opacity-60"
        >
          <ChevronLeft size={14} /> Back
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={cancelling}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold disabled:opacity-60"
        >
          {cancelling ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
          Cancel & refund {fmtMoney(refund.refundAmount, currency)}
        </button>
      </div>
    </div>
  );
}

function CancelResult({ result, currency, onClose }) {
  const refund = result.refund || {};
  const exec = refund.result || {};
  const pct = refund.refundPercent || 0;
  const isFailed = exec.refundStatus === 'failed';
  const isNone = exec.refundStatus === 'none' || pct === 0;
  return (
    <div className={`rounded-xl p-5 text-center ${isFailed ? 'bg-rose-50 border border-rose-100' : isNone ? 'bg-slate-50 border border-slate-200' : 'bg-emerald-50 border border-emerald-100'}`}>
      <div className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-3 ${isFailed ? 'bg-rose-100 text-rose-700' : isNone ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-700'}`}>
        {isFailed ? <XCircle size={26} /> : isNone ? <Info size={26} /> : <CheckCircle2 size={26} />}
      </div>
      <h3 className="font-display font-bold text-lg text-ink mb-1">
        {isFailed ? 'Refund could not be initiated' : isNone ? 'Booking cancelled' : 'Refund on the way'}
      </h3>
      <p className="text-sm text-ink-muted mb-3">
        {isFailed
          ? 'Our team has been notified and will follow up via email shortly.'
          : isNone
            ? 'No refund applies under the current policy. You will receive a confirmation email.'
            : `${fmtMoney(refund.refundAmount, currency)} is being processed back to your original payment method. Allow 5–7 business days.`}
      </p>
      {!isFailed && refund.refundAmount > 0 && (
        <div className="text-xs text-ink-muted">
          Refund status: <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${REFUND_STATUS_BADGE[exec.refundStatus]?.cls || 'bg-slate-100 text-slate-700'}`}>
            {REFUND_STATUS_BADGE[exec.refundStatus]?.label || exec.refundStatus}
          </span>
        </div>
      )}
      <button
        type="button"
        onClick={onClose}
        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:brightness-110"
      >
        Close
      </button>
    </div>
  );
}
