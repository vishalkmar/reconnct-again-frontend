import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, Plus, Search, Loader2, Check, X, Pencil, Trash2, Pause, Play,
  Globe, Layers, Users, BarChart3, RotateCcw, IndianRupee, Percent, ChevronRight, AlertTriangle, Gift,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import PricingSetupShell from './PricingSetupShell.jsx';

/*
  Convenience Management — the ONE place the convenience fee is set.

  Same engine as Markup Management (scopes + latest-applied-wins). The only
  difference is where the money lands: this fee is charged LAST, on the amount
  that already includes GST.

      base → +markup → −discount → +GST → +CONVENIENCE FEE → payable
*/

const SCOPES = [
  { key: 'all', label: 'To All', icon: Globe, hint: 'Every experience — now and in future. There is only ever one of these; saving replaces it.' },
  { key: 'category', label: 'Broad Category wise', icon: Layers, hint: 'Pick one or more broad categories.' },
  { key: 'audience', label: 'Based on "Who is this for"', icon: Users, hint: 'Pick one or more audience tags.' },
  { key: 'experience', label: 'Specific experiences', icon: Sparkles, hint: 'Pick individual live listings.' },
];
const SCOPE_META = Object.fromEntries(SCOPES.map((s) => [s.key, s]));

const rupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const describeFee = (f) => {
  if (!f || f.type === 'free' || !Number(f.value)) return 'Free';
  return f.type === 'percentage' ? `${Number(f.value)}%` : rupee(f.value);
};
const when = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—');

export default function ConvenienceManagementPage() {
  const [rules, setRules] = useState([]);
  const [targets, setTargets] = useState({ categories: [], audiences: [], experiences: [] });
  const [effective, setEffective] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const [resyncing, setResyncing] = useState(false);
  const [apiMissing, setApiMissing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      api.get('/admin/pricing-setup/convenience/rules'),
      api.get('/admin/pricing-setup/convenience/targets'),
      api.get('/admin/pricing-setup/convenience/effective'),
    ]);
    const [r, t, e] = results;
    if (r.status === 'fulfilled') setRules(r.value.data?.data?.items || []);
    if (t.status === 'fulfilled') setTargets(t.value.data?.data || { categories: [], audiences: [], experiences: [] });
    if (e.status === 'fulfilled') setEffective(e.value.data?.data?.items || []);

    const failed = results.filter((x) => x.status === 'rejected');
    const missing = failed.some((x) => x.reason?.response?.status === 404);
    setApiMissing(missing);
    if (failed.length && !missing) toast.error(failed[0].reason?.response?.data?.message || 'Could not load convenience rules');
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resync = async () => {
    setResyncing(true);
    try {
      const { data } = await api.post('/admin/pricing-setup/convenience/resync');
      toast.success(data.message || 'Re-applied');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setResyncing(false); }
  };

  const toggle = async (rule) => {
    try { await api.patch(`/admin/pricing-setup/convenience/rules/${rule.id}/toggle`); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const remove = async (rule) => {
    if (!window.confirm('Remove this convenience fee rule? Every experience it currently drives falls back to the next most recent rule.')) return;
    try {
      const { data } = await api.delete(`/admin/pricing-setup/convenience/rules/${rule.id}`);
      toast.success(data.message || 'Removed');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const charging = effective.filter((e) => e.fee && e.fee.type !== 'free' && Number(e.fee.value) > 0);
  const freeOnes = effective.filter((e) => e.live && (!e.fee || e.fee.type === 'free' || !Number(e.fee.value)));

  return (
    <PricingSetupShell
      title="Convenience Management"
      subtitle="Set the convenience fee once here and every matching experience picks it up automatically — charged last, on the amount that already includes GST."
    >
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <button onClick={() => { setEditRule(null); setFormOpen(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-ink text-sm font-bold shadow-soft hover:brightness-105">
          <Plus size={16} /> Add convenience fee
        </button>
        <Link to="/admin/pricing-setup/convenience/analysis"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-ink hover:border-brand/50">
          <BarChart3 size={15} /> Analysis
        </Link>
        <button onClick={resync} disabled={resyncing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-ink-muted hover:text-brand disabled:opacity-60">
          {resyncing ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />} Re-apply everywhere
        </button>
      </div>

      {apiMissing && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800 mb-5">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            The convenience API isn’t responding on this server yet (<code>/api/admin/pricing-setup/convenience/*</code> returns 404).
            This screen works once the backend carrying Convenience Management is deployed.
          </span>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <Stat label="Active rules" value={rules.filter((r) => r.isActive).length} icon={Sparkles} tint="text-brand bg-brand/10" />
        <Stat label="Experiences charging a fee" value={charging.length} icon={IndianRupee} tint="text-emerald-600 bg-emerald-50" />
        <Stat label="Live listings that are free" value={freeOnes.length} icon={Gift} tint="text-sky-600 bg-sky-50" />
      </div>

      {formOpen && (
        <ConvenienceForm
          targets={targets}
          rules={rules}
          rule={editRule}
          onClose={() => { setFormOpen(false); setEditRule(null); }}
          onSaved={() => { setFormOpen(false); setEditRule(null); load(); }}
        />
      )}

      {loading ? (
        <div className="py-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
      ) : (
        <div className="space-y-6">
          <RulesTable rules={rules} onEdit={(r) => { setEditRule(r); setFormOpen(true); }} onToggle={toggle} onRemove={remove} />
          <EffectiveTable items={effective} />
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

// ─── Add / edit a rule ──────────────────────────────────────────────────────
function ConvenienceForm({ targets, rules, rule, onClose, onSaved }) {
  const editing = !!rule;
  const [scope, setScope] = useState(rule?.scope || '');
  const [picked, setPicked] = useState(rule?.targetIds?.map(Number) || []);
  const [applied, setApplied] = useState(editing || rule?.scope === 'all');
  const [type, setType] = useState(rule?.type || 'percentage');
  const [value, setValue] = useState(rule ? Number(rule.value) : '');
  const [months, setMonths] = useState(rule ? Number(rule.months) || 0 : 0);
  const [cutThrough, setCutThrough] = useState(rule ? Number(rule.cutThrough) || 0 : 0);
  const [note, setNote] = useState(rule?.note || '');
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

  // The one existing platform-wide rule, if any — a new "To All" replaces it.
  const currentGlobal = (rules || []).find((r) => r.scope === 'all');

  const chooseScope = (key) => { setScope(key); setPicked([]); setApplied(key === 'all'); };
  const togglePick = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const save = async () => {
    if (!scope) return toast.error('Choose where this fee applies');
    if (scope !== 'all' && !picked.length) return toast.error('Select at least one target');
    if (type !== 'free' && !Number(value)) return toast.error('Enter a fee value');
    setSaving(true);
    try {
      const body = {
        scope, targetIds: scope === 'all' ? [] : picked, type, value: Number(value) || 0, months, cutThrough, note,
      };
      const { data } = editing
        ? await api.put(`/admin/pricing-setup/convenience/rules/${rule.id}`, body)
        : await api.post('/admin/pricing-setup/convenience/rules', body);
      toast.success(data.message || 'Saved');
      onSaved();
    } catch (err) { toast.error(err.response?.data?.message || 'Could not save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-2xl shadow-soft p-5 mb-6 border border-brand/20">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-display font-bold text-lg">{editing ? 'Edit convenience fee' : 'Add convenience fee'}</h2>
          <p className="text-xs text-ink-muted">Saving applies it immediately to every matching experience.</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-alt text-ink-muted"><X size={18} /></button>
      </div>

      <div className="mb-5">
        <div className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-2">1 · Where does it apply?</div>
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

      {/* "To All" is a single platform-wide default — say what it will overwrite. */}
      {scope === 'all' && currentGlobal && (!editing || currentGlobal.id !== rule.id) && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800 mb-5">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            There is already a platform-wide convenience fee of <strong>{describeFee(currentGlobal)}</strong>. Saving
            <strong> replaces</strong> it — there is only ever one “To All” rule, never two.
          </span>
        </div>
      )}

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

      {applied && scope && (
        <div className="rounded-xl bg-surface-alt/60 p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-2">{scope === 'all' ? '2' : '3'} · The fee</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Fee type</label>
              <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="free">Free (no fee)</option>
                <option value="percentage">Percentage % of the post-GST amount</option>
                <option value="fixed">Flat (fixed amount ₹)</option>
              </select>
            </div>
            {type !== 'free' && (
              <div>
                <label className="label">Value</label>
                <div className="relative">
                  {type === 'fixed'
                    ? <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                    : <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />}
                  <input type="number" min={0} className="input pl-8" placeholder="0" value={value}
                    onChange={(e) => setValue(e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
              </div>
            )}
          </div>

          {type === 'free' && (
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="label">Free for (months)</label>
                <div className="relative">
                  <input type="number" min={0} className="input pr-12" placeholder="0" value={months || ''}
                    onChange={(e) => setMonths(e.target.value === '' ? 0 : Number(e.target.value))} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">mo</span>
                </div>
              </div>
              <div>
                <label className="label">Cut-through amount</label>
                <div className="relative">
                  <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                  <input type="number" min={0} className="input pl-8" placeholder="0" value={cutThrough || ''}
                    onChange={(e) => setCutThrough(e.target.value === '' ? 0 : Number(e.target.value))} />
                </div>
                <p className="text-[11px] text-ink-muted mt-1">Shown struck-through in place of the fee, so the saving is visible.</p>
              </div>
            </div>
          )}

          <div className="mt-3">
            <label className="label">Note <span className="font-normal text-ink-muted">(optional)</span></label>
            <input className="input" placeholder="e.g. Launch offer — no fee" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button onClick={save} disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-brand text-ink text-sm font-bold disabled:opacity-60">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} {editing ? 'Update & apply' : 'Save & apply'}
            </button>
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-ink-muted hover:bg-white">Cancel</button>
            <span className="text-[11px] text-ink-muted ml-auto text-right max-w-sm">
              This becomes the newest rule — where it overlaps an older one, this one wins.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Rules ──────────────────────────────────────────────────────────────────
function RulesTable({ rules, onEdit, onToggle, onRemove }) {
  return (
    <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold">Convenience fee rules</h2>
        <p className="text-xs text-ink-muted">Newest first. Where two rules cover the same experience, the one applied most recently is the one that counts.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt/60 text-[11px] uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="text-left font-semibold px-5 py-2.5">Applies to</th>
              <th className="text-left font-semibold px-3 py-2.5">Fee</th>
              <th className="text-left font-semibold px-3 py-2.5">Applied</th>
              <th className="text-right font-semibold px-3 py-2.5">Winning on</th>
              <th className="text-right font-semibold px-5 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rules.map((r) => {
              const meta = SCOPE_META[r.scope] || SCOPES[0];
              return (
                <tr key={r.id} className={r.isActive ? '' : 'opacity-55'}>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-brand">
                      <meta.icon size={12} /> {meta.label}
                    </span>
                    <div className="text-ink mt-0.5 max-w-md">
                      {(r.targetNames || []).slice(0, 4).join(', ')}
                      {(r.targetNames || []).length > 4 && <span className="text-ink-muted"> +{r.targetNames.length - 4} more</span>}
                    </div>
                    {r.note && <div className="text-[11px] text-ink-muted italic mt-0.5">{r.note}</div>}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className={`font-bold ${r.type === 'free' ? 'text-emerald-600' : 'text-ink'}`}>{describeFee(r)}</span>
                    {r.type === 'free' && (Number(r.months) > 0 || Number(r.cutThrough) > 0) && (
                      <div className="text-[11px] text-ink-muted">
                        {Number(r.months) > 0 ? `${r.months} mo` : ''}
                        {Number(r.cutThrough) > 0 && <span className="ml-1 line-through">{rupee(r.cutThrough)}</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-ink-muted whitespace-nowrap text-xs">
                    {when(r.appliedAt)}
                    {r.createdByName && <div className="text-[11px]">by {r.createdByName}</div>}
                  </td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    <span className="font-semibold text-ink">{r.effectiveOn}</span>
                    <span className="text-ink-muted text-xs"> / {r.matchingExperiences}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => onToggle(r)} title={r.isActive ? 'Pause' : 'Resume'}
                        className="p-1.5 rounded-lg text-ink-muted hover:bg-surface-alt hover:text-brand">
                        {r.isActive ? <Pause size={15} /> : <Play size={15} />}
                      </button>
                      <button onClick={() => onEdit(r)} title="Edit" className="p-1.5 rounded-lg text-ink-muted hover:bg-surface-alt hover:text-brand"><Pencil size={15} /></button>
                      <button onClick={() => onRemove(r)} title="Remove" className="p-1.5 rounded-lg text-ink-muted hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {rules.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-ink-muted">
                No convenience fee set yet. Add one and every matching experience picks it up automatically.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── What each experience actually ends up with ─────────────────────────────
function EffectiveTable({ items }) {
  const [q, setQ] = useState('');
  const [onlyLive, setOnlyLive] = useState(true);
  const rows = useMemo(() => items
    .filter((i) => (onlyLive ? i.live : true))
    .filter((i) => !q.trim() || i.name.toLowerCase().includes(q.trim().toLowerCase())), [items, q, onlyLive]);

  return (
    <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[12rem]">
          <h2 className="font-semibold">Effective fee per experience</h2>
          <p className="text-xs text-ink-muted">What each listing charges right now, on top of its post-GST amount.</p>
        </div>
        <label className="inline-flex items-center gap-2 text-xs font-medium text-ink-muted">
          <input type="checkbox" checked={onlyLive} onChange={(e) => setOnlyLive(e.target.checked)} className="w-4 h-4" /> Live only
        </label>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input className="input pl-9 py-1.5 text-sm w-56" placeholder="Search listings…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <div className="overflow-x-auto max-h-[32rem]">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt/60 text-[11px] uppercase tracking-wide text-ink-muted sticky top-0">
            <tr>
              <th className="text-left font-semibold px-5 py-2.5">Experience</th>
              <th className="text-right font-semibold px-3 py-2.5">After GST</th>
              <th className="text-left font-semibold px-3 py-2.5">Fee</th>
              <th className="text-right font-semibold px-3 py-2.5">+ Amount</th>
              <th className="text-right font-semibold px-5 py-2.5">Final payable</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((i) => (
              <tr key={i.id}>
                <td className="px-5 py-2.5">
                  <div className="font-medium text-ink truncate max-w-xs">{i.name}</div>
                  <div className="text-[11px] text-ink-muted truncate max-w-xs">
                    {i.city}{!i.live && <span className="ml-2 text-amber-600 font-semibold">not live</span>}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right text-ink-muted whitespace-nowrap">{rupee(i.afterGst)}</td>
                <td className="px-3 py-2.5">
                  <span className={`font-semibold ${i.fee && i.fee.type !== 'free' ? 'text-ink' : 'text-emerald-600'}`}>{describeFee(i.fee)}</span>
                  {i.ruleLabel && <div className="text-[11px] text-ink-muted truncate max-w-[14rem]">{i.ruleLabel}</div>}
                </td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap text-ink">
                  {i.convenienceAmount ? `+ ${rupee(i.convenienceAmount)}` : '—'}
                </td>
                <td className="px-5 py-2.5 text-right font-bold text-ink whitespace-nowrap">{rupee(i.payable)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-ink-muted">Nothing matches.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
