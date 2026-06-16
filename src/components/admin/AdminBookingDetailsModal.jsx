import { useEffect, useState } from 'react';
import {
  X, Printer, MapPin, Calendar, Users, Clock, CreditCard, FileText, User as UserIcon,
  Mail, Phone, Loader2, CheckCircle2, AlertCircle, Hotel as HotelIcon, RefreshCcw,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import {
  TYPE_LABEL, STATUS_BADGE, fmtMoney, fmtDate, fmtDateTime,
} from '../user/bookingFormatters.js';

const REFUND_STATUS_BADGE = {
  none:       { label: 'No refund',         cls: 'bg-slate-100 text-slate-700' },
  pending:    { label: 'Refund pending',    cls: 'bg-amber-100 text-amber-800' },
  processing: { label: 'Refund processing', cls: 'bg-blue-100 text-blue-800' },
  completed:  { label: 'Refund completed',  cls: 'bg-emerald-100 text-emerald-700' },
  failed:     { label: 'Refund failed',     cls: 'bg-rose-100 text-rose-700' },
};

/**
 * Admin-side details modal. Same voucher layout as the user one, but also
 * surfaces the full customer profile section and exposes admin-only actions
 * (e.g. "mark as completed"). The cancel/refund flow is on purpose hidden
 * here — admins use the data, support handles cancellations separately to
 * keep accidental fat-finger refunds at bay.
 */
export default function AdminBookingDetailsModal({ booking, open, onClose, onChanged }) {
  const [marking, setMarking] = useState(false);
  const [reconciling, setReconciling] = useState(false);

  // POST /admin/refund-policy/reconcile — ping Cashfree to refresh the refund
  // status when it's stuck on processing. Admin-only "Refresh" button next to
  // the refund badge.
  const handleReconcileRefund = async () => {
    setReconciling(true);
    try {
      const res = await api.post(`/admin/refund-policy/reconcile/${booking.bookingCode}`);
      toast.success(`Refund status: ${res.data?.data?.refundStatus || 'updated'}`);
      onChanged?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not reconcile refund');
    } finally {
      setReconciling(false);
    }
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !booking) return null;

  const item = booking.item || {};
  const pricing = booking.pricing || {};
  const badge = STATUS_BADGE[booking.status] || { label: booking.status, cls: 'bg-slate-100 text-slate-700' };
  const canMarkCompleted = booking.status === 'confirmed';

  const handleMarkCompleted = async () => {
    setMarking(true);
    try {
      await api.post(`/admin/bookings/${booking.bookingCode}/mark-completed`);
      toast.success('Marked as completed');
      onChanged?.();
      onClose?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not mark completed');
    } finally {
      setMarking(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/55 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl my-auto bg-white rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto admin-voucher-print"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-3 right-3 z-10 flex gap-2 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="p-2 rounded-full bg-white/90 hover:bg-white text-ink shadow border border-gray-200"
            title="Print"
          >
            <Printer size={16} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/90 hover:bg-white text-ink shadow border border-gray-200"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Header ribbon */}
        <div className="bg-gradient-to-r from-brand to-brand-dark text-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap pr-24 print:pr-0">
            <div>
              <div className="text-[11px] uppercase tracking-widest opacity-90">Booking</div>
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
                {booking.status === 'pending_payment' ? 'Amount due' : 'Total'}
              </div>
              <div className="font-bold text-xl sm:text-2xl">{fmtMoney(pricing.total, booking.currency)}</div>
              {booking.payment?.paidAt && (
                <div className="text-[11px] opacity-90 mt-1">Paid {fmtDateTime(booking.payment.paidAt)}</div>
              )}
            </div>
          </div>
        </div>

        {/* Two-column body: item/booking on the left, customer on the right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border-b">
          {/* Left 2/3: item + booking */}
          <div className="lg:col-span-2 border-r-0 lg:border-r border-slate-100">
            <div className="p-5 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-5 border-b border-slate-100">
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
                <h2 className="font-display font-bold text-lg leading-snug">{item?.name}</h2>
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
              </div>
            </div>

            <div className="p-5 sm:p-6 grid grid-cols-2 md:grid-cols-4 gap-4 border-b border-slate-100">
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
              <Detail icon={Clock} label={item?.type === 'room' ? 'Nights' : 'Duration'} value={booking.units} />
              <Detail icon={CreditCard} label="Payment" value={booking.payment?.paidAt ? 'Paid' : 'Pending'} />
            </div>

            {booking.specialRequests && (
              <div className="p-5 sm:p-6 border-b border-slate-100">
                <div className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">Special requests</div>
                <p className="text-sm text-ink whitespace-pre-wrap">{booking.specialRequests}</p>
              </div>
            )}

            <div className="p-5 sm:p-6">
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
                  <span>Total</span>
                  <span className="text-brand">{fmtMoney(pricing.total, booking.currency)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right 1/3: customer + payment refs */}
          <div className="p-5 sm:p-6 bg-surface-alt/30 space-y-5">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3 flex items-center gap-1.5">
                <UserIcon size={12} /> Customer
              </div>
              <div className="flex items-center gap-3 mb-3">
                {booking.user?.avatarUrl ? (
                  <img src={booking.user.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-brand text-white flex items-center justify-center font-bold">
                    {(booking.user?.name || booking.guest?.name || '?').slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-semibold text-ink truncate">{booking.user?.name || booking.guest?.name}</div>
                  <div className="text-xs text-ink-muted truncate">Joined {fmtDate(booking.user?.createdAt)}</div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <Line icon={Mail} value={booking.user?.email || booking.guest?.email} />
                <Line icon={Phone} value={booking.user?.phone || booking.guest?.phone} />
                {booking.user?.referralCode && (
                  <div className="text-xs text-ink-muted">
                    Referral code: <span className="font-mono font-semibold text-ink">{booking.user.referralCode}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3 flex items-center gap-1.5">
                <CreditCard size={12} /> Payment
              </div>
              <div className="space-y-2 text-sm">
                <KV label="Order id" value={booking.payment?.orderId ? <span className="font-mono text-xs break-all">{booking.payment.orderId}</span> : '—'} />
                <KV label="Payment id" value={booking.payment?.paymentId ? <span className="font-mono text-xs break-all">{booking.payment.paymentId}</span> : '—'} />
                <KV label="Method" value={booking.payment?.method ? <span className="capitalize">{booking.payment.method}</span> : '—'} />
                <KV label="Paid at" value={booking.payment?.paidAt ? fmtDateTime(booking.payment.paidAt) : '—'} />
              </div>
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3">Booking lead</div>
              <div className="space-y-2 text-sm">
                <KV label="Name" value={booking.guest?.name} />
                <KV label="Email" value={booking.guest?.email} />
                <KV label="Phone" value={booking.guest?.phone} />
              </div>
            </div>
          </div>
        </div>

        {(booking.status === 'cancelled' || booking.status === 'refunded') && booking.cancelledAt && (
          <div className="px-5 sm:px-6 py-4 bg-rose-50 border-t border-rose-100 text-sm text-rose-900">
            <div className="font-semibold mb-1 flex items-center gap-2 flex-wrap">
              <XCircle size={14} />
              <span>Cancelled on {fmtDateTime(booking.cancelledAt)}</span>
              {booking.refundStatus && booking.refundStatus !== 'none' && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${REFUND_STATUS_BADGE[booking.refundStatus]?.cls || 'bg-slate-100 text-slate-700'}`}>
                  {REFUND_STATUS_BADGE[booking.refundStatus]?.label || booking.refundStatus}
                </span>
              )}
              {/* Refresh button — useful when refund is stuck on processing. */}
              {booking.refundStatus === 'processing' && booking.cashfreeRefundId && (
                <button
                  type="button"
                  onClick={handleReconcileRefund}
                  disabled={reconciling}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-rose-200 text-rose-700 text-[10px] font-semibold hover:bg-rose-100 disabled:opacity-60"
                  title="Re-check Cashfree for the latest refund status"
                >
                  {reconciling ? <Loader2 size={10} className="animate-spin" /> : <RefreshCcw size={10} />}
                  Refresh
                </button>
              )}
            </div>
            {booking.cancellationReason && (
              <div className="text-rose-800 mt-1">
                Reason: {booking.cancellationReason}
                {booking.cancellationReasonCode && booking.cancellationReasonCode !== 'other' && (
                  <span className="text-xs text-rose-700 ml-2">[{booking.cancellationReasonCode}]</span>
                )}
              </div>
            )}
            {booking.refundAmount > 0 && (
              <div className="text-rose-800 mt-2 flex items-center gap-3 flex-wrap text-xs">
                <span>
                  Refund: <strong className="text-rose-900">{fmtMoney(booking.refundAmount, booking.currency)}</strong>
                </span>
                {booking.refundedAt && <span>Initiated {fmtDateTime(booking.refundedAt)}</span>}
                {booking.cashfreeRefundId && (
                  <span>Cashfree ID: <span className="font-mono">{booking.cashfreeRefundId}</span></span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Admin action bar */}
        <div className="px-5 sm:px-6 py-4 border-t flex items-center justify-between gap-3 flex-wrap print:hidden">
          <div className="text-xs text-ink-muted">
            Created {fmtDateTime(booking.createdAt)}{booking.updatedAt !== booking.createdAt && ` · Updated ${fmtDateTime(booking.updatedAt)}`}
          </div>
          <div className="flex gap-2">
            {canMarkCompleted && (
              <button
                type="button"
                onClick={handleMarkCompleted}
                disabled={marking}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60"
              >
                {marking ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Mark completed
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .admin-voucher-print, .admin-voucher-print * { visibility: visible !important; }
          .admin-voucher-print {
            position: absolute !important; inset: 0 !important;
            margin: 0 !important; box-shadow: none !important;
            border-radius: 0 !important; max-width: 100% !important;
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

function Line({ icon: Icon, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-ink">
      <Icon size={13} className="text-ink-muted shrink-0" />
      <span className="text-sm break-all">{value}</span>
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
