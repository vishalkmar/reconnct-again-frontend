import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Save, User as UserIcon, Camera, Trash2, ShieldAlert, MapPin } from 'lucide-react';
import api from '../../services/api';
import { useUserAuth } from '../../context/UserAuthContext.jsx';
import DatePicker from '../../components/common/DatePicker.jsx';
import { InstallAppButton } from '../../components/pwa/InstallApp.jsx';

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
  anniversary: user?.anniversary || '',
  addressLine: user?.addressLine || '',
  city: user?.city || '',
  state: user?.state || '',
  country: user?.country || '',
  pincode: user?.pincode || '',
});

export default function UserProfilePage() {
  // Account deletion is a REQUEST, not an instant wipe — an admin actions it.
  const [showDelete, setShowDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteSent, setDeleteSent] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  const submitDeletion = async () => {
    setDeleteBusy(true);
    try {
      const res = await api.post('/user-auth/account/delete-request-me', {
        source: 'web',
        reason: deleteReason.trim() || undefined,
      });
      toast.success(res.data?.message || 'Deletion request sent');
      setDeleteSent(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send your request');
    } finally {
      setDeleteBusy(false);
    }
  };

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
    <div className="max-w-[1400px]">
      {/* Photo banner with the page title (same copy as before) */}
      <div className="relative isolate overflow-hidden rounded-[26px] h-[170px] sm:h-[190px] lg:h-[200px]">
        <picture>
          <source srcSet="/hero/santorini-640.webp 640w, /hero/santorini-1024.webp 1024w, /hero/santorini-1795.webp 1795w" sizes="(min-width: 1024px) 75vw, 100vw" type="image/webp" />
          <img src="/hero/santorini-1600.jpg" alt="" className="absolute inset-0 -z-20 w-full h-full object-cover object-[center_55%]" />
        </picture>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white/90 via-white/55 to-transparent" aria-hidden="true" />
        <div className="px-6 sm:px-10 lg:px-14 pt-7 sm:pt-9">
          <h1 className="font-display font-bold text-[32px] sm:text-[40px] leading-tight text-rc-navy">My Profile</h1>
          <p className="text-[14px] sm:text-[16px] text-rc-navy/85 mt-1">Keep your information up to date for faster bookings.</p>
        </div>
      </div>

      <div className="relative -mt-12 sm:-mt-14 mx-0 sm:mx-6 lg:mx-10">
        {/* Install the app — hidden automatically inside the installed app */}
        <InstallAppButton
          source="profile"
          className="mb-4 flex items-center gap-3 bg-gradient-to-r from-[#FFC629] to-[#F9B402] text-white rounded-2xl p-4 shadow-soft"
        >
          <span className="text-2xl" aria-hidden="true">📱</span>
          <span className="flex-1">
            <span className="block font-bold">Install the Reconnct app</span>
            <span className="block text-sm opacity-90">Book faster and open it from your home screen.</span>
          </span>
          <span className="text-sm font-bold bg-white/25 px-3 py-1.5 rounded-full">Install</span>
        </InstallAppButton>

        <form onSubmit={handleSubmit} className="bg-white rounded-[24px] border border-[#F1ECE3] shadow-[0_24px_50px_-32px_rgba(16,24,40,0.5)] p-5 sm:p-8 space-y-7">
          {/* Avatar */}
          <section className="flex flex-wrap items-center gap-5 sm:gap-6 pb-6 border-b border-[#F1ECE3]">
            <div className="relative shrink-0">
              {form.avatarUrl ? (
                <img src={form.avatarUrl} alt="" className="w-24 h-24 sm:w-[104px] sm:h-[104px] rounded-full object-cover ring-4 ring-[#FFF1CC]" />
              ) : (
                <div className="w-24 h-24 sm:w-[104px] sm:h-[104px] rounded-full bg-[#E5A72A] text-white flex items-center justify-center text-4xl font-bold ring-4 ring-[#FFF1CC]">
                  {initials}
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                  <Loader2 className="animate-spin text-white" size={22} />
                </div>
              )}
              <label
                title={form.avatarUrl ? 'Change photo' : 'Upload photo'}
                className="absolute -bottom-0.5 -right-0.5 grid place-items-center w-10 h-10 rounded-full bg-white text-rc-navy shadow-[0_6px_16px_-6px_rgba(16,24,40,0.45)] border border-[#F1ECE3] cursor-pointer hover:bg-[#FFF1CC] transition"
              >
                <Camera size={18} />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
              </label>
            </div>
            <div className="flex-1 min-w-[180px]">
              <h2 className="font-display font-bold text-2xl sm:text-[28px] text-rc-navy leading-tight">{user?.name || 'Your name'}</h2>
              <p className="text-rc-ink-muted mt-0.5 break-all">{user?.email}</p>
              <p className="text-[12.5px] text-rc-ink-muted mt-2">
                <span className="font-semibold text-rc-navy/80">Profile photo</span> · PNG or JPG, square works best.
                {form.avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, avatarUrl: '' }))}
                    className="ml-2 font-semibold text-[#D93025] hover:underline"
                  >Remove</button>
                )}
              </p>
            </div>
          </section>

          {/* Basic info */}
          <section>
            <h2 className="font-sans font-extrabold text-[17px] text-rc-navy mb-4 flex items-center gap-2.5">
              <UserIcon size={20} className="text-[#E5A72A]" /> Basic information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
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
                  className="input is-disabled"
                />
                <p className="text-xs text-rc-ink-muted mt-1.5">Email cannot be changed — sign in is tied to it.</p>
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
              {/* Both dates feed the birthday/anniversary greetings — a blank
                  one simply means we never wish you on it. */}
              <Field label="Anniversary">
                <DatePicker
                  value={form.anniversary || ''}
                  onChange={(iso) => setForm((f) => ({ ...f, anniversary: iso }))}
                  placeholder="Pick your anniversary"
                />
              </Field>
            </div>
          </section>

          {/* Address */}
          <section className="pt-6 border-t border-[#F1ECE3]">
            <h2 className="font-sans font-extrabold text-[17px] text-rc-navy mb-4 flex items-center gap-2.5">
              <MapPin size={20} className="text-[#E5A72A]" /> Address
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
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

          {/* Sticky on phones so Save is always in reach above the keyboard / tab bar */}
          <div className="rc-sticky-actions flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || uploading}
              className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-[#E5A72A] text-white font-bold hover:bg-[#D49616] shadow-[0_10px_22px_-12px_rgba(229,167,42,0.95)] disabled:opacity-60 transition"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Save changes
            </button>
          </div>
        </form>

        {/* Danger zone — the same account-deletion route the app offers, so a
            member who signed up on the phone can also do it here. */}
        <section className="mt-5 rounded-[22px] border border-[#FAD2D2] bg-[#FFF5F5] p-5 sm:p-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
          <span className="grid place-items-center w-14 h-14 rounded-full bg-[#FFE1E1] text-[#E5484D] shrink-0">
            <Trash2 size={24} />
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-rc-navy flex items-center gap-2">Delete account</h2>
            <p className="text-[13.5px] text-rc-ink-muted mt-1 leading-relaxed">
              Removes your profile, wishlist and support messages, and strips your name and contact
              details from past bookings. Booking records themselves are kept for accounting. This
              cannot be undone.
            </p>
          </div>
          {deleteSent ? (
            <p className="text-sm font-semibold text-emerald-700 md:max-w-[260px]">
              Your deletion request has been sent. Our team will action it shortly.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setShowDelete(true)}
              className="shrink-0 self-start md:self-center inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-[#F3A6A6] bg-white text-[#D93025] text-sm font-bold hover:bg-[#FFE9E9] transition"
            >
              <Trash2 size={16} /> Request account deletion
            </button>
          )}
        </section>
      </div>

      {showDelete && !deleteSent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                <ShieldAlert size={22} />
              </div>
              <h3 className="font-display font-bold text-ink">Request account deletion?</h3>
            </div>
            <p className="text-sm text-ink-muted">
              We will delete your profile, wishlist and support messages, and remove your name and
              contact details from past bookings. Our team actions this shortly after you confirm.
              <strong className="text-ink"> It cannot be undone.</strong>
            </p>
            <textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Reason (optional)"
              className="input w-full mt-4 resize-none"
            />
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={() => setShowDelete(false)}
                className="flex-1 h-11 rounded-xl border border-gray-200 font-semibold text-ink-muted hover:bg-surface-alt"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteBusy}
                onClick={submitDeletion}
                className="flex-1 h-11 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-40"
              >
                {deleteBusy ? 'Sending…' : 'Confirm request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tailwind class composition lives here so the inputs stay consistent
          across this page without sprinkling tokens everywhere. */}
      <style>{`
        .input {
          width: 100%;
          height: 3rem;
          padding: 0 1rem;
          border-radius: 0.75rem;
          border: 1px solid #E6E1D7;
          outline: none;
          font-size: 0.9375rem;
          color: #1A1A2E;
          background-color: white;
          transition: border-color .15s, box-shadow .15s;
        }
        textarea.input { height: auto; padding: 0.75rem 1rem; }
        .input:focus {
          border-color: #FFB900;
          box-shadow: 0 0 0 4px rgb(255 185 0 / 0.18);
        }
        .input.is-disabled { background-color: #F8F6F2; color: #4B5563; cursor: not-allowed; }
      `}</style>
    </div>
  );
}

function Field({ label, required, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-semibold text-rc-navy mb-2 inline-block">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}
