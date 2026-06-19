import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Truck, Building2, IndianRupee, FileText, FileType2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';

const blank = {
  supplierId: '',
  title: 'Service Agreement',
  intro: '',
  formalities: '',
  items: [], // [{ experienceId, name, include, b2bPrice }]
};

const fmtDate = (d) => { const dt = new Date(d); return Number.isNaN(dt.getTime()) ? String(d || '') : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); };
const scheduleSummary = (dates) => (Array.isArray(dates) ? dates : []).map((d) => ({
  date: fmtDate(d.date),
  slots: (Array.isArray(d.slots) ? d.slots : []).map((s) => `${s.start}–${s.end}`),
}));

// Authenticated blob download.
const download = async (url, fallbackName) => {
  const res = await api.get(url, { responseType: 'blob' });
  const cd = res.headers['content-disposition'] || '';
  const m = cd.match(/filename="?([^"]+)"?/);
  const href = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = href; a.download = m ? m[1] : fallbackName; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(href);
};

export default function ContractFormPage() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [value, setValue] = useState(() => {
    const sid = params.get('supplierId');
    return sid ? { ...blank, supplierId: sid } : blank;
  });
  const [suppliers, setSuppliers] = useState([]);
  const [usedSupplierIds, setUsedSupplierIds] = useState([]); // suppliers that already have a contract
  const [operator, setOperator] = useState(null);
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(editing);
  const [loadingActs, setLoadingActs] = useState(false);
  const [saving, setSaving] = useState(false);

  const patch = (p) => setValue((v) => ({ ...v, ...p }));

  // Suppliers + our company profile + which suppliers are already contracted.
  useEffect(() => {
    api.get('/suppliers', { params: { active: 'true' } }).then((r) => setSuppliers(r.data?.data?.items || [])).catch(() => {});
    api.get('/admin/company-profile').then((r) => setOperator(r.data?.data?.profile || null)).catch(() => {});
    api.get('/contracts').then((r) => setUsedSupplierIds((r.data?.data?.items || []).map((c) => c.supplierId).filter(Boolean))).catch(() => {});
  }, []);

  // Load existing contract (edit).
  useEffect(() => {
    if (!editing) return;
    let off = false;
    api.get(`/contracts/${id}`)
      .then((r) => {
        const c = r.data?.data?.item;
        if (!off && c) {
          setValue({
            supplierId: c.supplierId || '',
            title: c.title || 'Service Agreement',
            intro: c.intro || '',
            formalities: c.formalities || '',
            items: Array.isArray(c.items) ? c.items : [],
          });
        }
      })
      .catch(() => toast.error('Could not load contract'))
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
  }, [editing, id]);

  // When a supplier is picked, load its profile + activities and merge with any
  // already-saved item prices (keyed by experienceId).
  const loadSupplierData = useCallback(async (supplierId, existingItems) => {
    if (!supplierId) { setSupplier(null); return; }
    setLoadingActs(true);
    try {
      const [sRes, eRes] = await Promise.all([
        api.get(`/suppliers/${supplierId}`),
        api.get('/experiences', { params: { supplierId } }),
      ]);
      setSupplier(sRes.data?.data?.item || null);
      const acts = eRes.data?.data?.items || [];
      const prev = new Map((existingItems || []).map((it) => [it.experienceId, it]));
      const items = acts.map((a) => {
        const old = prev.get(a.id);
        return {
          experienceId: a.id,
          name: a.name,
          dates: Array.isArray(a.schedule?.dates) ? a.schedule.dates : [],
          include: old ? old.include !== false : true,
          b2bPrice: old ? (old.b2bPrice ?? '') : '',
        };
      });
      setValue((v) => ({ ...v, items }));
    } catch {
      toast.error('Could not load supplier activities');
    } finally {
      setLoadingActs(false);
    }
  }, []);

  // Re-fetch activities whenever supplierId changes (and once after edit-load).
  useEffect(() => {
    if (loading) return; // wait until edit data is in
    if (value.supplierId) loadSupplierData(value.supplierId, value.items);
    else setSupplier(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.supplierId, loading]);

  const setItem = (idx, p) => setValue((v) => ({ ...v, items: v.items.map((it, i) => (i === idx ? { ...it, ...p } : it)) }));

  const saveAndGenerate = async () => {
    if (!value.supplierId) return toast.error('Pick a supplier');
    const payload = {
      supplierId: Number(value.supplierId),
      title: value.title?.trim() || 'Service Agreement',
      intro: value.intro,
      formalities: value.formalities,
      items: value.items.map((it) => ({ ...it, b2bPrice: it.b2bPrice === '' ? 0 : Number(it.b2bPrice) })),
      status: 'generated',
    };
    setSaving(true);
    try {
      const res = editing
        ? await api.put(`/contracts/${id}`, payload)
        : await api.post('/contracts', payload);
      const cid = res.data?.data?.item?.id || id;
      toast.success('Contract saved — downloading PDF & Word');
      // Generate + download both documents.
      try {
        await download(`/contracts/${cid}/pdf`, `contract-${cid}.pdf`);
        await download(`/contracts/${cid}/word`, `contract-${cid}.doc`);
      } catch { toast.error('Saved, but download failed — use the buttons in the list'); }
      navigate('/admin/suppliers?tab=contracts');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-ink-muted"><Loader2 className="animate-spin mx-auto text-brand" /></div>;

  const pricedCount = value.items.filter((it) => it.include !== false && Number(it.b2bPrice) > 0).length;
  // One contract per supplier: hide suppliers that already have one (but keep the current one when editing).
  const availableSuppliers = suppliers.filter((s) => !usedSupplierIds.includes(s.id) || String(s.id) === String(value.supplierId));

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => navigate('/admin/suppliers?tab=contracts')} className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-brand mb-3">
        <ArrowLeft size={16} /> Back to contracts
      </button>
      <h1 className="text-2xl font-display font-bold mb-1">{editing ? 'Edit contract' : 'New contract'}</h1>
      <p className="text-sm text-ink-muted mb-6">Agreement between you (operator) and a supplier. Save &amp; Generate produces a downloadable PDF and Word file.</p>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-5">
          {/* Parties */}
          <div className="bg-white rounded-2xl shadow-soft p-6 grid sm:grid-cols-2 gap-5">
            {/* Operator (us) */}
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-2 inline-flex items-center gap-1.5"><Building2 size={13} /> Operator (you)</div>
              {operator?.companyName ? (
                <div className="text-sm">
                  <div className="font-semibold text-ink">{operator.companyName}</div>
                  {operator.name && <div className="text-ink-muted">{operator.name}</div>}
                  <div className="text-ink-muted">{[operator.email, operator.phone].filter(Boolean).join(' · ')}</div>
                </div>
              ) : (
                <div className="text-sm text-amber-700 bg-amber-50 rounded-lg p-2 inline-flex items-start gap-1.5">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>Set your details in <Link to="/admin/company-profile" className="underline font-medium">Company profile</Link> so they print on the contract.</span>
                </div>
              )}
            </div>
            {/* Supplier */}
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-2 inline-flex items-center gap-1.5"><Truck size={13} /> Supplier</div>
              <select className="input mb-3" value={value.supplierId} onChange={(e) => patch({ supplierId: e.target.value })}>
                <option value="">— Select supplier —</option>
                {availableSuppliers.map((s) => <option key={s.id} value={s.id}>{s.companyName}{s.supplierName ? ` · ${s.supplierName}` : ''}</option>)}
              </select>
              <p className="text-[11px] text-ink-muted -mt-2 mb-2">Suppliers that already have a contract are hidden (one contract per supplier).</p>
              {supplier && (
                <div className="flex items-center gap-3 text-sm">
                  {supplier.image && <img src={fileUrl(supplier.image)} alt="" className="w-10 h-10 rounded-lg object-cover border" />}
                  <div>
                    <div className="font-semibold text-ink">{supplier.companyName}</div>
                    <div className="text-ink-muted">{[supplier.supplierName, supplier.phone, supplier.email].filter(Boolean).join(' · ')}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Title + intro */}
          <div className="bg-white rounded-2xl shadow-soft p-6 space-y-4">
            <div>
              <label className="label">Contract title</label>
              <input className="input" value={value.title} onChange={(e) => patch({ title: e.target.value })} placeholder="Service Agreement" />
            </div>
            <div>
              <label className="label">Contract intro / scope</label>
              <textarea className="input min-h-[100px]" value={value.intro} onChange={(e) => patch({ intro: e.target.value })}
                placeholder="A short description of what this agreement covers…" />
            </div>
          </div>

          {/* Activities */}
          <div className="bg-white rounded-2xl shadow-soft p-6">
            <h2 className="font-semibold text-lg mb-1">Activities &amp; B2B pricing</h2>
            <p className="text-sm text-ink-muted mb-4">Tick the activities to include and set a B2B price for each. Only ticked rows with a price appear in the contract.</p>
            {!value.supplierId ? (
              <p className="text-sm text-ink-muted italic">Select a supplier to load its activities.</p>
            ) : loadingActs ? (
              <div className="text-sm text-ink-muted inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading activities…</div>
            ) : value.items.length === 0 ? (
              <p className="text-sm text-ink-muted italic">This supplier has no activities yet. Create experiences and link them to this supplier first.</p>
            ) : (
              <div className="space-y-2">
                {value.items.map((it, i) => {
                  const sched = scheduleSummary(it.dates);
                  return (
                    <div key={it.experienceId} className={`flex flex-wrap items-start gap-3 rounded-lg border p-3 ${it.include !== false ? 'border-brand/30 bg-brand/5' : 'border-gray-200'}`}>
                      <div className="flex-1 min-w-0">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--brand))]" checked={it.include !== false} onChange={(e) => setItem(i, { include: e.target.checked })} />
                          <span className="font-medium text-ink">{it.name}</span>
                        </label>
                        {sched.length > 0 ? (
                          <div className="mt-1.5 ml-6 space-y-0.5">
                            {sched.map((d, di) => (
                              <div key={di} className="text-[11px] text-ink-muted">
                                <span className="font-medium text-ink">{d.date}</span>
                                {d.slots.length ? <span> · {d.slots.join(', ')}</span> : <span className="italic"> · no slots</span>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-1 ml-6 text-[11px] text-ink-muted italic">No dates set for this activity.</div>
                        )}
                      </div>
                      <div className="relative">
                        <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                        <input type="number" min={0} className="input pl-8 w-40" placeholder="Add B2B price"
                          value={it.b2bPrice} disabled={it.include === false}
                          onChange={(e) => setItem(i, { b2bPrice: e.target.value === '' ? '' : Number(e.target.value) })} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Formalities */}
          <div className="bg-white rounded-2xl shadow-soft p-6">
            <label className="label">Signing / contracting formalities</label>
            <textarea className="input min-h-[120px]" value={value.formalities} onChange={(e) => patch({ formalities: e.target.value })}
              placeholder="Payment terms, validity, signatures clause, jurisdiction…" />
          </div>
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-1 lg:sticky lg:top-6 space-y-4">
          <div className="bg-white rounded-2xl shadow-soft p-5">
            <h3 className="font-semibold mb-1">Generate</h3>
            <p className="text-[11px] text-ink-muted mb-3">{pricedCount} activit{pricedCount === 1 ? 'y' : 'ies'} will be printed.</p>
            <button onClick={saveAndGenerate} disabled={saving} className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-brand text-ink font-semibold hover:brightness-105 disabled:opacity-60">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save &amp; Generate
            </button>
            <div className="flex items-center gap-2 mt-2 text-[11px] text-ink-muted">
              <FileText size={13} /> PDF &nbsp;+&nbsp; <FileType2 size={13} /> Word — auto-downloaded
            </div>
            <button onClick={() => navigate('/admin/suppliers?tab=contracts')} className="w-full mt-3 px-5 py-2.5 rounded-lg border border-gray-200 font-medium hover:bg-surface-alt">Cancel</button>
          </div>
        </aside>
      </div>
    </div>
  );
}
