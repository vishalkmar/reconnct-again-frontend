import { useCallback, useEffect, useState } from 'react';
import {
  Save, Loader2, RotateCcw, Plus, Trash2, Gift, TrendingUp, Users as UsersIcon,
  AlertTriangle, Info, Sparkles, Power,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { fmtMoney } from '../../components/user/bookingFormatters.js';

export default function AdminReferralConfigPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [draft, setDraft] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/referral-config');
      setData(res.data?.data || null);
      setDraft(toDraft(res.data?.data?.config));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load referral config');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!draft) return;
    if (draft.baseAmount === '' || Number(draft.baseAmount) < 0) {
      toast.error('Base amount must be ₹0 or more');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        enabled: draft.enabled,
        baseAmount: Number(draft.baseAmount),
        description: draft.description || '',
        maxPerBooking: Number(draft.maxPerBooking || 0),
        maxPerBookingPct: Number(draft.maxPerBookingPct || 0),
        tiers: draft.tiers.map((t) => ({
          atCount: Number(t.atCount),
          withinDays: Number(t.withinDays),
          totalPayout: Number(t.totalPayout),
          label: t.label,
        })),
        // Send the redemption tiers in rupees — backend stores paise.
        // Blank max => open-ended upper bound (highest range).
        redemptionTiers: draft.redemptionTiers
          .filter((t) => String(t.min).trim() !== '')
          .map((t) => ({
            min: Number(t.min) || 0,
            max: String(t.max).trim() === '' ? null : Number(t.max),
            cap: Number(t.cap) || 0,
            capPct: Number(t.capPct) || 0,
            label: t.label || '',
          })),
      };
      const res = await api.put('/admin/referral-config', payload);
      toast.success('Referral config saved');
      setData((d) => ({ ...d, config: res.data?.data?.config }));
      setDraft(toDraft(res.data?.data?.config));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset to platform defaults (₹300 base, ₹1200 for 3-in-10-days)? Your custom tiers will be lost.')) return;
    setResetting(true);
    try {
      const res = await api.post('/admin/referral-config/reset');
      toast.success('Reset to defaults');
      setData((d) => ({ ...d, config: res.data?.data?.config }));
      setDraft(toDraft(res.data?.data?.config));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed');
    } finally {
      setResetting(false);
    }
  };

  if (loading || !draft) {
    return (
      <div className="flex items-center justify-center py-24 text-ink-muted">
        <Loader2 className="animate-spin text-brand" />
      </div>
    );
  }

  const stats = data?.stats || {};

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold mb-1 inline-flex items-center gap-2">
          <Gift size={22} className="text-brand" /> Referral Configuration
        </h1>
        <p className="text-ink-muted text-sm">
          Tune the rewards a user earns each time a friend they referred joins
          and completes their profile (first login). Every field on this
          page is editable and persists immediately — no restart, no code
          changes.
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <StatCard icon={UsersIcon}   label="Payouts to date"  value={stats.totalPayouts ?? 0}                accent="bg-blue-50 text-blue-700" />
        <StatCard icon={TrendingUp}  label="Total disbursed"  value={fmtMoney(stats.totalAmount ?? 0)}       accent="bg-emerald-50 text-emerald-700" />
        <StatCard icon={Sparkles}    label="Active tiers"     value={draft.tiers.length}                     accent="bg-amber-50 text-amber-700" />
      </div>

      {/* Enable / disable */}
      <div className="bg-white rounded-2xl shadow-soft p-4 mb-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${draft.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              <Power size={18} />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-ink text-sm">Referral payouts</div>
              <div className="text-xs text-ink-muted mt-0.5">
                {draft.enabled
                  ? 'On — referrers earn wallet credit the moment their referee joins (completes profile / first login).'
                  : 'Off — no payouts will be issued for any new referrals (existing balances stay intact).'}
              </div>
            </div>
          </div>
          <Toggle checked={draft.enabled} onChange={(v) => setDraft((d) => ({ ...d, enabled: v }))} />
        </div>
      </div>

      {/* Base reward */}
      <div className="bg-white rounded-2xl shadow-soft p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-display font-bold text-ink">Base reward</h3>
            <p className="text-xs text-ink-muted mt-0.5">Paid for every qualifying referral that doesn't trigger a tier bonus.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-brand">₹</span>
          <input
            type="number"
            value={draft.baseAmount}
            onChange={(e) => setDraft((d) => ({ ...d, baseAmount: e.target.value }))}
            min="0"
            step="50"
            className="w-32 px-3 py-2 rounded-lg border border-gray-200 text-lg font-bold focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
          />
          <span className="text-sm text-ink-muted">per qualifying referral</span>
        </div>
      </div>

      {/* Tiered bonuses */}
      <div className="bg-white rounded-2xl shadow-soft p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-display font-bold text-ink">Bonus tiers</h3>
            <p className="text-xs text-ink-muted mt-0.5">
              When a referrer hits a tier, we top up the difference between the tier amount and what they've already earned as base payouts for those N referees.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDraft((d) => ({
              ...d,
              tiers: [...d.tiers, { atCount: 5, withinDays: 30, totalPayout: 2000, label: '5 referrals within 30 days' }],
            }))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-bold hover:bg-brand/90 transition"
          >
            <Plus size={12} /> Add tier
          </button>
        </div>

        {draft.tiers.length === 0 ? (
          <div className="text-sm text-ink-muted bg-surface-alt/40 rounded-xl p-6 text-center">
            No bonus tiers — only the flat base reward will apply.
          </div>
        ) : (
          <div className="space-y-3">
            {draft.tiers.map((tier, idx) => (
              <TierRow
                key={idx}
                tier={tier}
                baseAmount={Number(draft.baseAmount) || 0}
                onChange={(patch) => setDraft((d) => ({
                  ...d,
                  tiers: d.tiers.map((t, i) => (i === idx ? { ...t, ...patch } : t)),
                }))}
                onRemove={() => setDraft((d) => ({
                  ...d,
                  tiers: d.tiers.filter((_, i) => i !== idx),
                }))}
              />
            ))}
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-900 flex items-start gap-2">
          <Info size={14} className="shrink-0 mt-0.5" />
          <div>
            <strong>How it works:</strong> First match wins. We count the
            referrer's referees who have joined (completed their first
            login), chronologically. If <strong>atCount</strong> matches AND
            those referees' join dates fit inside <strong>withinDays</strong>
            from the very first one, the tier pays the difference between
            <em>totalPayout</em> and <em>base × atCount</em>. So a tier of
            <code>3 / 10 days / ₹1200</code> with <code>base ₹300</code>
            tops up by ₹300 the moment the 3rd qualifying referee joins
            within 10 days of the 1st.
          </div>
        </div>
      </div>

      {/* Anti-abuse caps */}
      <div className="bg-white rounded-2xl shadow-soft p-5 mb-5">
        <h3 className="font-display font-bold text-ink mb-1 inline-flex items-center gap-2">
          <AlertTriangle size={18} className="text-amber-600" /> Per-booking redemption cap
        </h3>
        <p className="text-xs text-ink-muted mb-3">
          Stops a user from draining a huge referral balance in one go. The
          stricter of the two caps wins. Set to <strong>0</strong> to disable
          that knob. With both at 0 the entire wallet can be used on one
          booking (the old behaviour).
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-semibold text-ink-muted">Max amount per booking (₹)</span>
            <input
              type="number"
              min={0}
              value={draft.maxPerBooking}
              onChange={(e) => setDraft((d) => ({ ...d, maxPerBooking: e.target.value }))}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
              placeholder="e.g. 500 (0 = no cap)"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ink-muted">Max % of booking total</span>
            <input
              type="number"
              min={0}
              max={100}
              value={draft.maxPerBookingPct}
              onChange={(e) => setDraft((d) => ({ ...d, maxPerBookingPct: e.target.value }))}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
              placeholder="e.g. 25 (0 = no cap)"
            />
          </label>
        </div>
        <p className="mt-2 text-[11px] text-ink-muted">
          Example: a ₹4,000 booking with both knobs at <code>₹500 / 25%</code>
          will let the user redeem at most <strong>min(₹500, ₹1,000) = ₹500</strong>
          this booking. The remainder stays in their wallet for next time.
        </p>
      </div>

      {/* Redemption tiers by booking amount range */}
      <div className="bg-white rounded-2xl shadow-soft p-5 mb-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display font-bold text-ink inline-flex items-center gap-2">
            <Sparkles size={18} className="text-emerald-600" /> Redemption tiers by booking range
          </h3>
          <button
            type="button"
            onClick={() => setDraft((d) => ({
              ...d,
              redemptionTiers: [...(d.redemptionTiers || []), { min: '', max: '', cap: '', capPct: '', label: '' }],
            }))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
          >
            <Plus size={12} /> Add tier
          </button>
        </div>
        <p className="text-xs text-ink-muted mb-3">
          Optional, more granular than the single cap above. If a tier
          matches the booking's total amount, its cap wins over the global
          cap. Example: <code>≤ ₹2,000 → ₹300</code>, <code>₹2,000–₹5,000 → ₹750</code>,
          <code>above ₹5,000 → 20%</code>. Leave <strong>Max</strong> blank
          for the top-most open-ended tier. Empty list = use the global cap
          above for every booking.
        </p>

        {(draft.redemptionTiers || []).length === 0 ? (
          <div className="text-sm text-ink-muted bg-surface-alt/40 rounded-xl p-6 text-center">
            No tiers yet — every booking uses the global cap above.
          </div>
        ) : (
          <div className="space-y-3">
            {draft.redemptionTiers.map((tier, idx) => (
              <RedemptionTierRow
                key={idx}
                tier={tier}
                onChange={(patch) => setDraft((d) => ({
                  ...d,
                  redemptionTiers: d.redemptionTiers.map((t, i) => (i === idx ? { ...t, ...patch } : t)),
                }))}
                onRemove={() => setDraft((d) => ({
                  ...d,
                  redemptionTiers: d.redemptionTiers.filter((_, i) => i !== idx),
                }))}
              />
            ))}
          </div>
        )}
      </div>

      {/* Public description */}
      <div className="bg-white rounded-2xl shadow-soft p-5 mb-5">
        <h3 className="font-display font-bold text-ink mb-2">Public description</h3>
        <p className="text-xs text-ink-muted mb-2">Shown to users on the Refer & Earn page.</p>
        <textarea
          value={draft.description}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          rows={3}
          maxLength={500}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
        />
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between gap-3 sticky bottom-0 bg-white/95 backdrop-blur border-t border-slate-100 p-4 rounded-2xl shadow-soft">
        <button
          type="button"
          onClick={handleReset}
          disabled={resetting || saving}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-ink-muted hover:bg-slate-50 disabled:opacity-60"
        >
          {resetting ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
          Reset to defaults
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand text-white text-sm font-bold hover:bg-brand/90 transition disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save changes
        </button>
      </div>
    </div>
  );
}

const toDraft = (config) => {
  if (!config) return null;
  return {
    enabled: !!config.enabled,
    baseAmount: String(config.baseAmount ?? 0),
    tiers: (config.tiers || []).map((t) => ({
      atCount: String(t.atCount ?? 1),
      withinDays: String(t.withinDays ?? 0),
      totalPayout: String(t.totalPayout ?? 0),
      label: t.label || '',
    })),
    description: config.description || '',
    maxPerBooking: String(config.maxPerBooking ?? 0),
    maxPerBookingPct: String(config.maxPerBookingPct ?? 0),
    redemptionTiers: (config.redemptionTiers || []).map((t) => ({
      min: String(t.min ?? 0),
      max: t.max === null || t.max === undefined ? '' : String(t.max),
      cap: String(t.cap ?? 0),
      capPct: String(t.capPct ?? 0),
      label: t.label || '',
    })),
  };
};

function RedemptionTierRow({ tier, onChange, onRemove }) {
  const min = Number(tier.min) || 0;
  const max = tier.max === '' || tier.max === null || tier.max === undefined ? null : Number(tier.max);
  const cap = Number(tier.cap) || 0;
  const capPct = Number(tier.capPct) || 0;
  const isOpenEnded = max === null;
  return (
    <div className="rounded-xl border border-slate-200 p-4 bg-surface-alt/30">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Field label="Booking ≥ (₹)">
          <input
            type="number"
            min="0"
            value={tier.min}
            onChange={(e) => onChange({ min: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand outline-none"
            placeholder="0"
          />
        </Field>
        <Field label="Booking < (₹)">
          <input
            type="number"
            min="0"
            value={tier.max}
            onChange={(e) => onChange({ max: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand outline-none"
            placeholder="leave blank = no upper limit"
          />
        </Field>
        <Field label="Max ₹ apply (cap)">
          <input
            type="number"
            min="0"
            value={tier.cap}
            onChange={(e) => onChange({ cap: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand outline-none"
            placeholder="e.g. 300 (0 = no ₹ cap)"
          />
        </Field>
        <Field label="Max % of booking">
          <input
            type="number"
            min="0"
            max="100"
            value={tier.capPct}
            onChange={(e) => onChange({ capPct: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand outline-none"
            placeholder="0 = no % cap"
          />
        </Field>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
        <div className="text-xs text-ink-muted">
          {isOpenEnded
            ? <>Bookings <strong>above ₹{min.toLocaleString()}</strong></>
            : <>Bookings <strong>₹{min.toLocaleString()} – ₹{max.toLocaleString()}</strong></>
          }
          {' '}
          → {cap > 0 || capPct > 0
            ? <>user can redeem at most <strong className="text-emerald-700">
                {cap > 0 && `₹${cap.toLocaleString()}`}
                {cap > 0 && capPct > 0 && ' or '}
                {capPct > 0 && `${capPct}%`}
              </strong> (stricter wins)</>
            : <span className="text-rose-600">cap = 0 means nothing can be redeemed</span>}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-rose-600 hover:bg-rose-50"
        >
          <Trash2 size={12} /> Remove
        </button>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-white rounded-2xl shadow-soft p-4 flex items-center gap-3">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${accent}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-ink-muted uppercase tracking-wide truncate">{label}</div>
        <div className="font-bold text-lg text-ink truncate">{value}</div>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition ${checked ? 'bg-brand' : 'bg-slate-300'}`}
    >
      <span className={`absolute top-0.5 ${checked ? 'left-5' : 'left-0.5'} w-5 h-5 bg-white rounded-full shadow transition-all`} />
    </button>
  );
}

function TierRow({ tier, baseAmount, onChange, onRemove }) {
  const atCount = Number(tier.atCount) || 0;
  const totalPayout = Number(tier.totalPayout) || 0;
  const baseTotal = baseAmount * atCount;
  const topUp = Math.max(0, totalPayout - baseTotal);
  const isWarning = totalPayout < baseTotal;

  return (
    <div className="rounded-xl border border-slate-200 p-4 bg-surface-alt/30">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Field label="At referral #">
          <input
            type="number"
            min="1"
            value={tier.atCount}
            onChange={(e) => onChange({ atCount: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand outline-none"
          />
        </Field>
        <Field label="Within (days)">
          <input
            type="number"
            min="0"
            value={tier.withinDays}
            onChange={(e) => onChange({ withinDays: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand outline-none"
          />
        </Field>
        <Field label="Total payout (₹)">
          <input
            type="number"
            min="0"
            step="50"
            value={tier.totalPayout}
            onChange={(e) => onChange({ totalPayout: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand outline-none"
          />
        </Field>
        <Field label="Label (shown to admin)">
          <input
            type="text"
            value={tier.label}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder={`${tier.atCount} referrals within ${tier.withinDays} days`}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand outline-none"
          />
        </Field>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
        <div className={`text-xs ${isWarning ? 'text-rose-600' : 'text-ink-muted'} inline-flex items-center gap-1.5`}>
          {isWarning && <AlertTriangle size={12} />}
          {isWarning
            ? `Warning: total payout ₹${totalPayout} is less than base × atCount (₹${baseTotal}). Top-up will be ₹0.`
            : <>Base × atCount = ₹{baseTotal.toLocaleString()} · Tier top-up = <strong className="text-emerald-600">₹{topUp.toLocaleString()}</strong></>
          }
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-rose-600 hover:bg-rose-50"
        >
          <Trash2 size={12} /> Remove
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wider text-ink-muted mb-1 font-bold">{label}</span>
      {children}
    </label>
  );
}
