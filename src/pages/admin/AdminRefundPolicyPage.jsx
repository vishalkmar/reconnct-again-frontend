import { useCallback, useEffect, useState } from 'react';
import {
  Save, Loader2, RotateCcw, Plus, Trash2, RefreshCcw, AlertTriangle,
  Info, Clock, Power, TrendingDown, CheckCircle2, XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { fmtMoney } from '../../components/user/bookingFormatters.js';

export default function AdminRefundPolicyPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [draft, setDraft] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/refund-policy');
      setData(res.data?.data || null);
      setDraft(toDraft(res.data?.data?.policy));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load refund policy');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!draft) return;
    if (draft.tiers.length === 0) {
      toast.error('At least one refund tier is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        enabled: draft.enabled,
        processingNote: draft.processingNote,
        tiers: draft.tiers.map((t) => ({
          hoursBeforeCheckIn: Number(t.hoursBeforeCheckIn),
          refundPercent: Number(t.refundPercent),
          label: t.label,
        })),
      };
      const res = await api.put('/admin/refund-policy', payload);
      toast.success('Refund policy saved');
      setData((d) => ({ ...d, policy: res.data?.data?.policy }));
      setDraft(toDraft(res.data?.data?.policy));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset to platform defaults (72h=100%, 48h=50%, <24h=0%)? Your custom tiers will be lost.')) return;
    setResetting(true);
    try {
      const res = await api.post('/admin/refund-policy/reset');
      toast.success('Reset to defaults');
      setData((d) => ({ ...d, policy: res.data?.data?.policy }));
      setDraft(toDraft(res.data?.data?.policy));
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
  // Sort tiers desc by hours for the preview ladder
  const sortedTiers = [...draft.tiers]
    .map((t, i) => ({ ...t, originalIdx: i }))
    .sort((a, b) => (Number(b.hoursBeforeCheckIn) || 0) - (Number(a.hoursBeforeCheckIn) || 0));

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold mb-1 inline-flex items-center gap-2">
          <RefreshCcw size={22} className="text-brand" /> Refund Policy
        </h1>
        <p className="text-ink-muted text-sm">
          Set the platform-wide refund tiers based on hours before check-in. Each item can override this
          via its own form. Changes apply to new cancellations immediately.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <StatCard icon={CheckCircle2} label="Refunds issued"   value={stats.totalRefunds ?? 0}                accent="bg-emerald-50 text-emerald-700" />
        <StatCard icon={TrendingDown} label="Total refunded"   value={fmtMoney(stats.totalRefundAmount ?? 0)} accent="bg-blue-50 text-blue-700" />
        <StatCard icon={XCircle}      label="Failed refunds"   value={stats.failedCount ?? 0}                 accent={stats.failedCount > 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-500'} />
      </div>

      <div className="bg-white rounded-2xl shadow-soft p-4 mb-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${draft.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              <Power size={18} />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-ink text-sm">Automated refunds</div>
              <div className="text-xs text-ink-muted mt-0.5">
                {draft.enabled
                  ? 'On — cancellations automatically push the eligible amount back to the source via Cashfree.'
                  : 'Off — cancellations only flip status. Admin must process refunds manually.'}
              </div>
            </div>
          </div>
          <Toggle checked={draft.enabled} onChange={(v) => setDraft((d) => ({ ...d, enabled: v }))} />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-soft p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-display font-bold text-ink">Refund tiers</h3>
            <p className="text-xs text-ink-muted mt-0.5">
              Sorted high-to-low at resolution time. The first tier whose threshold ≤ current hours-to-check-in wins.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDraft((d) => ({
              ...d,
              tiers: [...d.tiers, { hoursBeforeCheckIn: 24, refundPercent: 25, label: 'Custom tier' }],
            }))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-bold hover:bg-brand/90 transition"
          >
            <Plus size={12} /> Add tier
          </button>
        </div>

        {draft.tiers.length === 0 ? (
          <div className="text-sm text-ink-muted bg-surface-alt/40 rounded-xl p-6 text-center">
            No tiers — nothing will ever refund.
          </div>
        ) : (
          <div className="space-y-3">
            {draft.tiers.map((tier, idx) => (
              <TierRow
                key={idx}
                tier={tier}
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

        {/* Visual preview ladder */}
        {sortedTiers.length > 0 && (
          <div className="mt-5 p-4 bg-surface-alt/40 rounded-xl">
            <div className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3 inline-flex items-center gap-1.5">
              <Clock size={12} /> Resolution preview (high to low)
            </div>
            <div className="space-y-1.5">
              {sortedTiers.map((t, i) => {
                const pct = Number(t.refundPercent) || 0;
                const color = pct >= 75 ? 'bg-emerald-500' : pct >= 25 ? 'bg-amber-500' : 'bg-rose-500';
                return (
                  <div key={i} className="flex items-center gap-3 text-xs">
                    <div className="w-20 text-right text-ink-muted font-mono">
                      ≥ {t.hoursBeforeCheckIn}h
                    </div>
                    <div className="flex-1 bg-slate-200 rounded-full h-3 overflow-hidden">
                      <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="w-12 text-right font-bold text-ink">{pct}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-900 flex items-start gap-2">
          <Info size={14} className="shrink-0 mt-0.5" />
          <div>
            <strong>Per-item override:</strong> Each Package / Room / Event / Add-on form has its own <em>Is refundable</em> toggle. When off, that item is fully non-refundable regardless of this policy. Items can also carry a custom <em>refund policy override</em> JSON (advanced).
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-soft p-5 mb-5">
        <h3 className="font-display font-bold text-ink mb-2">User-facing note</h3>
        <p className="text-xs text-ink-muted mb-2">Shown on the cancel-confirmation step so users know what to expect.</p>
        <textarea
          value={draft.processingNote}
          onChange={(e) => setDraft((d) => ({ ...d, processingNote: e.target.value }))}
          rows={3}
          maxLength={500}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
        />
      </div>

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

const toDraft = (policy) => {
  if (!policy) return null;
  return {
    enabled: !!policy.enabled,
    tiers: (policy.tiers || []).map((t) => ({
      hoursBeforeCheckIn: String(t.hoursBeforeCheckIn ?? 0),
      refundPercent: String(t.refundPercent ?? 0),
      label: t.label || '',
    })),
    processingNote: policy.processingNote || '',
  };
};

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

function TierRow({ tier, onChange, onRemove }) {
  const pct = Number(tier.refundPercent) || 0;
  const isFull = pct >= 100;
  const isZero = pct === 0;
  return (
    <div className="rounded-xl border border-slate-200 p-4 bg-surface-alt/30">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Hours before check-in (≥)">
          <input
            type="number"
            min="0"
            value={tier.hoursBeforeCheckIn}
            onChange={(e) => onChange({ hoursBeforeCheckIn: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand outline-none"
          />
        </Field>
        <Field label="Refund percent (0–100)">
          <div className="relative">
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={tier.refundPercent}
              onChange={(e) => onChange({ refundPercent: e.target.value })}
              className="w-full px-3 py-2 pr-8 rounded-lg border border-gray-200 text-sm focus:border-brand outline-none"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted text-sm">%</span>
          </div>
        </Field>
        <Field label="Label (shown to user)">
          <input
            type="text"
            value={tier.label}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder={`${tier.hoursBeforeCheckIn}+ hours before check-in`}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand outline-none"
          />
        </Field>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
        <div className="text-xs">
          {isFull ? (
            <span className="text-emerald-600 font-semibold inline-flex items-center gap-1"><CheckCircle2 size={12} /> Full refund tier</span>
          ) : isZero ? (
            <span className="text-rose-600 font-semibold inline-flex items-center gap-1"><XCircle size={12} /> No refund tier</span>
          ) : (
            <span className="text-amber-700 font-semibold inline-flex items-center gap-1"><AlertTriangle size={12} /> Partial refund — {pct}%</span>
          )}
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
