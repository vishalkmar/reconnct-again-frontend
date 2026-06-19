import { useMemo } from 'react';
import { IndianRupee, Percent, Tag, Sparkles } from 'lucide-react';

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
 * `basePrice` (the adult price from Pricing) drives the live preview.
 * Controlled via gstRate / discount / convenienceFee + onChange(patch).
 */
const GST_OPTS = [0, 5, 12, 18, 28];
const rupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function ExperienceTaxPricing({ gstRate = 0, discount, convenienceFee, basePrice = 0, onChange }) {
  const disc = discount || { type: 'percentage', value: 0 };
  const cf = { type: 'free', value: 0, months: 0, cutThrough: 0, ...(convenienceFee || {}) };

  const setCf = (patch) => onChange({ convenienceFee: { ...cf, ...patch } });

  const calc = useMemo(() => {
    const base = Number(basePrice) || 0;
    const dv = Number(disc.value) || 0;
    const discountAmt = disc.type === 'fixed' ? Math.min(dv, base) : (base * dv) / 100;
    const net = Math.max(0, base - discountAmt);
    const gst = (net * (Number(gstRate) || 0)) / 100;
    const subtotal = net + gst; // the "final amount at this time"
    let convFee = 0;
    if (cf.type === 'fixed') convFee = Number(cf.value) || 0;
    else if (cf.type === 'percentage') convFee = (subtotal * (Number(cf.value) || 0)) / 100;
    const total = subtotal + convFee;
    return { base, discountAmt, net, gst, subtotal, convFee, total };
  }, [basePrice, disc.type, disc.value, gstRate, cf.type, cf.value]);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Controls */}
      <div className="space-y-4">
        {/* Discount first — it's applied on the base price, before GST */}
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
              <input type="number" min={0} className="input pl-8" value={disc.value ?? 0}
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
                  <input type="number" min={0} className="input pr-12" value={cf.months ?? 0}
                    onChange={(e) => setCf({ months: e.target.value === '' ? 0 : Number(e.target.value) })} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">mo</span>
                </div>
              </div>
              <div>
                <span className="block text-[11px] text-ink-muted mb-1">Cut-through amount</span>
                <div className="relative">
                  <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                  <input type="number" min={0} className="input pl-8" value={cf.cutThrough ?? 0}
                    onChange={(e) => setCf({ cutThrough: e.target.value === '' ? 0 : Number(e.target.value) })} />
                </div>
              </div>
            </div>
          )}

          {cf.type === 'fixed' && (
            <div className="relative mt-2">
              <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input type="number" min={0} className="input pl-8" value={cf.value ?? 0}
                onChange={(e) => setCf({ value: e.target.value === '' ? 0 : Number(e.target.value) })} />
            </div>
          )}

          {cf.type === 'percentage' && (
            <div className="relative mt-2">
              <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input type="number" min={0} className="input pl-8" value={cf.value ?? 0}
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
            <Row label="Base price" value={rupee(calc.base)} />
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

function Row({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-muted">{label}</span>
      <span className={`font-medium ${accent || 'text-ink'}`}>{value}</span>
    </div>
  );
}
