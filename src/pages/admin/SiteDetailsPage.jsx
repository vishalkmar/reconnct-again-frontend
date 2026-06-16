import { useEffect, useState } from 'react';
import {
  Save, Plus, Trash2, Mail, Phone, MapPin, Building2,
  Facebook, Instagram, Twitter, Youtube, Linkedin, Globe, ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Dropzone from '../../components/admin/Dropzone.jsx';
import RichTextEditor from '../../components/admin/RichTextEditor.jsx';

const SOCIAL_PRESETS = [
  { value: 'facebook', label: 'Facebook', Icon: Facebook },
  { value: 'instagram', label: 'Instagram', Icon: Instagram },
  { value: 'twitter', label: 'Twitter / X', Icon: Twitter },
  { value: 'youtube', label: 'YouTube', Icon: Youtube },
  { value: 'linkedin', label: 'LinkedIn', Icon: Linkedin },
  { value: 'website', label: 'Website', Icon: Globe },
];

const blank = {
  companyName: '',
  tagline: '',
  description: '',
  emails: [''],
  phones: [''],
  addresses: [''],
  socials: [],
  privacyPolicy: '',
  termsConditions: '',
};

function ListEditor({ items, onChange, placeholder, icon: Icon }) {
  const update = (i, v) => {
    const next = [...items];
    next[i] = v;
    onChange(next);
  };
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, '']);

  return (
    <div className="space-y-2">
      {items.map((v, i) => (
        <div key={i} className="flex gap-2">
          <div className="relative flex-1">
            {Icon && (
              <Icon
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
              />
            )}
            <input
              className="input"
              style={Icon ? { paddingLeft: 38 } : undefined}
              value={v}
              placeholder={placeholder}
              onChange={(e) => update(i, e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => remove(i)}
            className="px-3 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1 text-sm text-brand font-semibold hover:underline"
      >
        <Plus size={14} /> Add another
      </button>
    </div>
  );
}

function SocialEditor({ items, onChange }) {
  const update = (i, key, v) => {
    const next = [...items];
    next[i] = { ...next[i], [key]: v };
    onChange(next);
  };
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, { platform: 'facebook', url: '' }]);

  return (
    <div className="space-y-2">
      {items.map((s, i) => {
        const preset = SOCIAL_PRESETS.find((p) => p.value === s.platform) || SOCIAL_PRESETS[0];
        const Icon = preset.Icon;
        return (
          <div key={i} className="flex gap-2">
            <select
              className="input max-w-[170px]"
              value={s.platform}
              onChange={(e) => update(i, 'platform', e.target.value)}
            >
              {SOCIAL_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <div className="relative flex-1">
              <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                className="input"
                style={{ paddingLeft: 38 }}
                value={s.url}
                placeholder="https://…"
                onChange={(e) => update(i, 'url', e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => remove(i)}
              className="px-3 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
            >
              <Trash2 size={16} />
            </button>
          </div>
        );
      })}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1 text-sm text-brand font-semibold hover:underline"
      >
        <Plus size={14} /> Add social link
      </button>
    </div>
  );
}

function Section({ icon: Icon, title, hint, children }) {
  return (
    <div className="card p-5 mb-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
          <Icon size={18} />
        </div>
        <div>
          <h3 className="font-display font-semibold">{title}</h3>
          {hint && <p className="text-xs text-ink-muted mt-0.5">{hint}</p>}
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export default function SiteDetailsPage() {
  const [form, setForm] = useState(blank);
  const [logoFile, setLogoFile] = useState(null);
  const [existingLogo, setExistingLogo] = useState(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/site-info');
      const info = res.data?.data?.siteInfo || {};
      setForm({
        companyName: info.companyName || '',
        tagline: info.tagline || '',
        description: info.description || '',
        emails: info.emails?.length ? info.emails : [''],
        phones: info.phones?.length ? info.phones : [''],
        addresses: info.addresses?.length ? info.addresses : [''],
        socials: info.socials || [],
        privacyPolicy: info.privacyPolicy || '',
        termsConditions: info.termsConditions || '',
      });
      setExistingLogo(info.logoUrl || null);
      setLogoFile(null);
      setRemoveLogo(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const change = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('companyName', form.companyName);
    fd.append('tagline', form.tagline);
    fd.append('description', form.description);
    fd.append('emails', JSON.stringify(form.emails.filter(Boolean)));
    fd.append('phones', JSON.stringify(form.phones.filter(Boolean)));
    fd.append('addresses', JSON.stringify(form.addresses.filter(Boolean)));
    fd.append('socials', JSON.stringify(form.socials.filter((s) => s.url)));
    fd.append('privacyPolicy', form.privacyPolicy || '');
    fd.append('termsConditions', form.termsConditions || '');
    if (logoFile) fd.append('logo', logoFile);
    if (removeLogo && !logoFile) fd.append('removeLogo', 'true');

    setSaving(true);
    try {
      await api.put('/site-info', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Site details saved');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Site details</h1>
          <p className="text-ink-muted text-sm">
            Company info shown across the site footer and contact pages.
          </p>
        </div>
        <button disabled={saving} className="btn-primary">
          <Save size={16} /> {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      <Section icon={Building2} title="Brand" hint="Name, tagline and logo shown in the footer.">
        <div>
          <label className="label">Company name</label>
          <input
            className="input"
            value={form.companyName}
            onChange={(e) => change('companyName', e.target.value)}
            placeholder="Retreats by Traveon"
          />
        </div>
        <div>
          <label className="label">Tagline</label>
          <input
            className="input"
            value={form.tagline}
            onChange={(e) => change('tagline', e.target.value)}
            placeholder="Curated wellness, yoga and travel retreats"
          />
        </div>
        <div>
          <label className="label">Short description (footer)</label>
          <textarea
            className="input"
            rows={3}
            value={form.description}
            onChange={(e) => change('description', e.target.value)}
            placeholder="A short paragraph about the company shown in the footer."
          />
        </div>
        <div>
          <label className="label">Logo</label>
          <Dropzone
            accept="image/*"
            value={logoFile}
            onChange={(f) => { setLogoFile(f); if (f) setRemoveLogo(false); }}
            existingUrl={!removeLogo ? existingLogo : null}
            placeholder={existingLogo ? 'Drag a new logo to replace, or click' : 'Drag & drop your logo, or click'}
          />
          {existingLogo && !logoFile && (
            <label className="flex items-center gap-2 text-xs text-ink-muted mt-2">
              <input
                type="checkbox"
                checked={removeLogo}
                onChange={(e) => setRemoveLogo(e.target.checked)}
              />
              Remove existing logo
            </label>
          )}
        </div>
      </Section>

      <Section icon={Mail} title="Email addresses" hint="Add one or more — all are shown in the footer.">
        <ListEditor
          items={form.emails}
          onChange={(v) => change('emails', v)}
          placeholder="info@example.com"
          icon={Mail}
        />
      </Section>

      <Section icon={Phone} title="Contact numbers" hint="Add one or more phone numbers.">
        <ListEditor
          items={form.phones}
          onChange={(v) => change('phones', v)}
          placeholder="+91 90000 00000"
          icon={Phone}
        />
      </Section>

      <Section icon={MapPin} title="Addresses" hint="Office or studio locations.">
        <ListEditor
          items={form.addresses}
          onChange={(v) => change('addresses', v)}
          placeholder="221B Baker Street, London"
          icon={MapPin}
        />
      </Section>

      <Section icon={Facebook} title="Social media" hint="Pick a platform and paste the public URL — the footer renders the matching icon.">
        <SocialEditor items={form.socials} onChange={(v) => change('socials', v)} />
      </Section>

      <Section icon={ShieldCheck} title="Legal pages" hint="Content shown on the public /privacy and /terms pages. Rich text supported.">
        <div className="space-y-5">
          <div>
            <label className="label">Privacy Policy</label>
            <RichTextEditor value={form.privacyPolicy} onChange={(v) => change('privacyPolicy', v)} placeholder="Write your privacy policy…" minHeight={220} />
          </div>
          <div>
            <label className="label">Terms &amp; Conditions</label>
            <RichTextEditor value={form.termsConditions} onChange={(v) => change('termsConditions', v)} placeholder="Write your terms & conditions…" minHeight={220} />
          </div>
        </div>
      </Section>

      <div className="sticky bottom-4 flex justify-end mt-6">
        <button disabled={saving} className="btn-primary shadow-card">
          <Save size={16} /> {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
