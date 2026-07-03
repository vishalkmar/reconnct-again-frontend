import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Save, Camera, Building2 } from 'lucide-react';
import api from '../../services/api';
import { useUserAuth } from '../../context/UserAuthContext.jsx';

const initialForm = (user) => ({
  name: user?.name || '',
  company: user?.company || '',
  phone: user?.phone || '',
  avatarUrl: user?.avatarUrl || '',
  addressLine: user?.addressLine || '',
  city: user?.city || '',
});

export default function HostProfilePage() {
  const { user, setSession } = useUserAuth();
  const [form, setForm] = useState(initialForm(user));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { setForm(initialForm(user)); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const initials = (user?.name || user?.email || '?').split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const change = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const uploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) { toast.error('Please choose an image'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/uploads/user-avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = res.data?.data?.url;
      if (!url) throw new Error('Upload returned no URL');
      setForm((p) => ({ ...p, avatarUrl: url }));
      toast.success('Photo uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not upload image');
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      for (const k of Object.keys(payload)) if (typeof payload[k] === 'string') payload[k] = payload[k].trim();
      const res = await api.patch('/user-auth/profile', payload);
      setSession({ user: res.data.data.user });
      toast.success('Profile saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold">Host Profile</h1>
        <p className="text-sm text-ink-muted mt-1">This is the same profile as your account — guests see your name and business.</p>
      </div>

      <form onSubmit={submit} className="bg-white rounded-2xl shadow-soft p-6 md:p-8 space-y-8">
        <section className="flex items-center gap-5 pb-6 border-b">
          <div className="relative">
            {form.avatarUrl ? (
              <img src={form.avatarUrl} alt="" className="w-20 h-20 rounded-full object-cover ring-2 ring-brand/20" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-brand text-white flex items-center justify-center text-2xl font-bold">{initials}</div>
            )}
            {uploading && <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full"><Loader2 className="animate-spin text-white" size={20} /></div>}
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-ink">Profile photo</h2>
            <p className="text-sm text-ink-muted mb-2">PNG or JPG, square works best.</p>
            <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border hover:bg-surface-alt cursor-pointer text-sm font-medium">
              <Camera size={16} /> {form.avatarUrl ? 'Change photo' : 'Upload photo'}
              <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} disabled={uploading} />
            </label>
          </div>
        </section>

        <section>
          <h2 className="font-semibold text-ink mb-4 flex items-center gap-2"><Building2 size={18} className="text-brand" /> Host details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Full name" required>
              <input type="text" value={form.name} onChange={change('name')} required className="hinput" placeholder="Your name" />
            </Field>
            <Field label="Business / company name">
              <input type="text" value={form.company} onChange={change('company')} className="hinput" placeholder="e.g. Coastal Adventures Co." />
            </Field>
            <Field label="Email">
              <input type="email" value={user?.email || ''} disabled className="hinput bg-surface-alt cursor-not-allowed" />
              <p className="text-xs text-ink-muted mt-1">Email cannot be changed.</p>
            </Field>
            <Field label="Phone">
              <input type="tel" value={form.phone} onChange={change('phone')} className="hinput" placeholder="+91 98765 43210" />
            </Field>
            <Field label="Address" className="md:col-span-2">
              <input type="text" value={form.addressLine} onChange={change('addressLine')} className="hinput" placeholder="House, street, area" />
            </Field>
            <Field label="City">
              <input type="text" value={form.city} onChange={change('city')} className="hinput" />
            </Field>
          </div>
        </section>

        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <button type="submit" disabled={saving || uploading} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand text-ink font-semibold hover:brightness-105 disabled:opacity-60 transition">
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Save changes
          </button>
        </div>
      </form>

      <style>{`
        .hinput { width:100%; padding:0.625rem 0.875rem; border-radius:0.5rem; border:1px solid #d1d5db; outline:none; font-size:0.875rem; background:#fff; }
        .hinput:focus { border-color: rgb(var(--brand)); box-shadow: 0 0 0 3px rgb(var(--brand) / 0.15); }
      `}</style>
    </div>
  );
}

function Field({ label, required, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-medium text-ink mb-1.5 inline-block">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</span>
      {children}
    </label>
  );
}
