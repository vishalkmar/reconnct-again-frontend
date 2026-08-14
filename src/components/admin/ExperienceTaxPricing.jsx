import { useEffect, useMemo, useState } from 'react';
import { IndianRupee, Percent, Tag, Sparkles, TrendingUp, Lock, Pencil, Loader2, Check, X as XIcon, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

/**
 * GST + discount + convenience fee with a LIVE breakdown.
 *
 *   gstRate        : 0 | 5 | 12 | 18 | 28      (column experience.gstRate)
 *   discount       : { type:'percentage'|'fixed', value }  (column experience.discount)
 *   convenienceFee : { type:'free'|'fixed'|'percentage', value, months, cutThrough }
 *
 * Rules (as specified):
 *   - discount applies on the PRE-GST (base) amount
 *   - GST applies on the discounted amount
 *   - convenience fee is added on the FINAL amount (net + GST), like a booking
 *     charge:
 *       free       : no fee added (shows EMI months + a cut-through/strike price)
 *       fixed      : a flat ₹ amount added on top
 *       percentage : a % of the final amount added on top
 *
 * MARKUP is NOT edited here any more. It comes from the admin's global
 * Pricing Setup → Markup Management rules and is shown read-only. The Edit
 * button writes a one-off override for THIS experience (which is stored as
 * another markup rule, so the same "latest wins" logic decides the outcome).
 * Pass `experienceIds` (one or many — a direct listing publishes several
 * activities together) to enable that button.
 *
 * `basePrice` (the adult price from Pricing) drives the live preview.
 * Controlled via gstRate / discount / convenienceFee + onChange(patch).
 */
const GST_OPTS = [0, 5, 12, 18, 28];
const rupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function ExperienceTaxPricing({
  gstRate = 0, markup, discount, convenienceFee, basePrice = 0, onChange, experienceIds,
}) {
  const mk = markup || { type: 'percentage', value: 0 };
  const disc = discount || { type: 'percentage', value: 0 };
  const cf = { type: 'free', value: 0, months: 0, cutThrough: 0, ...(convenienceFee || {}) };

  const setCf = (patch) => onChange({ convenienceFee: { ...cf, ...patch } });

  const calc = useMemo(() => {
    const raw = Number(basePrice) || 0;
    const mv = Number(mk.value) || 0;
    const markupAmt = mk.type === 'fixed' ? mv : (raw * mv) / 100;
    const base = raw + markupAmt; // markup applies first, on the base
    const dv = Number(disc.value) || 0;
    const discountAmt = disc.type === 'fixed' ? Math.min(dv, base) : (base * dv) / 100;
    const net = Math.max(0, base - discountAmt);
    const gst = (net * (Number(gstRate) || 0)) / 100;
    const subtotal = net + gst; // the "final amount at this time"
    let convFee = 0;
    if (cf.type === 'fixed') convFee = Number(cf.value) || 0;
    else if (cf.type === 'percentage') convFee = (subtotal * (Number(cf.value) || 0)) / 100;
    const total = subtotal + convFee;
    return { raw, markupAmt, base, discountAmt, net, gst, subtotal, convFee, total };
  }, [basePrice, mk.type, mk.value, disc.type, disc.value, gstRate, cf.type, cf.value]);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Controls */}
      <div className="space-y-4">
        {/* Markup — set globally in Markup Management, read-only here */}
        <MarkupPanel markup={markup} experienceIds={experienceIds} onChange={onChange} />

        {/* Discount — applied on the marked-up base, before GST */}
        <div>
          <label className="label inline-flex items-center gap-1.5"><Tag size={14} /> Discount</label>
          <div className="flex gap-2">
            <select className="input w-40" value={disc.type} onChange={(e) => onChange({ discount: { ...disc, type: e.target.value } })}>
              <option value="percentage">Percentage %</option>
              <option value="fixed">Fixed amount ₹</option>
            </select>
            <div className="relative flex-1">
              {disc.type === 'fixed'
                ? <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                : <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />}
              <input type="number" min={0} className="input pl-8" placeholder="0" value={disc.value || ''}
                onChange={(e) => onChange({ discount: { ...disc, value: e.target.value === '' ? 0 : Number(e.target.value) } })} />
            </div>
          </div>
          <p className="text-[11px] text-ink-muted mt-1">Always applied on the base price, before GST.</p>
        </div>

        <div>
          <label className="label inline-flex items-center gap-1.5"><Percent size={14} /> GST</label>
          <select className="input" value={gstRate} onChange={(e) => onChange({ gstRate: Number(e.target.value) })}>
            {GST_OPTS.map((g) => <option key={g} value={g}>{g === 0 ? 'Off' : `${g}%`}</option>)}
          </select>
        </div>

        {/* Convenience fee */}
        <div>
          <label className="label inline-flex items-center gap-1.5"><Sparkles size={14} /> Convenience fee</label>
          <select className="input" value={cf.type} onChange={(e) => setCf({ type: e.target.value })}>
            <option value="free">Free</option>
            <option value="fixed">Fixed amount</option>
            <option value="percentage">Percentage</option>
          </select>

          {cf.type === 'free' && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <span className="block text-[11px] text-ink-muted mb-1">Free for (months)</span>
                <div className="relative">
                  <input type="number" min={0} className="input pr-12" placeholder="0" value={cf.months || ''}
                    onChange={(e) => setCf({ months: e.target.value === '' ? 0 : Number(e.target.value) })} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">mo</span>
                </div>
              </div>
              <div>
                <span className="block text-[11px] text-ink-muted mb-1">Cut-through amount</span>
                <div className="relative">
                  <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                  <input type="number" min={0} className="input pl-8" placeholder="0" value={cf.cutThrough || ''}
                    onChange={(e) => setCf({ cutThrough: e.target.value === '' ? 0 : Number(e.target.value) })} />
                </div>
              </div>
            </div>
          )}

          {cf.type === 'fixed' && (
            <div className="relative mt-2">
              <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input type="number" min={0} className="input pl-8" placeholder="0" value={cf.value || ''}
                onChange={(e) => setCf({ value: e.target.value === '' ? 0 : Number(e.target.value) })} />
            </div>
          )}

          {cf.type === 'percentage' && (
            <div className="relative mt-2">
              <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input type="number" min={0} className="input pl-8" placeholder="0" value={cf.value || ''}
                onChange={(e) => setCf({ value: e.target.value === '' ? 0 : Number(e.target.value) })} />
            </div>
          )}

          <p className="text-[11px] text-ink-muted mt-1">
            {cf.type === 'free' && 'Free for the chosen number of months. The cut-through amount is shown struck-through in place of the fee.'}
            {cf.type === 'fixed' && 'A flat amount added on top of the final payable.'}
            {cf.type === 'percentage' && 'A % of the final amount (price − discount + GST) added on top.'}
          </p>
        </div>
      </div>

      {/* Live breakdown */}
      <div className="bg-surface-alt rounded-xl p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-3">Live breakdown (per adult)</div>
        {calc.base <= 0 ? (
          <p className="text-sm text-ink-muted italic">Set an adult price in Pricing to preview the totals.</p>
        ) : (
          <div className="space-y-2 text-sm">
            <Row label="Base price (B2B)" value={rupee(calc.raw)} />
            {calc.markupAmt > 0 && (
              <Row label={`Markup${mk.type === 'percentage' ? ` (${mk.value}%)` : ''}`} value={`+ ${rupee(calc.markupAmt)}`} />
            )}
            {calc.discountAmt > 0 && (
              <Row label={`Discount${disc.type === 'percentage' ? ` (${disc.value}%)` : ''}`} value={`− ${rupee(calc.discountAmt)}`} accent="text-emerald-600" />
            )}
            <Row label="Net (taxable)" value={rupee(calc.net)} />
            {Number(gstRate) > 0 && <Row label={`GST (${gstRate}%)`} value={`+ ${rupee(calc.gst)}`} />}
            {calc.convFee > 0 && (
              <Row label={`Convenience fee${cf.type === 'percentage' ? ` (${cf.value}%)` : ''}`} value={`+ ${rupee(calc.convFee)}`} />
            )}
            <div className="border-t border-gray-200 pt-2 mt-2 flex items-center justify-between font-bold text-ink text-base">
              <span>Total payable</span>
              <span>{rupee(calc.total)}</span>
            </div>
            {cf.type === 'free' && (Number(cf.months) > 0 || Number(cf.cutThrough) > 0) && (
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-emerald-600 font-medium">
                  {Number(cf.months) > 0 ? `Free for ${cf.months} month${cf.months > 1 ? 's' : ''}` : 'Free'}
                </span>
                {Number(cf.cutThrough) > 0 && <span className="line-through text-ink-muted">{rupee(cf.cutThrough)}</span>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/*
  Markup — read-only. The value shown is whatever the admin's global Markup
  Management rules resolve to for this experience; the go-live screen only
  reports it. "Edit" opens a one-off override for this experience only, saved
  straight away (it becomes the newest rule, so it wins), and "Reset" drops that
  override so the broader category/audience/all rule takes over again.
*/
const SCOPE_LABEL = {
  all: 'All experiences',
  category: 'Broad category',
  audience: 'Who is this for',
  experience: 'This experience only',
};

function MarkupPanel({ markup, experienceIds, onChange }) {
  const ids = (Array.isArray(experienceIds) ? experienceIds : [experienceIds]).filter(Boolean);
  const canEdit = ids.length > 0;

  const [info, setInfo] = useState(null);      // { markup, rule, otherRules }
  const [loading, setLoading] = useState(canEdit);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ type: 'percentage', value: 0 });

  // Pull the resolved markup for the first id — a multi-activity direct listing
  // publishes identical activities, so the first one represents the batch.
  const load = async () => {
    if (!canEdit) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/pricing-setup/markup/experience/${ids[0]}`);
      const d = data?.data || {};
      setInfo(d);
      onChange({ markup: d.markup || null });
      setDraft({ type: d.markup?.type || 'percentage', value: Number(d.markup?.value) || 0 });
    } catch {
      setInfo(null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [ids[0]]);

  const eff = info ? info.markup : markup;
  const hasMarkup = eff && Number(eff.value) > 0;
  const isOverride = eff?.scope === 'experience';

  const save = async () => {
    if (!Number(draft.value)) return toast.error('Enter a markup value');
    setSaving(true);
    try {
      await api.put(`/admin/pricing-setup/markup/experience/${ids[0]}`, {
        type: draft.type, value: Number(draft.value), experienceIds: ids,
      });
      toast.success('Markup set for this experience');
      setEditing(false);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not set markup');
    } finally { setSaving(false); }
  };

  const reset = async () => {
    setSaving(true);
    try {
      for (const id of ids) {
        // eslint-disable-next-line no-await-in-loop
        await api.delete(`/admin/pricing-setup/markup/experience/${id}`);
      }
      toast.success('Back to the global markup');
      setEditing(false);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not reset');
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="label mb-0 inline-flex items-center gap-1.5"><TrendingUp size={14} /> Markup</span>
        {canEdit && !editing && (
          <button type="button" onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
            <Pencil size={12} /> Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="rounded-xl border border-brand/40 bg-brand/5 p-3">
          <div className="flex gap-2">
            <select className="input w-40" value={draft.type} onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}>
              <option value="percentage">Percentage %</option>
              <option value="fixed">Fixed amount ₹</option>
            </select>
            <div className="relative flex-1">
              {draft.type === 'fixed'
                ? <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                : <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />}
              <input type="number" min={0} className="input pl-8" placeholder="0" value={draft.value || ''}
                onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value === '' ? 0 : Number(e.target.value) }))} />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button type="button" onClick={save} disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-ink text-xs font-bold disabled:opacity-60">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save for this listing
            </button>
            <button type="button" onClick={() => { setEditing(false); setDraft({ type: eff?.type || 'percentage', value: Number(eff?.value) || 0 }); }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-ink-muted hover:bg-surface-alt">
              <XIcon size={12} /> Cancel
            </button>
            {isOverride && (
              <button type="button" onClick={reset} disabled={saving}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 ml-auto">
                <RotateCcw size={12} /> Use global
              </button>
            )}
          </div>
          <p className="text-[11px] text-ink-muted mt-2">
            Saved immediately{ids.length > 1 ? ` for all ${ids.length} activities` : ''} — it becomes the newest markup rule, so it overrides the global one.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-surface-alt/60 px-3.5 py-2.5">
          {loading ? (
            <span className="inline-flex items-center gap-2 text-sm text-ink-muted"><Loader2 size={14} className="animate-spin" /> Loading markup…</span>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-ink">
                  {hasMarkup
                    ? (eff.type === 'fixed' ? rupee(eff.value) : `${Number(eff.value)}%`)
                    : <span className="text-ink-muted font-medium text-sm">No markup set</span>}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                  <Lock size={11} /> {hasMarkup ? (SCOPE_LABEL[eff.scope] || 'Global') : 'Global'}
                </span>
              </div>
              {info?.rule?.targetNames?.length > 0 && (
                <p className="text-[11px] text-ink-muted mt-0.5 truncate">From: {info.rule.targetNames.join(', ')}</p>
              )}
            </>
          )}
        </div>
      )}

      <p className="text-[11px] text-ink-muted mt-1">
        Set globally in <strong>Pricing Setup → Markup Management</strong>. Added on the B2B base first — it increases the price the customer pays.
        {info?.otherRules?.length > 0 && ` ${info.otherRules.length} other rule(s) also match; the most recently applied one wins.`}
      </p>
    </div>
  );
}

function Row({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-muted">{label}</span>
      <span className={`font-medium ${accent || 'text-ink'}`}>{value}</span>
    </div>
  );
}
