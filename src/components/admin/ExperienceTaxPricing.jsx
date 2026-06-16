import { useMemo } from 'react';
import { IndianRupee, Percent, Tag } from 'lucide-react';

/**
 * GST + discount + TCS with a LIVE breakdown (final task).
 *
 *   gstRate  : 0 | 5 | 12 | 18 | 28      (column experience.gstRate)
 *   tcsRate  : 0 | 1 | 2 | 5             (column experience.tcsRate)
 *   discount : { type:'percentage'|'fixed', value }  (column experience.discount)
 *
 * Rules (as specified):
 *   - discount applies on the PRE-GST (base) amount
 *   - GST applies on the discounted amount
 *   - TCS applies on (discounted base + GST)
 *
 * `basePrice` (the adult price from Pricing) drives the live preview.
 * Controlled via gstRate / tcsRate / discount + onChange(patch).
 */
const GST_OPTS = [0, 5, 12, 18, 28];
const TCS_OPTS = [0, 1, 2, 5];
const rupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function ExperienceTaxPricing({ gstRate = 0, tcsRate = 0, discount, basePrice = 0, onChange }) {
  const disc = discount || { type: 'percentage', value: 0 };

  const calc = useMemo(() => {
    const base = Number(basePrice) || 0;
    const dv = Number(disc.value) || 0;
    const discountAmt = disc.type === 'fixed' ? Math.min(dv, base) : (base * dv) / 100;
    const net = Math.max(0, base - discountAmt);
    const gst = (net * (Number(gstRate) || 0)) / 100;
    const tcs = ((net + gst) * (Number(tcsRate) || 0)) / 100;
    const total = net + gst + tcs;
    return { base, discountAmt, net, gst, tcs, total };
  }, [basePrice, disc.type, disc.value, gstRate, tcsRate]);

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
          <select className="input" value={gstRate}
            onChange={(e) => {
              const g = Number(e.target.value);
              // GST off ⇒ TCS off (TCS only applies when GST does).
              onChange(g === 0 ? { gstRate: 0, tcsRate: 0 } : { gstRate: g });
            }}>
            {GST_OPTS.map((g) => <option key={g} value={g}>{g === 0 ? 'Off' : `${g}%`}</option>)}
          </select>
        </div>

        <div>
          <label className="label inline-flex items-center gap-1.5"><Percent size={14} /> Allow TCS</label>
          <select className="input disabled:opacity-50 disabled:cursor-not-allowed" value={tcsRate} disabled={Number(gstRate) === 0}
            onChange={(e) => onChange({ tcsRate: Number(e.target.value) })}>
            {TCS_OPTS.map((t) => <option key={t} value={t}>{t === 0 ? 'Off' : `${t}%`}</option>)}
          </select>
          <p className="text-[11px] text-ink-muted mt-1">
            {Number(gstRate) === 0 ? 'Turn GST on to enable TCS.' : 'Applied on (price − discount + GST).'}
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
            {Number(tcsRate) > 0 && <Row label={`TCS (${tcsRate}%)`} value={`+ ${rupee(calc.tcs)}`} />}
            <div className="border-t border-gray-200 pt-2 mt-2 flex items-center justify-between font-bold text-ink text-base">
              <span>Total payable</span>
              <span>{rupee(calc.total)}</span>
            </div>
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
