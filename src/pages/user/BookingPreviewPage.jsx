import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Users, MapPin, Loader2, Shield, ChevronRight, BedDouble, AlertCircle,
  Tag, Wallet, Check, X as XIcon, Plus, Baby,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import { useUserAuth } from '../../context/UserAuthContext.jsx';
import DatePicker from '../../components/common/DatePicker.jsx';
import { matchTier } from '../../utils/roomPricing.js';

const TYPE_LABEL = {
  package: 'Retreat',
  room: 'Hotel Room',
  event: 'Event',
  addon: 'Add-on Activity',
  event_activity: 'Event / Activity',
};

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

const todayISO = () => new Date().toISOString().slice(0, 10);

const addDaysISO = (iso, days) => {
  const d = iso ? new Date(iso) : new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export default function BookingPreviewPage() {
  const { type, id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useUserAuth();

  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form fields. Sensible defaults so the page is immediately usable on every
  // item type — the user only tweaks what's wrong.
  const [scheduledFor, setScheduledFor] = useState(() => params.get('from') || todayISO());
  // Detail pages may pass either an explicit `to=` checkout or a `nights=N`
  // count. The room detail page uses `nights`; the hotel stay picker uses
  // `to`. Derive a sensible checkout in either case.
  const [scheduledEndAt, setScheduledEndAt] = useState(() => {
    const explicit = params.get('to');
    if (explicit) return explicit;
    const n = parseInt(params.get('nights'), 10);
    if (Number.isFinite(n) && n > 0) {
      return addDaysISO(params.get('from') || todayISO(), n);
    }
    return '';
  });
  const [guestCount, setGuestCount] = useState(() => parseInt(params.get('guests'), 10) || 1);
  // Room bookings carry an extra `rooms` count — the hotel detail page
  // seeds this from the stay picker. Defaults to 1 for non-room items.
  const [roomCount, setRoomCount] = useState(() => Math.max(1, parseInt(params.get('rooms'), 10) || 1));
  // Extra guests priced by age band + bed (room bookings only). Each:
  // { age, bed }. Pre-seeded from the room detail page's `extra=` param.
  const [extraPersons, setExtraPersons] = useState(() => {
    try {
      const raw = params.get('extra');
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr)
        ? arr.map((p) => ({ age: Number.isInteger(p?.age) ? p.age : '', bed: p?.bed === 'with' ? 'with' : 'without' }))
        : [];
    } catch { return []; }
  });
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  // Coupon + wallet — both are part of the preview payload so the backend's
  // pricing math is the only source of truth. Frontend just collects intent.
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);  // { code, ok, reason, discountPaise, description }
  const [useWallet, setUseWallet] = useState(false);

  // Hydrate guest fields from the user profile the first time it lands.
  useEffect(() => {
    if (user) {
      setGuestName((prev) => prev || user.name || '');
      setGuestEmail((prev) => prev || user.email || '');
      setGuestPhone((prev) => prev || user.phone || '');
    }
  }, [user]);

  // Re-quote whenever any input that affects price changes. We deliberately
  // depend on `appliedCoupon?.code` (a string) not `appliedCoupon` (an object)
  // so re-renders that don't actually change the code don't refire the call.
  // The backend's validation result is read straight off `preview.coupon`
  // (see the badge below) — no client-side mirror to keep in sync.
  const appliedCouponCode = appliedCoupon?.code || null;
  const fetchPreview = useCallback(async () => {
    setPreviewing(true);
    try {
      const res = await api.post('/bookings/preview', {
        itemType: type,
        itemId: id,
        scheduledFor: scheduledFor || null,
        scheduledEndAt: scheduledEndAt || null,
        guestCount,
        roomCount,
        extraPersons,
        // Only send a coupon if the user actually applied one. Sending the raw
        // input as they type would spam the validator with errors.
        couponCode: appliedCouponCode,
        useWallet: useWallet === true,
      });
      setPreview(res.data?.data || null);
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not load the booking preview';
      toast.error(msg);
      setPreview(null);
    } finally {
      setPreviewing(false);
    }
  }, [type, id, scheduledFor, scheduledEndAt, guestCount, roomCount, extraPersons, appliedCouponCode, useWallet]);

  useEffect(() => { fetchPreview(); }, [fetchPreview]);

  // Default the check-out to "next day" the moment a check-in is picked for
  // a room booking, so the user doesn't see a confusing 0-night quote.
  useEffect(() => {
    if (type === 'room' && scheduledFor && !scheduledEndAt) {
      setScheduledEndAt(addDaysISO(scheduledFor, 1));
    }
  }, [type, scheduledFor, scheduledEndAt]);

  const item = preview?.item;
  const pricing = preview?.pricing;
  const schedule = preview?.schedule;

  // Per-type form configuration kept in one place so the JSX below stays clean.
  const config = useMemo(() => {
    if (type === 'room') {
      return {
        showCheckOut: true,
        scheduledLabel: 'Check-in',
        scheduledEndLabel: 'Check-out',
        showGuestCount: true,
        guestLabel: 'Guests',
        guestMax: item?.meta?.maxOccupancy || 10,
        unitLabel: (n) => `${n} night${n === 1 ? '' : 's'}`,
      };
    }
    if (type === 'event') {
      return {
        showCheckOut: false,
        scheduledLabel: 'Event date',
        scheduledEndLabel: null,
        scheduledReadonly: true,
        showGuestCount: true,
        guestLabel: 'Tickets',
        guestMax: 20,
        unitLabel: () => '',
      };
    }
    if (type === 'package') {
      return {
        showCheckOut: false,
        scheduledLabel: 'Start date',
        scheduledEndLabel: null,
        showGuestCount: true,
        guestLabel: 'Travellers',
        guestMax: item?.meta?.maxGroupSize || 30,
        unitLabel: (n) => `${item?.meta?.durationDays || 1} day${item?.meta?.durationDays === 1 ? '' : 's'}`,
      };
    }
    if (type === 'event_activity') {
      return {
        showCheckOut: false,
        scheduledLabel: 'Preferred date',
        scheduledEndLabel: null,
        showGuestCount: true,
        guestLabel: 'Tickets',
        guestMax: 30,
        unitLabel: () => '',
      };
    }
    // addon
    return {
      showCheckOut: false,
      scheduledLabel: 'Activity date',
      scheduledEndLabel: null,
      showGuestCount: true,
      guestLabel: 'Participants',
      guestMax: 20,
      unitLabel: () => '',
    };
  }, [type, item]);

  // Lock the event date to whatever the event itself says — they're not
  // user-selectable.
  useEffect(() => {
    if (type === 'event' && item?.meta?.eventDate) {
      setScheduledFor(item.meta.eventDate);
    }
  }, [type, item?.meta?.eventDate]);

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    // Optimistically set "applied with code" — fetchPreview is the truth.
    setAppliedCoupon({ code, ok: true });
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
  };

  // fetchPreview already re-runs on appliedCouponCode + useWallet changes via
  // its own dependency array — no second trigger needed.

  const handleSubmit = async () => {
    if (!guestName.trim()) { toast.error('Please enter the guest name'); return; }
    if (!guestPhone.trim()) { toast.error('Please enter a contact number'); return; }

    setSubmitting(true);
    try {
      const res = await api.post('/bookings', {
        itemType: type,
        itemId: id,
        scheduledFor: scheduledFor || null,
        scheduledEndAt: config.showCheckOut ? (scheduledEndAt || null) : null,
        guestCount,
        roomCount,
        extraPersons,
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim(),
        guestPhone: guestPhone.trim(),
        specialRequests: specialRequests.trim() || null,
        // Only send the code if backend has confirmed it's valid in the latest
        // preview round-trip — otherwise booking creation would 400.
        couponCode: appliedCoupon && preview?.coupon?.ok ? appliedCoupon.code : null,
        useWallet: useWallet === true,
      });
      const booking = res.data?.data?.booking;
      if (!booking) throw new Error('Booking did not return');
      toast.success('Booking created — proceeding to payment');
      navigate(`/checkout/${booking.bookingCode}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create booking');
    } finally {
      setSubmitting(false);
    }
  };

  if (previewing && !preview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-alt">
        <Loader2 className="animate-spin text-brand" size={28} />
      </div>
    );
  }

  if (!preview || !item) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-alt px-4 text-center">
        <AlertCircle size={36} className="text-rose-500 mb-3" />
        <h1 className="text-xl font-semibold">We couldn't load this booking</h1>
        <p className="text-sm text-ink-muted mt-1 max-w-md">
          The item may be inactive or no longer available. Try going back and picking another.
        </p>
        <Link to="/" className="mt-5 px-5 py-2.5 rounded-lg bg-brand text-white font-medium">Back to home</Link>
      </div>
    );
  }

  const breadcrumb = TYPE_LABEL[type] || 'Booking';

  return (
    <div className="min-h-screen bg-surface-alt pb-12">
      <div className="bg-white border-b">
        <div className="container-app py-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-brand transition"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div className="text-sm text-ink-muted flex items-center gap-1.5">
            <span>{breadcrumb}</span>
            <ChevronRight size={14} />
            <span className="text-ink font-medium">Review &amp; Continue</span>
          </div>
        </div>
      </div>

      <div className="container-app pt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: item summary + traveller form */}
        <div className="lg:col-span-2 space-y-5">
          {/* Item snapshot */}
          <article className="bg-white rounded-2xl shadow-soft overflow-hidden flex flex-col sm:flex-row">
            <div className="sm:w-56 h-44 sm:h-auto bg-slate-100 shrink-0">
              {item.image ? (
                <img src={fileUrl(item.image)} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-ink-muted">
                  <BedDouble size={28} />
                </div>
              )}
            </div>
            <div className="flex-1 p-5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-brand mb-1">{breadcrumb}</div>
              <h1 className="font-display font-bold text-xl leading-snug">{item.name}</h1>
              {item.hotel?.name && (
                <div className="text-xs text-ink-muted mt-0.5">{item.hotel.name}</div>
              )}
              {item.location && (
                <div className="text-sm text-ink-muted mt-1 inline-flex items-center gap-1">
                  <MapPin size={13} /> {item.location}
                </div>
              )}
              {type === 'event' && item.meta?.eventDate && (
                <div className="text-sm text-ink-muted mt-1 inline-flex items-center gap-1">
                  <Calendar size={13} /> {fmtDate(item.meta.eventDate)}
                  {item.meta.startTime && ` · ${item.meta.startTime}`}
                  {item.meta.endTime && ` – ${item.meta.endTime}`}
                </div>
              )}
              {type === 'package' && item.meta && (item.meta.durationDays || item.meta.durationNights) && (
                <div className="text-sm text-ink-muted mt-1">
                  {item.meta.durationDays}d · {item.meta.durationNights}n
                </div>
              )}
              {type === 'room' && item.meta?.roomSize && (
                <div className="text-sm text-ink-muted mt-1">
                  {item.meta.roomSize}{item.meta.maxOccupancy ? ` · Sleeps ${item.meta.maxOccupancy}` : ''}
                </div>
              )}
            </div>
          </article>

          {/* Schedule */}
          <section className="bg-white rounded-2xl shadow-soft p-5">
            <h2 className="font-semibold text-ink mb-3 flex items-center gap-2">
              <Calendar size={18} className="text-brand" /> When
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={config.scheduledLabel}>
                <DatePicker
                  value={scheduledFor || ''}
                  min={todayISO()}
                  onChange={(iso) => setScheduledFor(iso)}
                  disabled={config.scheduledReadonly}
                  placeholder={config.scheduledLabel}
                />
              </Field>
              {config.showCheckOut && (
                <Field label={config.scheduledEndLabel}>
                  <DatePicker
                    value={scheduledEndAt || ''}
                    min={scheduledFor ? addDaysISO(scheduledFor, 1) : todayISO()}
                    onChange={(iso) => setScheduledEndAt(iso)}
                    placeholder={config.scheduledEndLabel}
                  />
                </Field>
              )}
              {config.showGuestCount && (
                <Field label={config.guestLabel}>
                  <input
                    type="number"
                    min={1}
                    max={config.guestMax * (type === 'room' ? roomCount : 1)}
                    value={guestCount}
                    onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="input"
                  />
                </Field>
              )}
              {type === 'room' && (
                <Field label="Rooms">
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={roomCount}
                    onChange={(e) => setRoomCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="input"
                  />
                </Field>
              )}
            </div>

            {/* Extra guests priced by age (rooms only, when configured) */}
            {type === 'room' && Array.isArray(item?.meta?.extraPersonTiers) && item.meta.extraPersonTiers.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-ink flex items-center gap-1.5">
                    <Baby size={15} className="text-brand" /> Add extra guests
                  </h3>
                  <button
                    type="button"
                    onClick={() => setExtraPersons((p) => [...p, { age: '' }])}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                  >
                    <Plus size={14} /> Add person
                  </button>
                </div>
                <p className="text-[11px] text-ink-muted mb-2">
                  Adults are counted in {config.guestLabel.toLowerCase()}. Add children/extra guests with their
                  age — pricing updates live and a second room is added automatically once occupancy is exceeded.
                </p>
                {extraPersons.length === 0 ? (
                  <p className="text-xs italic text-ink-muted">No extra guests added.</p>
                ) : (
                  <div className="space-y-2">
                    {extraPersons.map((p, idx) => {
                      const tier = matchTier(item.meta.extraPersonTiers || [], p);
                      const priceLabel = p.age === ''
                        ? 'Pick an age'
                        : !tier || tier.priceType === 'free'
                          ? 'Complementary'
                          : `${item.currency || 'INR'} ${Number(tier.price).toLocaleString()}/night`;
                      return (
                        <div key={idx} className="flex items-center gap-2">
                          <select
                            value={p.age}
                            onChange={(e) => setExtraPersons((arr) => arr.map((x, i) => (i === idx ? { ...x, age: e.target.value === '' ? '' : parseInt(e.target.value, 10) } : x)))}
                            className="input w-28"
                          >
                            <option value="">Age…</option>
                            {Array.from({ length: 16 }, (_, a) => (
                              <option key={a} value={a}>{a >= 15 ? '15+ (adult)' : `${a} yr`}</option>
                            ))}
                          </select>
                          <select
                            value={p.bed}
                            onChange={(e) => setExtraPersons((arr) => arr.map((x, i) => (i === idx ? { ...x, bed: e.target.value } : x)))}
                            className="input w-32"
                          >
                            <option value="without">Without bed</option>
                            <option value="with">With bed</option>
                          </select>
                          <span className="flex-1 text-xs text-ink-muted truncate">{priceLabel}</span>
                          <button
                            type="button"
                            onClick={() => setExtraPersons((arr) => arr.filter((_, i) => i !== idx))}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                            title="Remove"
                          >
                            <XIcon size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Guest details */}
          <section className="bg-white rounded-2xl shadow-soft p-5">
            <h2 className="font-semibold text-ink mb-3 flex items-center gap-2">
              <Users size={18} className="text-brand" /> Lead traveller
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full name" required>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="As on your ID"
                  className="input"
                  required
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="input"
                  placeholder="you@example.com"
                />
              </Field>
              <Field label="Phone" required>
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="input"
                  placeholder="+91 98765 43210"
                  required
                />
              </Field>
              <Field label="Special requests" className="sm:col-span-2">
                <textarea
                  rows={3}
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  className="input resize-none"
                  placeholder="Dietary preferences, accessibility, anything we should know…"
                  maxLength={1000}
                />
              </Field>
            </div>
          </section>

          {/* Trust strip */}
          <section className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex items-start gap-3 text-sm text-emerald-900">
            <Shield size={20} className="shrink-0 mt-0.5 text-emerald-600" />
            <div>
              <strong>Secure booking.</strong> Your payment is processed through Cashfree — we never see or store your card.
              You'll receive a voucher and confirmation email the moment your payment succeeds.
            </div>
          </section>
        </div>

        {/* Right column: price breakdown */}
        <aside className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-soft p-5 sticky top-20">
            <h3 className="font-semibold text-ink mb-3">Price summary</h3>
            <div className="text-xs text-ink-muted mb-3">
              {fmtMoney(pricing?.display?.unitPrice, pricing?.currency)} × {pricing?.quantity}
              {pricing?.priceUnitLabel
                ? ` (${pricing.priceUnitLabel})`
                : (config.unitLabel ? ` (${config.unitLabel(pricing?.quantity)})` : '')}
              {type === 'room' && pricing?.roomsResolved > roomCount && (
                <div className="text-[11px] text-amber-700 mt-1">
                  Party needs {pricing.roomsResolved} rooms — adjusted automatically.
                </div>
              )}
            </div>

            {type === 'room' && pricing?.display?.extraPersons > 0 && (
              <Row
                label={`Extra guests${pricing?.extraPersonsCount ? ` (${pricing.extraPersonsCount})` : ''}`}
                value={fmtMoney(pricing.display.extraPersons, pricing.currency)}
              />
            )}
            <Row label="Subtotal" value={fmtMoney(pricing?.display?.subtotal, pricing?.currency)} />
            {Number(pricing?.display?.gst) > 0 && (
              <Row label={`GST (${Number(pricing?.gstRate || 0)}%)`} value={fmtMoney(pricing.display.gst, pricing.currency)} />
            )}
            {Number(pricing?.display?.tcs) > 0 && (
              <Row label={`TCS (${Number(pricing?.tcsRate || 0)}%)`} value={fmtMoney(pricing.display.tcs, pricing.currency)} />
            )}
            {pricing?.display?.walletDiscount > 0 && (
              <Row label="Wallet credit" value={`− ${fmtMoney(pricing.display.walletDiscount, pricing.currency)}`} accent="text-emerald-600" />
            )}
            {pricing?.display?.couponDiscount > 0 && (
              <Row label={`Coupon ${appliedCoupon?.code || ''}`.trim()} value={`− ${fmtMoney(pricing.display.couponDiscount, pricing.currency)}`} accent="text-emerald-600" />
            )}

            {/* Coupon + wallet controls — collapsed in their own little block so
                the price summary stays scannable. Both are auto-clamped server-
                side, so the UI just shows the resulting discount. */}
            <div className="my-3 border-t" />

            <div className="space-y-3 mb-3">
              {/* Coupon. `appliedCoupon` carries the user's intent (the code
                  they typed and pressed Apply on); `preview.coupon` is the
                  backend's authoritative verdict on that code. */}
              {appliedCoupon && preview?.coupon?.ok ? (
                <div className="flex items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm">
                  <div className="min-w-0 flex items-center gap-2 text-emerald-800">
                    <Check size={14} className="shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{appliedCoupon.code} applied</div>
                      {preview.coupon.description && (
                        <div className="text-[11px] text-emerald-700 truncate">{preview.coupon.description}</div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="shrink-0 p-1 rounded hover:bg-emerald-100 text-emerald-700"
                    aria-label="Remove coupon"
                  >
                    <XIcon size={14} />
                  </button>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-medium text-ink-muted mb-1.5 inline-flex items-center gap-1.5">
                    <Tag size={12} /> Have a coupon code?
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="WELCOME-XXX"
                      className="input flex-1 uppercase tracking-wider !text-xs"
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      disabled={!couponInput.trim() || previewing}
                      className="px-3 py-2 rounded-lg bg-brand text-white text-xs font-semibold hover:brightness-110 disabled:opacity-50"
                    >Apply</button>
                  </div>
                  {appliedCoupon && preview?.coupon && !preview.coupon.ok && (
                    <div className="text-[11px] text-rose-600 mt-1">{preview.coupon.reason}</div>
                  )}
                </div>
              )}

              {/* Wallet */}
              {preview?.walletAvailablePaise > 0 && (
                <label className="flex items-start gap-2 p-2.5 rounded-lg border border-gray-200 hover:border-brand/40 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={useWallet}
                    onChange={(e) => setUseWallet(e.target.checked)}
                    className="mt-0.5 accent-brand"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 font-medium text-ink">
                      <Wallet size={13} className="text-brand" />
                      Use wallet balance
                    </div>
                    <div className="text-[11px] text-ink-muted mt-0.5">
                      Available: <strong>{fmtMoney(preview.walletAvailablePaise / 100, pricing?.currency)}</strong>
                    </div>
                  </div>
                </label>
              )}
            </div>

            <div className="my-3 border-t" />
            <Row label="Total payable" value={fmtMoney(pricing?.display?.total, pricing?.currency)} bold />

            {schedule?.scheduledFor && (
              <div className="mt-4 pt-4 border-t text-xs text-ink-muted space-y-1">
                <div className="flex justify-between"><span>{config.scheduledLabel}</span><span className="text-ink font-medium">{fmtDate(schedule.scheduledFor)}</span></div>
                {config.showCheckOut && schedule.scheduledEndAt && (
                  <div className="flex justify-between"><span>{config.scheduledEndLabel}</span><span className="text-ink font-medium">{fmtDate(schedule.scheduledEndAt)}</span></div>
                )}
                <div className="flex justify-between"><span>{config.guestLabel}</span><span className="text-ink font-medium">{guestCount}</span></div>
                {type === 'room' && (
                  <div className="flex justify-between"><span>Rooms</span><span className="text-ink font-medium">{roomCount}</span></div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || previewing}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-brand text-white font-semibold py-3 rounded-lg hover:brightness-110 disabled:opacity-60 transition"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : 'Continue to payment'}
            </button>
            <p className="text-[11px] text-ink-muted mt-3 text-center">
              By continuing you agree to our terms &amp; cancellation policy.
            </p>
          </div>
        </aside>
      </div>

      <style>{`
        .input {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border-radius: 0.5rem;
          border: 1px solid #d1d5db;
          outline: none;
          font-size: 0.875rem;
          background-color: white;
        }
        .input:focus {
          border-color: rgb(var(--brand));
          box-shadow: 0 0 0 3px rgb(var(--brand) / 0.15);
        }
        .input:disabled {
          background-color: rgb(var(--surface-alt));
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

function Field({ label, required, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-1.5 inline-block">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}

function Row({ label, value, bold, accent = '' }) {
  return (
    <div className={`flex items-center justify-between text-sm py-1 ${bold ? 'font-bold text-ink text-base' : 'text-ink'}`}>
      <span className={bold ? '' : 'text-ink-muted'}>{label}</span>
      <span className={accent || (bold ? 'text-brand' : '')}>{value}</span>
    </div>
  );
}
