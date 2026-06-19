import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Building2, User, Phone, Mail, ScrollText, FileText, FileType2, Pencil, Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Dropzone from '../../components/admin/Dropzone.jsx';

// Authenticated blob download.
const downloadFile = async (url, fallbackName) => {
  const res = await api.get(url, { responseType: 'blob' });
  const cd = res.headers['content-disposition'] || '';
  const m = cd.match(/filename="?([^"]+)"?/);
  const href = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = href; a.download = m ? m[1] : fallbackName; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(href);
};

const blank = {
  companyName: '',
  supplierName: '',
  phone: '',
  email: '',
  image: '',
  notes: '',
  isActive: true,
};

export default function SupplierFormPage() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();

  const [value, setValue] = useState(blank);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [contract, setContract] = useState(null);

  const patch = (p) => setValue((v) => ({ ...v, ...p }));

  const loadContract = useCallback(async () => {
    if (!editing) return;
    try {
      const res = await api.get('/contracts', { params: { supplierId: id } });
      setContract((res.data?.data?.items || [])[0] || null);
    } catch { /* ignore */ }
  }, [editing, id]);

  useEffect(() => { loadContract(); }, [loadContract]);

  const deleteContract = async () => {
    if (!contract) return;
    if (!window.confirm('Delete this contract? The supplier will become available for a new contract again.')) return;
    try { await api.delete(`/contracts/${contract.id}`); toast.success('Contract deleted'); setContract(null); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };
  const grab = async (kind) => {
    try { await downloadFile(`/contracts/${contract.id}/${kind}`, `contract-${contract.id}.${kind === 'pdf' ? 'pdf' : 'doc'}`); }
    catch { toast.error('Download failed'); }
  };

  useEffect(() => {
    if (!editing) return;
    let off = false;
    (async () => {
      try {
        const res = await api.get(`/suppliers/${id}`);
        const s = res.data?.data?.item;
        if (!off && s) {
          setValue({
            companyName: s.companyName || '',
            supplierName: s.supplierName || '',
            phone: s.phone || '',
            email: s.email || '',
            image: s.image || '',
            notes: s.notes || '',
            isActive: s.isActive !== false,
          });
        }
      } catch {
        toast.error('Could not load supplier');
      } finally {
        if (!off) setLoading(false);
      }
    })();
    return () => { off = true; };
  }, [editing, id]);

  const save = async () => {
    if (!value.companyName.trim()) return toast.error('Company name is required');
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/suppliers/${id}`, value);
        toast.success('Supplier updated');
      } else {
        await api.post('/suppliers', value);
        toast.success('Supplier created');
      }
      navigate('/admin/suppliers');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-ink-muted"><Loader2 className="animate-spin mx-auto text-brand" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate('/admin/suppliers')} className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-brand mb-3">
        <ArrowLeft size={16} /> Back to suppliers
      </button>
      <h1 className="text-2xl font-display font-bold mb-1">{editing ? 'Edit supplier' : 'New supplier'}</h1>
      <p className="text-sm text-ink-muted mb-6">Partner / vendor details. Image &amp; B2B contract are optional.</p>

      <div className="bg-white rounded-2xl shadow-soft p-6 space-y-4">
        <Field label="Company name" required icon={Building2}>
          <input className="input" value={value.companyName} onChange={(e) => patch({ companyName: e.target.value })} placeholder="e.g. Adventure Rocks Pvt. Ltd." />
        </Field>
        <Field label="Supplier name" icon={User}>
          <input className="input" value={value.supplierName} onChange={(e) => patch({ supplierName: e.target.value })} placeholder="Contact person" />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Phone" icon={Phone}>
            <input className="input" value={value.phone} onChange={(e) => patch({ phone: e.target.value })} placeholder="+91…" />
          </Field>
          <Field label="Email" icon={Mail}>
            <input type="email" className="input" value={value.email} onChange={(e) => patch({ email: e.target.value })} placeholder="name@company.com" />
          </Field>
        </div>

        <div>
          <label className="label">Image <span className="text-ink-muted font-normal">(optional)</span></label>
          <Dropzone
            instant
            value={value.image}
            onChange={(url) => patch({ image: url })}
            existingUrl={value.image}
            onClearExisting={() => patch({ image: '' })}
            placeholder="Drag & drop a logo/photo, click to browse, or paste a link"
          />
        </div>

        <Field label="Notes" icon={null}>
          <textarea className="input min-h-[80px]" value={value.notes} onChange={(e) => patch({ notes: e.target.value })} placeholder="Anything to remember about this supplier…" />
        </Field>

        <label className="flex items-center gap-2 cursor-pointer pt-1">
          <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--brand))]" checked={value.isActive} onChange={(e) => patch({ isActive: e.target.checked })} />
          <span className="text-sm font-medium text-ink">Active</span>
        </label>

        <div className="flex gap-2 pt-2">
          <button onClick={save} disabled={saving} className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-brand text-ink font-semibold hover:brightness-105 disabled:opacity-60">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {editing ? 'Update supplier' : 'Save supplier'}
          </button>
          <button onClick={() => navigate('/admin/suppliers')} className="px-5 py-2.5 rounded-lg border border-gray-200 font-medium hover:bg-surface-alt">Cancel</button>
        </div>
      </div>

      {/* Contract section — only for an existing supplier */}
      {editing && (
        <div className="bg-white rounded-2xl shadow-soft p-6 mt-5">
          <h2 className="font-semibold text-lg mb-1 inline-flex items-center gap-2"><ScrollText size={18} className="text-brand" /> Contract</h2>
          <p className="text-sm text-ink-muted mb-4">One B2B contract per supplier. Generate, download, edit or delete it here.</p>

          {contract ? (
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink truncate">{contract.title}</div>
                  <div className="text-[11px] text-ink-muted">
                    Created {new Date(contract.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}{(Array.isArray(contract.items) ? contract.items.filter((i) => i.include !== false && Number(i.b2bPrice) > 0).length : 0)} priced activities
                  </div>
                </div>
                <button onClick={() => grab('pdf')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-surface-alt"><FileText size={15} /> PDF</button>
                <button onClick={() => grab('word')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-surface-alt"><FileType2 size={15} /> Word</button>
                <button onClick={() => navigate(`/admin/contracts/${contract.id}/edit`)} className="p-2 rounded-lg text-ink-muted hover:bg-surface-alt hover:text-brand" title="Edit"><Pencil size={16} /></button>
                <button onClick={deleteContract} className="p-2 rounded-lg text-rose-500 hover:bg-rose-50" title="Delete"><Trash2 size={16} /></button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-gray-300 p-5">
              <span className="text-sm text-ink-muted">No contract yet for this supplier.</span>
              <button onClick={() => navigate(`/admin/contracts/new?supplierId=${id}`)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-ink font-semibold hover:brightness-105">
                <Plus size={16} /> Create contract
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, required, icon: Icon, children }) {
  return (
    <div>
      <label className="label inline-flex items-center gap-1.5">
        {Icon && <Icon size={14} />} {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
    </div>
  );
}
