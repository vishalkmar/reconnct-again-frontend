import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Save, User as UserIcon, Camera } from 'lucide-react';
import api from '../../services/api';
import { useUserAuth } from '../../context/UserAuthContext.jsx';
import DatePicker from '../../components/common/DatePicker.jsx';

// Global rule: every image upload must be under 5MB.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const GENDERS = [
  { value: '', label: '—' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const initialForm = (user) => ({
  name: user?.name || '',
  phone: user?.phone || '',
  avatarUrl: user?.avatarUrl || '',
  gender: user?.gender || '',
  dob: user?.dob || '',
  addressLine: user?.addressLine || '',
  city: user?.city || '',
  state: user?.state || '',
  country: user?.country || '',
  pincode: user?.pincode || '',
});

export default function UserProfilePage() {
  const { user, setSession } = useUserAuth();
  const [form, setForm] = useState(initialForm(user));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Keep the form in sync if the user object reloads after the initial mount.
  useEffect(() => {
    setForm(initialForm(user));
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const initials = (user?.name || user?.email || '?')
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleChange = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      toast.error('Please choose an image file');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(`Image is ${(file.size / (1024 * 1024)).toFixed(1)}MB — please choose one smaller than 5MB.`);
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/uploads/user-avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.data?.url || res.data?.data?.secure_url;
      if (!url) throw new Error('Upload returned no URL');
      setForm((prev) => ({ ...prev, avatarUrl: url }));
      toast.success('Photo uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Could not upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!form.phone.trim()) { toast.error('Phone is required'); return; }

    setSaving(true);
    try {
      const payload = { ...form };
      // Trim every string value; empty strings turn into null on the backend.
      for (const k of Object.keys(payload)) {
        if (typeof payload[k] === 'string') payload[k] = payload[k].trim();
      }
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
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold">My Profile</h1>
        <p className="text-sm text-ink-muted mt-1">Keep your information up to date for faster bookings.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-soft p-6 md:p-8 space-y-8">
        {/* Avatar */}
        <section className="flex items-center gap-5 pb-6 border-b">
          <div className="relative">
            {form.avatarUrl ? (
              <img src={form.avatarUrl} alt="" className="w-20 h-20 rounded-full object-cover ring-2 ring-brand/20" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-brand text-white flex items-center justify-center text-2xl font-bold">
                {initials}
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                <Loader2 className="animate-spin text-white" size={20} />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-ink">Profile photo</h2>
            <p className="text-sm text-ink-muted mb-2">PNG or JPG, square works best.</p>
            <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-surface-alt cursor-pointer text-sm font-medium">
              <Camera size={16} />
              {form.avatarUrl ? 'Change photo' : 'Upload photo'}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
            </label>
            {form.avatarUrl && (
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, avatarUrl: '' }))}
                className="ml-2 text-sm text-red-600 hover:underline"
              >Remove</button>
            )}
          </div>
        </section>

        {/* Basic info */}
        <section>
          <h2 className="font-semibold text-ink mb-4 flex items-center gap-2">
            <UserIcon size={18} className="text-brand" /> Basic information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Full name" required>
              <input
                type="text"
                value={form.name}
                onChange={handleChange('name')}
                required
                className="input"
                placeholder="Your full name"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="input bg-surface-alt cursor-not-allowed"
              />
              <p className="text-xs text-ink-muted mt-1">Email cannot be changed — sign in is tied to it.</p>
            </Field>
            <Field label="Phone" required>
              <input
                type="tel"
                value={form.phone}
                onChange={handleChange('phone')}
                required
                className="input"
                placeholder="+91 98765 43210"
              />
            </Field>
            <Field label="Gender">
              <select value={form.gender} onChange={handleChange('gender')} className="input">
                {GENDERS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Date of birth">
              <DatePicker
                value={form.dob || ''}
                onChange={(iso) => setForm((f) => ({ ...f, dob: iso }))}
                placeholder="Pick your DOB"
              />
            </Field>
          </div>
        </section>

        {/* Address */}
        <section>
          <h2 className="font-semibold text-ink mb-4">Address</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Address line" className="md:col-span-2">
              <input
                type="text"
                value={form.addressLine}
                onChange={handleChange('addressLine')}
                className="input"
                placeholder="House, street, area"
              />
            </Field>
            <Field label="City">
              <input type="text" value={form.city} onChange={handleChange('city')} className="input" />
            </Field>
            <Field label="State / Province">
              <input type="text" value={form.state} onChange={handleChange('state')} className="input" />
            </Field>
            <Field label="Country">
              <input type="text" value={form.country} onChange={handleChange('country')} className="input" />
            </Field>
            <Field label="Pincode">
              <input type="text" value={form.pincode} onChange={handleChange('pincode')} className="input" />
            </Field>
          </div>
        </section>

        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <button
            type="submit"
            disabled={saving || uploading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand text-white font-medium hover:brightness-110 disabled:opacity-60 transition"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Save changes
          </button>
        </div>
      </form>

      {/* Tailwind class composition lives here so the inputs stay consistent
          across this page without sprinkling tokens everywhere. */}
      <style>{`
        .input {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border-radius: 0.5rem;
          border: 1px solid #d1d5db;
          outline: none;
          font-size: 0.875rem;
          background-color: white;
        }
        .input:focus {
          border-color: rgb(var(--brand));
          box-shadow: 0 0 0 3px rgb(var(--brand) / 0.15);
        }
      `}</style>
    </div>
  );
}

function Field({ label, required, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-medium text-ink mb-1.5 inline-block">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}
