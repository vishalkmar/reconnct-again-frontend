import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Loader2, User as UserIcon, Calendar, CreditCard, FileText,
  Wallet, Mail, Settings, BadgeCheck, Power, ExternalLink, Copy, Gift,
  TrendingUp, CheckCircle2, Hourglass, XCircle, ChevronRight, Send,
  Tag, Phone, MapPin, RefreshCcw, Sparkles, Users as UsersIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import AdminBookingDetailsModal from '../../components/admin/AdminBookingDetailsModal.jsx';
import {
  TYPE_LABEL, STATUS_BADGE, fmtMoney, fmtDate, fmtDateTime,
} from '../../components/user/bookingFormatters.js';

const REFUND_STATUS_BADGE = {
  none:       { label: 'No refund',    cls: 'bg-slate-100 text-slate-700' },
  pending:    { label: 'Pending',      cls: 'bg-amber-100 text-amber-800' },
  processing: { label: 'Processing',   cls: 'bg-blue-100 text-blue-800' },
  completed:  { label: 'Completed',    cls: 'bg-emerald-100 text-emerald-700' },
  failed:     { label: 'Failed',       cls: 'bg-rose-100 text-rose-700' },
};

const TABS = [
  { id: 'overview',  label: 'Overview',     icon: TrendingUp },
  { id: 'personal',  label: 'Personal',     icon: UserIcon },
  { id: 'bookings',  label: 'Bookings',     icon: Calendar },
  { id: 'payments',  label: 'Payments',     icon: CreditCard },
  { id: 'vouchers',  label: 'Vouchers',     icon: FileText },
  { id: 'wallet',    label: 'Wallet',       icon: Wallet },
  { id: 'referrals', label: 'Refer & Earn', icon: Gift },
  { id: 'email',     label: 'Send Email',   icon: Mail },
  { id: 'settings',  label: 'Actions',      icon: Settings },
];

export default function AdminUserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [selectedBooking, setSelectedBooking] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/users/${id}`);
      setData(res.data?.data || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load user');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const openBooking = async (bookingCode) => {
    try {
      const res = await api.get(`/admin/bookings/${bookingCode}`);
      setSelectedBooking(res.data?.data?.booking || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load booking');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-ink-muted">
        <Loader2 className="animate-spin text-brand" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-2xl shadow-soft p-10 text-center">
        <p className="text-ink-muted">User not found.</p>
        <button
          onClick={() => navigate('/admin/users')}
          className="mt-4 inline-flex items-center gap-1.5 text-brand font-semibold text-sm hover:underline"
        >
          <ArrowLeft size={14} /> Back to users
        </button>
      </div>
    );
  }

  const { user, stats } = data;

  return (
    <div>
      {/* Top bar */}
      <button
        type="button"
        onClick={() => navigate('/admin/users')}
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-brand mb-4"
      >
        <ArrowLeft size={14} /> Back to users
      </button>

      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-soft p-5 mb-5">
        <div className="flex flex-col lg:flex-row lg:items-start gap-5">
          <Avatar user={user} size="xl" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-display font-bold text-ink">
                {user.name || <span className="italic text-ink-muted">No name yet</span>}
              </h1>
              {user.isProfileComplete ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
                  <BadgeCheck size={12} /> Profile complete
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-semibold">
                  Profile incomplete
                </span>
              )}
              {!user.isActive && (
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[11px] font-semibold">
                  Disabled
                </span>
              )}
            </div>
            <div className="text-sm text-ink-muted mt-1 flex flex-wrap gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1"><Mail size={12} />{user.email}</span>
              {user.phone && <span className="inline-flex items-center gap-1"><Phone size={12} />{user.phone}</span>}
              <span>Joined {fmtDate(user.createdAt)}</span>
              <span>Last seen {user.lastLoginAt ? fmtDateTime(user.lastLoginAt) : '—'}</span>
              {user.referralCode && (
                <span className="inline-flex items-center gap-1 font-mono text-brand">
                  <Tag size={12} /> {user.referralCode}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
          <Stat icon={TrendingUp} label="Lifetime spend" value={fmtMoney(stats.totalSpent)} accent="bg-emerald-50 text-emerald-700" />
          <Stat icon={Calendar}   label="Bookings"       value={stats.bookingCount} accent="bg-blue-50 text-blue-700" />
          <Stat icon={CheckCircle2} label="Paid"          value={stats.paidCount}    accent="bg-amber-50 text-amber-700" />
          <Stat icon={XCircle}    label="Cancelled"       value={stats.cancelledCount} accent="bg-rose-50 text-rose-700" />
          <Stat icon={Wallet}     label="Wallet balance"  value={fmtMoney(stats.walletBalance)} accent="bg-violet-50 text-violet-700" />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-100">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-4 py-3 text-sm font-semibold whitespace-nowrap inline-flex items-center gap-1.5 border-b-2 transition ${
                  active
                    ? 'border-brand text-brand'
                    : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="p-5">
          {tab === 'overview'  && <OverviewTab data={data} onOpenBooking={openBooking} />}
          {tab === 'personal'  && <PersonalTab user={user} />}
          {tab === 'bookings'  && <BookingsTab bookings={data.bookings} onOpenBooking={openBooking} />}
          {tab === 'payments'  && <PaymentsTab bookings={data.bookings} stats={stats} />}
          {tab === 'vouchers'  && <VouchersTab vouchers={data.vouchers} />}
          {tab === 'wallet'    && <WalletTab wallet={data.wallet} balance={stats.walletBalance} />}
          {tab === 'referrals' && <ReferralsTab user={user} referees={data.referees} coupons={data.coupons} />}
          {tab === 'email'     && <EmailTab user={user} />}
          {tab === 'settings'  && <SettingsTab user={user} onReload={load} />}
        </div>
      </div>

      <AdminBookingDetailsModal
        booking={selectedBooking}
        open={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onChanged={async () => {
          await load();
          if (selectedBooking?.bookingCode) {
            try {
              const res = await api.get(`/admin/bookings/${selectedBooking.bookingCode}`);
              setSelectedBooking(res.data?.data?.booking || null);
            } catch { setSelectedBooking(null); }
          }
        }}
      />
    </div>
  );
}

// ───────────────────────── Sub-components ─────────────────────────

function Avatar({ user, size = 'md' }) {
  const cls = size === 'xl' ? 'w-20 h-20 text-2xl' : 'w-10 h-10 text-sm';
  if (user.avatarUrl) {
    return <img src={fileUrl(user.avatarUrl)} alt="" className={`${cls} rounded-full object-cover shrink-0`} />;
  }
  const initials = (user.name || user.email || '?').split(/[\s@]+/).filter(Boolean).slice(0, 2).map((s) => s[0].toUpperCase()).join('') || '?';
  return (
    <div className={`${cls} rounded-full bg-brand/10 text-brand font-bold flex items-center justify-center shrink-0`}>
      {initials}
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-xl border border-slate-100 p-3 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-ink-muted">{label}</div>
        <div className="font-bold text-ink truncate">{value}</div>
      </div>
    </div>
  );
}

function CopyBtn({ value }) {
  if (!value) return null;
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(String(value));
        toast.success('Copied');
      }}
      className="text-ink-muted hover:text-brand"
      title="Copy"
    >
      <Copy size={12} />
    </button>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className="text-xs text-ink-muted uppercase tracking-wide">{label}</div>
      <div className={`text-sm text-ink text-right ${mono ? 'font-mono' : ''}`}>
        {value || <span className="text-ink-muted">—</span>}
      </div>
    </div>
  );
}

// ───────────── Overview ─────────────
function OverviewTab({ data, onOpenBooking }) {
  const { user, stats, bookings = [] } = data;
  const recent = bookings.slice(0, 5);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-5">
        <div>
          <h3 className="font-display font-bold text-ink mb-3">Recent bookings</h3>
          {recent.length === 0 ? (
            <div className="text-sm text-ink-muted bg-surface-alt/40 rounded-xl p-4">No bookings yet.</div>
          ) : (
            <div className="space-y-2">
              {recent.map((b) => <BookingMiniRow key={b.bookingCode} booking={b} onOpen={() => onOpenBooking(b.bookingCode)} />)}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-display font-bold text-ink mb-1">Snapshot</h3>
        <div className="rounded-xl border border-slate-100 p-4">
          <Row label="Total bookings" value={stats.bookingCount} />
          <Row label="Paid" value={stats.paidCount} />
          <Row label="Pending payment" value={stats.pendingCount} />
          <Row label="Cancelled" value={stats.cancelledCount} />
          <Row label="Total refunded" value={fmtMoney(stats.totalRefund)} />
          <Row label="Last paid at" value={stats.lastPaidAt ? fmtDateTime(stats.lastPaidAt) : '—'} />
          <Row label="Referees" value={stats.refereeCount} />
        </div>
      </div>
    </div>
  );
}

function BookingMiniRow({ booking, onOpen }) {
  const item = booking.item || {};
  const badge = STATUS_BADGE[booking.status] || { label: booking.status, cls: 'bg-slate-100 text-slate-700' };
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left bg-surface-alt/30 hover:bg-surface-alt/60 rounded-xl p-3 flex items-center gap-3 transition group"
    >
      {item.image ? (
        <img src={fileUrl(item.image)} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-slate-200 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[11px] text-ink-muted">{booking.bookingCode}</div>
        <div className="font-semibold text-ink text-sm truncate group-hover:text-brand transition">{item.name || 'Booking'}</div>
        <div className="text-[11px] text-ink-muted">{TYPE_LABEL[item.type] || item.type} · {fmtDate(booking.scheduledFor)}</div>
      </div>
      <div className="text-right shrink-0">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.cls}`}>
          {badge.label}
        </span>
        <div className="text-sm font-bold text-brand mt-1">{fmtMoney(booking.pricing?.total)}</div>
      </div>
      <ChevronRight size={14} className="text-ink-muted group-hover:text-brand transition" />
    </button>
  );
}

// ───────────── Personal ─────────────
function PersonalTab({ user }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div>
        <h3 className="font-display font-bold text-ink mb-3">Identity</h3>
        <div className="rounded-xl border border-slate-100 p-4">
          <Row label="User ID" value={<><span className="font-mono">{user.id}</span> <CopyBtn value={user.id} /></>} />
          <Row label="Name" value={user.name} />
          <Row label="Email" value={<><span>{user.email}</span> <CopyBtn value={user.email} /></>} />
          <Row label="Phone" value={<><span>{user.phone}</span> <CopyBtn value={user.phone} /></>} />
          <Row label="Gender" value={user.gender} />
          <Row label="Date of birth" value={user.dob ? fmtDate(user.dob) : '—'} />
        </div>
      </div>
      <div>
        <h3 className="font-display font-bold text-ink mb-3">Address</h3>
        <div className="rounded-xl border border-slate-100 p-4">
          <Row label="Address" value={user.addressLine} />
          <Row label="City" value={user.city} />
          <Row label="State" value={user.state} />
          <Row label="Country" value={user.country} />
          <Row label="Pincode" value={user.pincode} />
        </div>

        <h3 className="font-display font-bold text-ink mt-5 mb-3">Account</h3>
        <div className="rounded-xl border border-slate-100 p-4">
          <Row label="Created" value={fmtDateTime(user.createdAt)} />
          <Row label="Last updated" value={fmtDateTime(user.updatedAt)} />
          <Row label="Last login" value={user.lastLoginAt ? fmtDateTime(user.lastLoginAt) : '—'} />
          <Row label="Status" value={user.isActive ? 'Active' : 'Disabled'} />
          <Row label="Referral code" value={<><span className="font-mono">{user.referralCode || '—'}</span> {user.referralCode && <CopyBtn value={user.referralCode} />}</>} />
          {user.referrer && (
            <Row label="Referred by" value={<span>{user.referrer.name || user.referrer.email} <span className="text-ink-muted font-mono">({user.referrer.referralCode})</span></span>} />
          )}
        </div>
      </div>
    </div>
  );
}

// ───────────── Bookings ─────────────
function BookingsTab({ bookings = [], onOpenBooking }) {
  if (bookings.length === 0) {
    return <div className="text-sm text-ink-muted bg-surface-alt/40 rounded-xl p-6 text-center">This user has no bookings yet.</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px]">
        <thead className="bg-surface-alt/60 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
          <tr>
            <th className="text-left px-3 py-2">Booking</th>
            <th className="text-left px-3 py-2">Item</th>
            <th className="text-left px-3 py-2">When</th>
            <th className="text-left px-3 py-2">Status</th>
            <th className="text-right px-3 py-2">Total</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {bookings.map((b) => {
            const item = b.item || {};
            const badge = STATUS_BADGE[b.status] || { label: b.status, cls: 'bg-slate-100 text-slate-700' };
            return (
              <tr
                key={b.bookingCode}
                onClick={() => onOpenBooking(b.bookingCode)}
                className="hover:bg-surface-alt/40 cursor-pointer transition group"
              >
                <td className="px-3 py-3 align-top">
                  <div className="font-mono text-[11px] text-ink-muted">{b.bookingCode}</div>
                  <div className="text-[11px] text-ink-muted">{fmtDate(b.createdAt)}</div>
                </td>
                <td className="px-3 py-3 align-top">
                  <div className="font-semibold text-ink text-sm group-hover:text-brand transition truncate max-w-[260px]">{item.name || 'Booking'}</div>
                  <div className="text-[11px] text-ink-muted">{TYPE_LABEL[item.type] || item.type}</div>
                </td>
                <td className="px-3 py-3 align-top text-sm text-ink-muted">
                  {b.scheduledFor ? fmtDate(b.scheduledFor) : '—'}
                  {b.scheduledEndAt && <> → {fmtDate(b.scheduledEndAt)}</>}
                </td>
                <td className="px-3 py-3 align-top">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.cls}`}>{badge.label}</span>
                </td>
                <td className="px-3 py-3 align-top text-right font-bold text-brand">{fmtMoney(b.pricing?.total)}</td>
                <td className="px-3 py-3 align-middle text-right">
                  <ChevronRight size={14} className="text-ink-muted group-hover:text-brand inline-block transition" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ───────────── Payments ─────────────
function PaymentsTab({ bookings = [], stats }) {
  const paid = bookings.filter((b) => b.payment?.paidAt);
  if (paid.length === 0) {
    return <div className="text-sm text-ink-muted bg-surface-alt/40 rounded-xl p-6 text-center">No payments on file.</div>;
  }
  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <Stat icon={TrendingUp}  label="Total received" value={fmtMoney(stats.totalSpent)}  accent="bg-emerald-50 text-emerald-700" />
        <Stat icon={RefreshCcw}  label="Refunded"       value={fmtMoney(stats.totalRefund)} accent="bg-rose-50 text-rose-700" />
        <Stat icon={CreditCard}  label="Net"            value={fmtMoney((stats.totalSpent || 0) - (stats.totalRefund || 0))} accent="bg-blue-50 text-blue-700" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead className="bg-surface-alt/60 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="text-left px-3 py-2">Paid at</th>
              <th className="text-left px-3 py-2">Booking</th>
              <th className="text-left px-3 py-2">Payment ID</th>
              <th className="text-left px-3 py-2">Method</th>
              <th className="text-right px-3 py-2">Amount</th>
              <th className="text-right px-3 py-2">Refund</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paid.map((b) => (
              <tr key={b.bookingCode}>
                <td className="px-3 py-3 text-sm text-ink-muted">{fmtDateTime(b.payment.paidAt)}</td>
                <td className="px-3 py-3">
                  <div className="font-mono text-[11px] text-ink-muted">{b.bookingCode}</div>
                  <div className="text-xs text-ink truncate max-w-[200px]">{b.item?.name}</div>
                </td>
                <td className="px-3 py-3 text-xs font-mono text-ink-muted">
                  {b.payment.paymentId || '—'} {b.payment.paymentId && <CopyBtn value={b.payment.paymentId} />}
                </td>
                <td className="px-3 py-3 text-xs text-ink-muted">{b.payment.method || '—'}</td>
                <td className="px-3 py-3 text-right font-bold text-brand">{fmtMoney(b.pricing?.total)}</td>
                <td className="px-3 py-3 text-right text-sm">
                  {b.refundAmount > 0 ? (
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-rose-600 font-semibold">- {fmtMoney(b.refundAmount)}</span>
                      {b.refundStatus && b.refundStatus !== 'none' && (
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${REFUND_STATUS_BADGE[b.refundStatus]?.cls || 'bg-slate-100 text-slate-700'}`}>
                          {REFUND_STATUS_BADGE[b.refundStatus]?.label || b.refundStatus}
                        </span>
                      )}
                    </div>
                  ) : <span className="text-ink-muted">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ───────────── Vouchers ─────────────
function VouchersTab({ vouchers = [] }) {
  if (vouchers.length === 0) {
    return (
      <div className="text-sm text-ink-muted bg-surface-alt/40 rounded-xl p-6 text-center">
        No vouchers — vouchers are generated only for confirmed/completed paid bookings.
      </div>
    );
  }
  const adminToken = localStorage.getItem('admin_token');
  const baseUrl = import.meta.env.VITE_API_URL || '/api';
  const openVoucher = async (voucher) => {
    // The voucher endpoint is auth-protected, so we fetch it as a blob (the
    // token rides the header), then open it in a new tab as an object URL.
    try {
      const res = await fetch(`${baseUrl}${voucher.voucherUrl.replace(/^\/api/, '')}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      // Free the blob URL once the new tab has a chance to load it.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      toast.error(`Could not open voucher: ${err.message}`);
    }
  };
  return (
    <div className="space-y-2">
      <p className="text-xs text-ink-muted mb-3">
        Voucher opens in a new tab with a "Save / Print PDF" button — the browser's print dialog handles PDF export.
      </p>
      {vouchers.map((v) => (
        <div key={v.bookingCode} className="bg-surface-alt/30 hover:bg-surface-alt/60 rounded-xl p-3 flex items-center gap-3 transition">
          <div className="w-10 h-10 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
            <FileText size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[11px] text-ink-muted">{v.bookingCode}</div>
            <div className="font-semibold text-ink text-sm truncate">{v.itemName}</div>
            <div className="text-[11px] text-ink-muted">{TYPE_LABEL[v.itemType] || v.itemType} · {v.scheduledFor ? fmtDate(v.scheduledFor) : '—'}</div>
          </div>
          <div className="text-right shrink-0 mr-3">
            <div className="font-bold text-brand text-sm">{fmtMoney(v.total)}</div>
          </div>
          <button
            type="button"
            onClick={() => openVoucher(v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand/90 transition"
          >
            <ExternalLink size={12} /> Open
          </button>
        </div>
      ))}
    </div>
  );
}

// ───────────── Wallet ─────────────
function WalletTab({ wallet = [], balance }) {
  return (
    <div>
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 text-white p-5 mb-5">
        <div className="text-[11px] uppercase tracking-wider opacity-80">Current balance</div>
        <div className="text-3xl font-display font-bold mt-1">{fmtMoney(balance)}</div>
        <div className="text-xs opacity-80 mt-1">{wallet.length} transactions on file</div>
      </div>
      {wallet.length === 0 ? (
        <div className="text-sm text-ink-muted bg-surface-alt/40 rounded-xl p-6 text-center">No wallet activity yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[660px]">
            <thead className="bg-surface-alt/60 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="text-left px-3 py-2">When</th>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Description</th>
                <th className="text-right px-3 py-2">Amount</th>
                <th className="text-right px-3 py-2">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {wallet.map((w) => (
                <tr key={w.id}>
                  <td className="px-3 py-3 text-sm text-ink-muted">{fmtDateTime(w.createdAt)}</td>
                  <td className="px-3 py-3 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{w.type}</span>
                  </td>
                  <td className="px-3 py-3 text-sm text-ink truncate max-w-[260px]">{w.description || '—'}</td>
                  <td className={`px-3 py-3 text-right font-bold ${w.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {w.amount >= 0 ? '+ ' : '- '}{fmtMoney(Math.abs(w.amount))}
                  </td>
                  <td className="px-3 py-3 text-right text-sm font-semibold text-ink">{fmtMoney(w.balanceAfter)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ───────────── Referrals ─────────────
function ReferralsTab({ user, referees = [], coupons = [] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div>
        <h3 className="font-display font-bold text-ink mb-3 inline-flex items-center gap-2">
          <UsersIcon size={16} /> Referees ({referees.length})
        </h3>
        {referees.length === 0 ? (
          <div className="text-sm text-ink-muted bg-surface-alt/40 rounded-xl p-4">Nobody has signed up with {user.referralCode || 'this user\'s code'} yet.</div>
        ) : (
          <div className="space-y-2">
            {referees.map((r) => (
              <div key={r.id} className="bg-surface-alt/30 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-ink text-sm truncate">{r.name || r.email}</div>
                  <div className="text-[11px] text-ink-muted">Joined {fmtDate(r.createdAt)}</div>
                </div>
                {r.isProfileComplete ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Active</span>
                ) : (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Incomplete</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-display font-bold text-ink mb-3 inline-flex items-center gap-2">
          <Sparkles size={16} /> Personal coupons ({coupons.length})
        </h3>
        {coupons.length === 0 ? (
          <div className="text-sm text-ink-muted bg-surface-alt/40 rounded-xl p-4">No personal coupons issued.</div>
        ) : (
          <div className="space-y-2">
            {coupons.map((c) => (
              <div key={c.id} className="bg-surface-alt/30 rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono text-sm font-bold text-ink">{c.code}</div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{c.reason}</span>
                </div>
                <div className="text-xs text-ink-muted mt-1">
                  {c.kind === 'percent' ? `${c.value}% off` : `${fmtMoney(c.value)} off`}
                  {c.expiresAt && <> · Expires {fmtDate(c.expiresAt)}</>}
                  {' · '}{c.timesUsed}/{c.usageLimit} used
                  {c.isExhausted && <span className="text-rose-600 font-semibold"> · Exhausted</span>}
                  {!c.isActive && <span className="text-ink-muted"> · Inactive</span>}
                </div>
                {c.description && <div className="text-xs text-ink-muted mt-1">{c.description}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────── Send Email ─────────────
function EmailTab({ user }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const preview = useMemo(() => body || '<p class="text-ink-muted italic">Preview will show here as you type…</p>', [body]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      toast.error('Subject and body are both required');
      return;
    }
    setSending(true);
    try {
      await api.post(`/admin/users/${user.id}/send-email`, { subject: subject.trim(), html: body });
      toast.success(`Email sent to ${user.email}`);
      setSubject('');
      setBody('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSend} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div>
        <h3 className="font-display font-bold text-ink mb-3 inline-flex items-center gap-2">
          <Mail size={16} /> Compose
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1">To</label>
            <input
              type="text"
              value={user.email}
              readOnly
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-slate-50 text-sm text-ink-muted"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. About your recent booking"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1">Body (HTML allowed)</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={`Hello ${user.name || 'there'},\n\n<p>Thanks for choosing Retreats by Traveon…</p>`}
              rows={14}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand text-white text-sm font-bold hover:bg-brand/90 transition disabled:opacity-60"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {sending ? 'Sending…' : 'Send email'}
          </button>
        </div>
      </div>

      <div>
        <h3 className="font-display font-bold text-ink mb-3">Live preview</h3>
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-[#f5f6f8]">
          <div className="bg-slate-900 text-white text-xs px-3 py-2 flex items-center justify-between">
            <span>{subject || '(no subject)'}</span>
            <span className="opacity-70">to {user.email}</span>
          </div>
          <div className="p-4 bg-white max-h-[520px] overflow-y-auto">
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: preview }}
            />
          </div>
        </div>
      </div>
    </form>
  );
}

// ───────────── Settings / Actions ─────────────
function SettingsTab({ user, onReload }) {
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    if (!window.confirm(user.isActive
      ? `Disable ${user.email}? They won't be able to log in until you re-enable.`
      : `Re-enable ${user.email}? They'll be able to log in again.`)) return;
    setToggling(true);
    try {
      await api.post(`/admin/users/${user.id}/toggle-active`);
      toast.success(user.isActive ? 'User disabled' : 'User enabled');
      await onReload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update user');
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="max-w-xl space-y-4">
      <div className="rounded-xl border border-slate-100 p-4 flex items-center justify-between gap-4">
        <div>
          <div className="font-semibold text-ink text-sm">Account access</div>
          <div className="text-xs text-ink-muted mt-1">
            {user.isActive
              ? 'User can sign in via OTP and use the platform.'
              : 'User is disabled — OTP login will be blocked until re-enabled.'}
          </div>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          disabled={toggling}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition disabled:opacity-60 ${
            user.isActive ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          {toggling ? <Loader2 size={12} className="animate-spin" /> : <Power size={12} />}
          {user.isActive ? 'Disable user' : 'Enable user'}
        </button>
      </div>
    </div>
  );
}
