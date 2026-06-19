import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Building2, User, Phone, Mail, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Dropzone from '../../components/admin/Dropzone.jsx';

const blank = { companyName: '', name: '', email: '', phone: '', address: '', logo: '', image: '' };

export default function CompanyProfilePage() {
  const navigate = useNavigate();
  const [value, setValue] = useState(blank);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const patch = (p) => setValue((v) => ({ ...v, ...p }));

  useEffect(() => {
    let off = false;
    api.get('/admin/company-profile')
      .then((res) => { if (!off) setValue({ ...blank, ...(res.data?.data?.profile || {}) }); })
      .catch(() => {})
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/admin/company-profile', value);
      toast.success('Company profile saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-ink-muted"><Loader2 className="animate-spin mx-auto text-brand" /></div>;

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-brand mb-3">
        <ArrowLeft size={16} /> Back
      </button>
      <h1 className="text-2xl font-display font-bold mb-1">Company profile</h1>
      <p className="text-sm text-ink-muted mb-6">Your details as the operator — printed on every contract you generate, so you don't re-enter them each time.</p>

      <div className="bg-white rounded-2xl shadow-soft p-6 space-y-4">
        <Field label="Company name" icon={Building2}>
          <input className="input" value={value.companyName} onChange={(e) => patch({ companyName: e.target.value })} placeholder="e.g. Reconnct Ventures LLP" />
        </Field>
        <Field label="Contact / signatory name" icon={User}>
          <input className="input" value={value.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. Abhineet Gupta" />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Email" icon={Mail}>
            <input type="email" className="input" value={value.email} onChange={(e) => patch({ email: e.target.value })} placeholder="name@company.com" />
          </Field>
          <Field label="Phone" icon={Phone}>
            <input className="input" value={value.phone} onChange={(e) => patch({ phone: e.target.value })} placeholder="+91…" />
          </Field>
        </div>
        <Field label="Address" icon={MapPin}>
          <input className="input" value={value.address} onChange={(e) => patch({ address: e.target.value })} placeholder="City, Country" />
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Logo</label>
            <Dropzone instant value={value.logo} onChange={(url) => patch({ logo: url })}
              existingUrl={value.logo} onClearExisting={() => patch({ logo: '' })}
              placeholder="Drag & drop logo, click, or paste a link" />
          </div>
          <div>
            <label className="label">Image</label>
            <Dropzone instant value={value.image} onChange={(url) => patch({ image: url })}
              existingUrl={value.image} onClearExisting={() => patch({ image: '' })}
              placeholder="Drag & drop image, click, or paste a link" />
          </div>
        </div>

        <div className="pt-2">
          <button onClick={save} disabled={saving} className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-brand text-ink font-semibold hover:brightness-105 disabled:opacity-60">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save profile
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <div>
      <label className="label inline-flex items-center gap-1.5">{Icon && <Icon size={14} />} {label}</label>
      {children}
    </div>
  );
}
