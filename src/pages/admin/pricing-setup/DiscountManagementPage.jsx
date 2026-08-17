import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Tag, Plus, Search, Loader2, Check, X, Pencil, Trash2, Pause, Play, Copy,
  Globe, Layers, Users, Sparkles, BarChart3, IndianRupee, Percent, ChevronRight,
  AlertTriangle, Ticket, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import PricingSetupShell from './PricingSetupShell.jsx';

/*
  Discount Management — the ONE place a discount is created.

  Discount deliberately works differently from Markup / GST / Convenience.
  Those three silently change a price; a discount is something the CUSTOMER
  redeems. So here a discount IS a coupon, and the flow enforces that:

     scope  →  targets  →  rate  →  GENERATE THE COUPON  →  apply

  Nothing can be saved until a code exists, because a discount with no code
  could never reach anybody. The code then comes off the FINAL price the
  customer pays — after markup, GST and the convenience fee — when they type it
  on the app's booking screen.
*/

const SCOPES = [
  { key: 'all', label: 'To All', icon: Globe, hint: 'Redeemable on every experience.' },
  { key: 'category', label: 'Broad Category wise', icon: Layers, hint: 'Only inside the chosen broad categories.' },
  { key: 'audience', label: 'Based on "Who is this for"', icon: Users, hint: 'Only on experiences with the chosen audience tags.' },
  { key: 'experience', label: 'Specific experiences', icon: Sparkles, hint: 'Only on the chosen listings.' },
];
const SCOPE_META = Object.fromEntries(SCOPES.map((s) => [s.key, s]));

const rupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const showValue = (c) => (c.kind === 'percent' ? `${Number(c.value)}% off` : `${rupee(c.value)} off`);
const when = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—');
const dateOnly = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null);

export default function DiscountManagementPage() {
  const [coupons, setCoupons] = useState([]);
  const [targets, setTargets] = useState({ categories: [], audiences: [], experiences: [] });
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editCoupon, setEditCoupon] = useState(null);
  const [viewCoupon, setViewCoupon] = useState(null);
  const [apiMissing, setApiMissing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      api.get('/admin/pricing-setup/discount/coupons'),
      api.get('/admin/pricing-setup/discount/targets'),
    ]);
    const [c, t] = results;
    if (c.status === 'fulfilled') setCoupons(c.value.data?.data?.items || []);
    if (t.status === 'fulfilled') setTargets(t.value.data?.data || { categories: [], audiences: [], experiences: [] });

    const failed = results.filter((x) => x.status === 'rejected');
    const missing = failed.some((x) => x.reason?.response?.status === 404);
    setApiMissing(missing);
    if (failed.length && !missing) toast.error(failed[0].reason?.response?.data?.message || 'Could not load coupons');
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (c) => {
    try { await api.patch(`/admin/pricing-setup/discount/coupons/${c.id}/toggle`); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const remove = async (c) => {
    if (!window.confirm(`Remove coupon ${c.code}? Customers holding it will no longer be able to redeem it.`)) return;
    try {
      const { data } = await api.delete(`/admin/pricing-setup/discount/coupons/${c.id}`);
      toast.success(data.message || 'Removed');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const live = coupons.filter((c) => c.isActive && !c.expired && !c.exhausted);
  const redeemed = coupons.reduce((a, c) => a + (c.timesUsed || 0), 0);

  return (
    <PricingSetupShell
      title="Discount Management"
      subtitle="A discount reaches the customer as a coupon they redeem — it comes off the final price, after markup, GST and the convenience fee."
    >
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <button onClick={() => { setEditCoupon(null); setFormOpen(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-ink text-sm font-bold shadow-soft hover:brightness-105">
          <Plus size={16} /> Add discount
        </button>
        <Link to="/admin/pricing-setup/discount/analysis"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-ink hover:border-brand/50">
          <BarChart3 size={15} /> Analysis
        </Link>
      </div>

      {apiMissing && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800 mb-5">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            The discount API isn’t responding on this server yet (<code>/api/admin/pricing-setup/discount/*</code> returns 404).
            This screen works once the backend carrying Discount Management is deployed.
          </span>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <Stat label="Live coupons" value={live.length} icon={Ticket} tint="text-brand bg-brand/10" />
        <Stat label="Total coupons" value={coupons.length} icon={Tag} tint="text-sky-600 bg-sky-50" />
        <Stat label="Times redeemed" value={redeemed} icon={Check} tint="text-emerald-600 bg-emerald-50" />
      </div>

      {formOpen && (
        <DiscountForm
          targets={targets}
          coupon={editCoupon}
          onClose={() => { setFormOpen(false); setEditCoupon(null); }}
          onSaved={() => { setFormOpen(false); setEditCoupon(null); load(); }}
        />
      )}

      {loading ? (
        <div className="py-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
      ) : (
        <CouponsTable
          coupons={coupons}
          onEdit={(c) => { setEditCoupon(c); setFormOpen(true); }}
          onView={setViewCoupon}
          onToggle={toggle}
          onRemove={remove}
        />
      )}

      {viewCoupon && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4" onClick={() => setViewCoupon(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <CouponCard coupon={viewCoupon} />
            <button onClick={() => setViewCoupon(null)}
              className="mt-3 w-full px-4 py-2 rounded-lg bg-white text-sm font-semibold text-ink hover:bg-surface-alt">
              Close
            </button>
          </div>
        </div>
      )}
    </PricingSetupShell>
  );
}

function Stat({ label, value, icon: Icon, tint }) {
  return (
    <div className="bg-white rounded-2xl shadow-soft p-4 flex items-center gap-3">
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${tint}`}><Icon size={18} /></span>
      <div>
        <div className="text-xl font-bold text-ink leading-tight">{value}</div>
        <div className="text-[11px] text-ink-muted">{label}</div>
      </div>
    </div>
  );
}

/* ─── The coupon, drawn as a real ticket ────────────────────────────────────
   Shown the moment a code is generated and again from the table's View, so the
   admin can read, screenshot or hand out exactly what the customer will type.
   The notches on the sides are what make it read as a ticket rather than a card. */
export function CouponCard({ coupon }) {
  const copy = () => {
    navigator.clipboard?.writeText(coupon.code)
      .then(() => toast.success('Coupon code copied'))
      .catch(() => toast.error('Could not copy'));
  };
  const scope = SCOPE_META[coupon.scope] || SCOPES[0];
  return (
    <div className="relative w-[22rem] max-w-full rounded-2xl overflow-hidden shadow-2xl bg-ink text-white">
      {/* ticket notches */}
      <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/60" />
      <span className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/60" />

      <div className="px-6 pt-5 pb-4">
        <div className="flex items-center justify-between">
          <span className="font-display text-xl font-semibold tracking-tight">
            reconn<span className="text-brand">ct</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-white/60">
            <scope.icon size={11} /> {scope.label}
          </span>
        </div>

        <div className="mt-5 text-center">
          <div className="text-4xl font-black tracking-tight text-brand">
            {coupon.kind === 'percent' ? `${Number(coupon.value)}%` : rupee(coupon.value)}
          </div>
          <div className="text-xs uppercase tracking-[0.2em] text-white/60 mt-1">off your booking</div>
        </div>
      </div>

      {/* perforation */}
      <div className="border-t border-dashed border-white/25" />

      <div className="px-6 py-4">
        <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Coupon code</div>
        <button onClick={copy}
          className="w-full flex items-center justify-between gap-2 rounded-lg bg-white/10 hover:bg-white/15 px-3 py-2.5 transition">
          <span className="font-mono text-lg font-bold tracking-[0.15em]">{coupon.code}</span>
          <Copy size={15} className="text-white/60 shrink-0" />
        </button>

        <div className="mt-3 space-y-1 text-[11px] text-white/70">
          <div className="flex justify-between gap-3">
            <span>Valid on</span>
            <span className="text-right text-white/90 truncate max-w-[12rem]">
              {(coupon.targetNames || ['All experiences']).slice(0, 2).join(', ')}
              {(coupon.targetNames || []).length > 2 && ` +${coupon.targetNames.length - 2}`}
            </span>
          </div>
          {coupon.maxDiscount > 0 && (
            <div className="flex justify-between"><span>Max discount</span><span className="text-white/90">{rupee(coupon.maxDiscount)}</span></div>
          )}
          {coupon.minOrder > 0 && (
            <div className="flex justify-between"><span>Min order</span><span className="text-white/90">{rupee(coupon.minOrder)}</span></div>
          )}
          {coupon.usageLimit > 0 && (
            <div className="flex justify-between"><span>Uses</span><span className="text-white/90">{coupon.timesUsed || 0} / {coupon.usageLimit}</span></div>
          )}
          <div className="flex justify-between">
            <span>Valid till</span>
            <span className="text-white/90">{dateOnly(coupon.expiresAt) || 'No expiry'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Add / edit ──────────────────────────────────────────────────────────── */
function DiscountForm({ targets, coupon, onClose, onSaved }) {
  const editing = !!coupon;
  const [scope, setScope] = useState(coupon?.scope || '');
  const [picked, setPicked] = useState(coupon?.targetIds?.map(Number) || []);
  const [applied, setApplied] = useState(editing || coupon?.scope === 'all');
  const [kind, setKind] = useState(coupon?.kind || 'percent');
  const [value, setValue] = useState(coupon ? Number(coupon.value) : '');
  const [maxDiscount, setMaxDiscount] = useState(coupon?.maxDiscount || '');
  const [minOrder, setMinOrder] = useState(coupon?.minOrder || '');
  const [usageLimit, setUsageLimit] = useState(coupon?.usageLimit || '');
  const [expiresAt, setExpiresAt] = useState(coupon?.expiresAt ? String(coupon.expiresAt).slice(0, 10) : '');
  const [description, setDescription] = useState(coupon?.description || '');
  const [prefix, setPrefix] = useState('RECONNCT');
  const [code, setCode] = useState(coupon?.code || '');
  const [generating, setGenerating] = useState(false);
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState(false);

  const options = useMemo(() => {
    const list = scope === 'category' ? targets.categories
      : scope === 'audience' ? targets.audiences
        : scope === 'experience' ? targets.experiences : [];
    if (!q.trim()) return list;
    const needle = q.trim().toLowerCase();
    return list.filter((o) => o.name.toLowerCase().includes(needle) || (o.city || '').toLowerCase().includes(needle));
  }, [scope, targets, q]);

  const chooseScope = (key) => { setScope(key); setPicked([]); setApplied(key === 'all'); };
  const togglePick = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const rateReady = Number(value) > 0 && (kind !== 'percent' || Number(value) <= 100);

  const generate = async () => {
    if (!rateReady) return toast.error('Set the discount rate first');
    setGenerating(true);
    try {
      const { data } = await api.post('/admin/pricing-setup/discount/generate-code', { prefix });
      setCode(data?.data?.code || '');
      toast.success('Coupon generated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not generate a code');
    } finally { setGenerating(false); }
  };

  const save = async () => {
    if (!scope) return toast.error('Choose where this discount applies');
    if (scope !== 'all' && !picked.length) return toast.error('Select at least one target');
    if (!rateReady) return toast.error('Enter a valid discount value');
    if (!code) return toast.error('Generate the coupon before applying the discount');
    setSaving(true);
    try {
      const body = {
        scope,
        targetIds: scope === 'all' ? [] : picked,
        kind,
        value: Number(value),
        maxDiscount: Number(maxDiscount) || 0,
        minOrder: Number(minOrder) || 0,
        usageLimit: Number(usageLimit) || 0,
        expiresAt: expiresAt || null,
        description,
        code,
      };
      const { data } = editing
        ? await api.put(`/admin/pricing-setup/discount/coupons/${coupon.id}`, body)
        : await api.post('/admin/pricing-setup/discount/coupons', body);
      toast.success(data.message || 'Saved');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save');
    } finally { setSaving(false); }
  };

  // The preview ticket mirrors exactly what will be saved.
  const previewCoupon = {
    code,
    kind,
    value: Number(value) || 0,
    scope: scope || 'all',
    targetNames: scope === 'all' || !scope
      ? ['All experiences']
      : picked.map((id) => (options.concat(targets.categories, targets.audiences, targets.experiences)
        .find((o) => o.id === id) || {}).name).filter(Boolean),
    maxDiscount: Number(maxDiscount) || 0,
    minOrder: Number(minOrder) || 0,
    usageLimit: Number(usageLimit) || 0,
    timesUsed: coupon?.timesUsed || 0,
    expiresAt: expiresAt || null,
  };

  return (
    <div className="bg-white rounded-2xl shadow-soft p-5 mb-6 border border-brand/20">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-display font-bold text-lg">{editing ? 'Edit discount' : 'Add discount'}</h2>
          <p className="text-xs text-ink-muted">The discount only becomes real once it has a coupon code a customer can type.</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-alt text-ink-muted"><X size={18} /></button>
      </div>

      {/* Step 1 — scope */}
      <div className="mb-5">
        <div className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-2">1 · Where can it be used?</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {SCOPES.map((s) => (
            <button key={s.key} type="button" onClick={() => chooseScope(s.key)}
              className={`text-left rounded-xl border p-3 transition ${scope === s.key ? 'border-brand bg-brand/5 shadow-soft' : 'border-gray-200 hover:border-brand/40'}`}>
              <span className="inline-flex items-center gap-2 font-semibold text-sm text-ink"><s.icon size={15} /> {s.label}</span>
              <p className="text-[11px] text-ink-muted mt-1 leading-snug">{s.hint}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2 — targets */}
      {scope && scope !== 'all' && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold uppercase tracking-wide text-ink-muted">
              2 · Pick the {scope === 'category' ? 'broad categories' : scope === 'audience' ? 'audiences' : 'experiences'}
            </div>
            <span className="text-xs text-ink-muted">{picked.length} selected</span>
          </div>
          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input className="input pl-9" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-slate-100">
            {options.map((o) => (
              <label key={o.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-surface-alt/60">
                <input type="checkbox" checked={picked.includes(o.id)} onChange={() => togglePick(o.id)} className="w-4 h-4" />
                <span className="text-sm text-ink flex-1 truncate">{o.name}</span>
                {o.city && <span className="text-[11px] text-ink-muted truncate max-w-[10rem]">{o.city}</span>}
                {o.basePrice ? <span className="text-[11px] font-semibold text-ink-muted">{rupee(o.basePrice)}</span> : null}
              </label>
            ))}
            {options.length === 0 && <div className="px-3 py-8 text-center text-sm text-ink-muted">Nothing to pick here.</div>}
          </div>
          {!applied && (
            <button type="button" onClick={() => (picked.length ? setApplied(true) : toast.error('Select at least one'))}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ink text-white text-sm font-bold hover:bg-ink/90">
              Apply to {picked.length || ''} selected <ChevronRight size={15} />
            </button>
          )}
        </div>
      )}

      {/* Step 3 — the rate + the coupon */}
      {applied && scope && (
        <div className="rounded-xl bg-surface-alt/60 p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-2">
            {scope === 'all' ? '2' : '3'} · The discount
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <div className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Discount type</label>
                  <select className="input" value={kind} onChange={(e) => { setKind(e.target.value); setCode(''); }}>
                    <option value="percent">Percentage %</option>
                    <option value="flat">Flat (fixed amount ₹)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Value</label>
                  <div className="relative">
                    {kind === 'flat'
                      ? <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                      : <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />}
                    <input type="number" min={0} className="input pl-8" placeholder="0" value={value}
                      onChange={(e) => { setValue(e.target.value === '' ? '' : Number(e.target.value)); setCode(''); }} />
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {kind === 'percent' && (
                  <div>
                    <label className="label">Max discount <span className="font-normal text-ink-muted">(optional)</span></label>
                    <div className="relative">
                      <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                      <input type="number" min={0} className="input pl-8" placeholder="No cap" value={maxDiscount}
                        onChange={(e) => setMaxDiscount(e.target.value)} />
                    </div>
                  </div>
                )}
                <div>
                  <label className="label">Min order <span className="font-normal text-ink-muted">(optional)</span></label>
                  <div className="relative">
                    <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                    <input type="number" min={0} className="input pl-8" placeholder="None" value={minOrder}
                      onChange={(e) => setMinOrder(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Total uses <span className="font-normal text-ink-muted">(0 = unlimited)</span></label>
                  <input type="number" min={0} className="input" placeholder="0" value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)} />
                </div>
                <div>
                  <label className="label">Valid till <span className="font-normal text-ink-muted">(optional)</span></label>
                  <input type="date" className="input" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="label">Description <span className="font-normal text-ink-muted">(optional)</span></label>
                <input className="input" placeholder="e.g. Monsoon launch offer" value={description}
                  onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>

            {/* The coupon itself — nothing can be applied before this exists */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-2">
                {scope === 'all' ? '3' : '4'} · Generate the coupon
              </div>

              {!code ? (
                <div className="rounded-xl border-2 border-dashed border-gray-300 p-6 text-center">
                  <Ticket size={26} className="mx-auto text-ink-muted mb-2" />
                  <p className="text-sm text-ink-muted mb-4">
                    A discount can’t be saved until it has a code — that’s the only way a customer can claim it.
                  </p>
                  <div className="flex gap-2 mb-3">
                    <input className="input flex-1" placeholder="Code prefix" value={prefix}
                      onChange={(e) => setPrefix(e.target.value.toUpperCase())} maxLength={12} />
                  </div>
                  <button type="button" onClick={generate} disabled={generating || !rateReady}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-ink text-white text-sm font-bold disabled:opacity-50">
                    {generating ? <Loader2 size={15} className="animate-spin" /> : <Ticket size={15} />} Generate coupon
                  </button>
                  {!rateReady && <p className="text-[11px] text-ink-muted mt-2">Set a valid discount value first.</p>}
                </div>
              ) : (
                <div>
                  <CouponCard coupon={previewCoupon} />
                  <button type="button" onClick={generate} disabled={generating}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-brand">
                    {generating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Generate a different code
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-5 pt-4 border-t border-gray-200">
            <button onClick={save} disabled={saving || !code}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-brand text-ink text-sm font-bold disabled:opacity-50">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} {editing ? 'Update discount' : 'Apply discount'}
            </button>
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-ink-muted hover:bg-white">Cancel</button>
            <span className="text-[11px] text-ink-muted ml-auto text-right max-w-xs">
              {code
                ? 'Customers redeem this on the app’s booking screen — it comes off the final payable.'
                : 'Apply stays disabled until a coupon is generated.'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── The coupons ─────────────────────────────────────────────────────────── */
function CouponsTable({ coupons, onEdit, onView, onToggle, onRemove }) {
  const [q, setQ] = useState('');
  const rows = useMemo(() => coupons.filter((c) => !q.trim()
    || c.code.toLowerCase().includes(q.trim().toLowerCase())
    || (c.description || '').toLowerCase().includes(q.trim().toLowerCase())), [coupons, q]);

  const state = (c) => {
    if (!c.isActive) return { label: 'Paused', cls: 'bg-gray-100 text-gray-600' };
    if (c.expired) return { label: 'Expired', cls: 'bg-rose-50 text-rose-600' };
    if (c.exhausted) return { label: 'Used up', cls: 'bg-amber-50 text-amber-700' };
    return { label: 'Live', cls: 'bg-emerald-50 text-emerald-700' };
  };

  return (
    <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[12rem]">
          <h2 className="font-semibold">Coupons</h2>
          <p className="text-xs text-ink-muted">Each one is a discount a customer can redeem on the app’s booking screen.</p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input className="input pl-9 py-1.5 text-sm w-56" placeholder="Search code…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt/60 text-[11px] uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="text-left font-semibold px-5 py-2.5">Coupon</th>
              <th className="text-left font-semibold px-3 py-2.5">Valid on</th>
              <th className="text-left font-semibold px-3 py-2.5">Discount</th>
              <th className="text-left font-semibold px-3 py-2.5">Uses</th>
              <th className="text-left font-semibold px-3 py-2.5">Status</th>
              <th className="text-right font-semibold px-5 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((c) => {
              const meta = SCOPE_META[c.scope] || SCOPES[0];
              const st = state(c);
              return (
                <tr key={c.id} className={c.isActive ? '' : 'opacity-60'}>
                  <td className="px-5 py-3">
                    <button onClick={() => onView(c)} className="font-mono font-bold text-ink tracking-wide hover:text-brand">
                      {c.code}
                    </button>
                    {c.description && <div className="text-[11px] text-ink-muted italic">{c.description}</div>}
                    <div className="text-[11px] text-ink-muted">{when(c.createdAt)}{c.createdByName ? ` · ${c.createdByName}` : ''}</div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-brand">
                      <meta.icon size={12} /> {meta.label}
                    </span>
                    <div className="text-ink text-xs mt-0.5 max-w-xs truncate">
                      {(c.targetNames || []).slice(0, 3).join(', ')}
                      {(c.targetNames || []).length > 3 && <span className="text-ink-muted"> +{c.targetNames.length - 3}</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="font-bold text-ink">{showValue(c)}</span>
                    {c.maxDiscount > 0 && <div className="text-[11px] text-ink-muted">max {rupee(c.maxDiscount)}</div>}
                    {c.minOrder > 0 && <div className="text-[11px] text-ink-muted">min order {rupee(c.minOrder)}</div>}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-ink-muted text-xs">
                    {c.timesUsed || 0}{c.usageLimit ? ` / ${c.usageLimit}` : ' / ∞'}
                    {c.expiresAt && <div>till {dateOnly(c.expiresAt)}</div>}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${st.cls}`}>{st.label}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => onView(c)} title="View coupon" className="p-1.5 rounded-lg text-ink-muted hover:bg-surface-alt hover:text-brand"><Ticket size={15} /></button>
                      <button onClick={() => onToggle(c)} title={c.isActive ? 'Pause' : 'Resume'} className="p-1.5 rounded-lg text-ink-muted hover:bg-surface-alt hover:text-brand">
                        {c.isActive ? <Pause size={15} /> : <Play size={15} />}
                      </button>
                      <button onClick={() => onEdit(c)} title="Edit" className="p-1.5 rounded-lg text-ink-muted hover:bg-surface-alt hover:text-brand"><Pencil size={15} /></button>
                      <button onClick={() => onRemove(c)} title="Remove" className="p-1.5 rounded-lg text-ink-muted hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-ink-muted">
                No discounts yet. Add one — you’ll generate its coupon code as part of the flow.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
