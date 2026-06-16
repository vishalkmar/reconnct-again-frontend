import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Save, User, Image as ImageIcon, Award, Briefcase,
  Settings, Plus, Trash2, Languages, Globe,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import Dropzone from '../../components/admin/Dropzone.jsx';
import RichTextEditor from '../../components/admin/RichTextEditor.jsx';
import usePersistedForm from '../../hooks/usePersistedForm.js';

const blankForm = {
  name: '', slug: '',
  role: '',
  experienceYears: '',
  shortBio: '',
  bioRich: '',
  specialties: [],
  languages: [],
  certifications: [],
  socials: { instagram: '', website: '', linkedin: '', youtube: '' },
  isFeatured: false,
  isActive: true,
  sortOrder: 0,
};

function Section({ icon: Icon, title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card mb-5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
            <Icon size={18} />
          </div>
          <h3 className="font-display font-semibold">{title}</h3>
        </div>
        <span className="text-ink-muted text-xs">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && <div className="px-5 pb-5 border-t pt-5 space-y-4">{children}</div>}
    </div>
  );
}

// Inline editor for the simple string-list fields (specialties, languages).
function TagListEditor({ value = [], onChange, placeholder }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (!value.includes(v)) onChange([...value, v]);
    setDraft('');
  };
  return (
    <div>
      <div className="flex gap-2">
        <input
          className="input"
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        />
        <button type="button" onClick={add} className="btn-outline whitespace-nowrap">
          <Plus size={14} /> Add
        </button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {value.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 text-brand text-sm"
            >
              {v}
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x !== v))}
                className="hover:text-red-600"
              >
                <Trash2 size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function CertificationsEditor({ value = [], onChange }) {
  const update = (i, field, val) => {
    const next = [...value];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {value.map((c, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-center">
          <input
            className="input col-span-5"
            placeholder="Certification title (e.g. RYT-500)"
            value={c.title || ''}
            onChange={(e) => update(i, 'title', e.target.value)}
          />
          <input
            className="input col-span-6"
            placeholder="Issuer (e.g. Yoga Alliance)"
            value={c.issuer || ''}
            onChange={(e) => update(i, 'issuer', e.target.value)}
          />
          <button
            type="button"
            onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            className="col-span-1 text-red-500 hover:bg-red-50 p-2 rounded"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...value, { title: '', issuer: '' }])}
        className="btn-outline text-sm"
      >
        <Plus size={14} /> Add certification
      </button>
    </div>
  );
}

export default function TrainerFormPage() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();

  const {
    value: form,
    setValue: setForm,
    hydrateFromServer,
    clearDraft,
    discardDraft,
    hasDraft,
  } = usePersistedForm(`trainer-form:${id || 'new'}`, blankForm, { editing });
  const [loading, setLoading] = useState(editing);
  const [submitting, setSubmitting] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [trainer, setTrainer] = useState(null);

  const load = useCallback(async () => {
    if (!editing) return;
    setLoading(true);
    try {
      const res = await api.get(`/trainers/admin/${id}`);
      const t = res.data.data.trainer;
      setTrainer(t);
      hydrateFromServer({
        ...blankForm,
        name: t.name || '',
        slug: t.slug || '',
        role: t.role || '',
        experienceYears: t.experienceYears ?? '',
        shortBio: t.shortBio || '',
        bioRich: t.bioRich || '',
        specialties: t.specialties || [],
        languages: t.languages || [],
        certifications: t.certifications || [],
        socials: { instagram: '', website: '', linkedin: '', youtube: '', ...(t.socials || {}) },
        isFeatured: !!t.isFeatured,
        isActive: t.isActive !== false,
        sortOrder: t.sortOrder ?? 0,
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load trainer');
    } finally {
      setLoading(false);
    }
  }, [editing, id, hydrateFromServer]);

  useEffect(() => { load(); }, [load]);

  const change = (field, value) => setForm({ ...form, [field]: value });
  const changeSocial = (key, value) =>
    setForm({ ...form, socials: { ...form.socials, [key]: value } });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name?.trim()) {
      toast.error('Name is required');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      if (form.slug) fd.append('slug', form.slug);
      fd.append('role', form.role || '');
      fd.append('experienceYears', form.experienceYears === '' ? '' : String(form.experienceYears));
      fd.append('shortBio', form.shortBio || '');
      fd.append('bioRich', form.bioRich || '');
      fd.append('specialties', JSON.stringify(form.specialties || []));
      fd.append('languages', JSON.stringify(form.languages || []));
      fd.append('certifications', JSON.stringify(form.certifications || []));
      fd.append('socials', JSON.stringify(form.socials || {}));
      fd.append('isFeatured', String(!!form.isFeatured));
      fd.append('isActive', String(form.isActive !== false));
      fd.append('sortOrder', String(form.sortOrder || 0));
      if (photo) fd.append('photo', photo);

      const res = editing
        ? await api.put(`/trainers/${id}`, fd)
        : await api.post('/trainers', fd);

      toast.success(editing ? 'Trainer updated' : 'Trainer created');
      clearDraft();
      const newId = res.data?.data?.trainer?.id;
      navigate(editing ? '/admin/trainers' : `/admin/trainers/${newId}/edit`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSubmitting(false);
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
    <form onSubmit={onSubmit}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Link to="/admin/trainers" className="btn-ghost"><ArrowLeft size={18} /></Link>
          <div>
            <h1 className="text-2xl font-display font-bold">
              {editing ? 'Edit trainer' : 'New trainer'}
            </h1>
            <p className="text-ink-muted text-sm">
              Reusable profile attached to one or more packages.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasDraft && (
            <button
              type="button"
              onClick={() => { discardDraft(); if (editing) load(); }}
              className="btn-ghost text-xs"
              title="Discard local draft and reload from server"
            >
              Discard draft
            </button>
          )}
          <button type="submit" disabled={submitting} className="btn-primary">
            <Save size={16} /> {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Section icon={User} title="Identity">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Full name *</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => change('name', e.target.value)}
                  placeholder="e.g. Anjali Sharma"
                  required
                />
              </div>
              <div>
                <label className="label">URL slug</label>
                <input
                  className="input"
                  value={form.slug}
                  onChange={(e) => change('slug', e.target.value)}
                  placeholder="auto-generated if blank"
                />
              </div>
              <div>
                <label className="label flex items-center gap-1"><Briefcase size={12} /> Role / specialty</label>
                <input
                  className="input"
                  value={form.role}
                  onChange={(e) => change('role', e.target.value)}
                  placeholder="e.g. Yoga & Meditation Teacher"
                />
              </div>
              <div>
                <label className="label flex items-center gap-1"><Award size={12} /> Experience (years)</label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={form.experienceYears}
                  onChange={(e) => change('experienceYears', e.target.value)}
                  placeholder="e.g. 12"
                />
              </div>
            </div>
            <div>
              <label className="label">Short bio (1–2 lines)</label>
              <input
                className="input"
                value={form.shortBio}
                onChange={(e) => change('shortBio', e.target.value)}
                placeholder="A line that introduces the trainer on package cards"
                maxLength={280}
              />
            </div>
            <div>
              <label className="label">Full bio</label>
              <RichTextEditor
                value={form.bioRich}
                onChange={(html) => change('bioRich', html)}
                placeholder="Tell guests about the trainer's journey, style, and what to expect…"
              />
            </div>
          </Section>

          <Section icon={Award} title="Specialties, languages &amp; certifications">
            <div>
              <label className="label">Specialties</label>
              <TagListEditor
                value={form.specialties}
                onChange={(v) => change('specialties', v)}
                placeholder="Type and press Enter (e.g. Hatha, Vinyasa)"
              />
            </div>
            <div>
              <label className="label flex items-center gap-1"><Languages size={12} /> Languages spoken</label>
              <TagListEditor
                value={form.languages}
                onChange={(v) => change('languages', v)}
                placeholder="e.g. English"
              />
            </div>
            <div>
              <label className="label">Certifications</label>
              <CertificationsEditor
                value={form.certifications}
                onChange={(v) => change('certifications', v)}
              />
            </div>
          </Section>

          <Section icon={Globe} title="Social profiles" defaultOpen={false}>
            <div className="grid sm:grid-cols-2 gap-4">
              {['website', 'instagram', 'linkedin', 'youtube'].map((k) => (
                <div key={k}>
                  <label className="label capitalize">{k}</label>
                  <input
                    className="input"
                    value={form.socials?.[k] || ''}
                    onChange={(e) => changeSocial(k, e.target.value)}
                    placeholder={`https://…`}
                  />
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div>
          <Section icon={ImageIcon} title="Photo">
            <Dropzone
              accept="image/*"
              value={photo}
              onChange={setPhoto}
              existingUrl={trainer?.photo ? fileUrl(trainer.photo) : ''}
              placeholder="Upload trainer photo"
              subLabel="Square ratio looks best (e.g. 600×600)"
            />
          </Section>

          <Section icon={Settings} title="Publishing">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive !== false}
                onChange={(e) => change('isActive', e.target.checked)}
              />
              Active (visible to website)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!form.isFeatured}
                onChange={(e) => change('isFeatured', e.target.checked)}
              />
              Featured trainer
            </label>
            <div>
              <label className="label">Sort order</label>
              <input
                type="number"
                className="input"
                value={form.sortOrder}
                onChange={(e) => change('sortOrder', parseInt(e.target.value, 10) || 0)}
              />
            </div>
          </Section>
        </div>
      </div>
    </form>
  );
}
