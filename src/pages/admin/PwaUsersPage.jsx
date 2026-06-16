import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit3, Power, KeyRound, Search, Loader2, Copy, X, FileCheck2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import DatePicker from '../../components/common/DatePicker.jsx';

// Shared admin UI for managing PWA Auditors and Officers. Pass `resource`
// as 'auditors' or 'officers' from the page wrapper — the backend routes
// follow the same shape, so a single component handles both.

const RESOURCE_LABEL = {
  auditors:     { title: 'Auditors',              singular: 'Auditor',     accent: 'brand',   endpoint: 'auditors' },
  officers:     { title: 'Centralized Officers',  singular: 'Officer',     accent: 'amber',   endpoint: 'officers' },
  salespersons: { title: 'Salespersons',          singular: 'Salesperson', accent: 'emerald', endpoint: 'salespersons' },
};

const empty = { name: '', email: '', phone: '', dob: '', address: '', profilePhoto: null };

const PwaUsersPage = ({ resource }) => {
  const cfg = RESOURCE_LABEL[resource];
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [editor, setEditor] = useState(null); // null | 'new' | item id
  const [form, setForm] = useState(empty);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [tempPwReveal, setTempPwReveal] = useState(null);
  const showStats = resource === 'officers';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/pwa/admin/${cfg.endpoint}`, { params: { q, status } });
      setItems(r.data?.data?.items || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [cfg.endpoint, q, status]);

  useEffect(() => { load(); }, [load]);

  const startCreate = () => {
    setForm(empty); setPhotoPreview(null); setEditor('new');
  };
  const startEdit = (item) => {
    setForm({
      name: item.name, email: item.email, phone: item.phone || '',
      dob: item.dob || '', address: item.address || '', profilePhoto: null,
    });
    setPhotoPreview(item.profilePhotoUrl || null);
    setEditor(item.id);
  };
  const cancelEdit = () => { setEditor(null); setPhotoPreview(null); setForm(empty); };

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setForm((s) => ({ ...s, profilePhoto: f }));
    setPhotoPreview(URL.createObjectURL(f));
  };

  const save = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      ['name', 'email', 'phone', 'dob', 'address'].forEach((k) => {
        if (form[k] !== undefined && form[k] !== null) fd.append(k, form[k]);
      });
      if (form.profilePhoto) fd.append('profilePhoto', form.profilePhoto);

      if (editor === 'new') {
        const r = await api.post(`/pwa/admin/${cfg.endpoint}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const temp = r.data?.data?.tempPassword;
        if (temp) setTempPwReveal({ email: form.email, password: temp });
        toast.success(`${cfg.singular} created`);
      } else {
        await api.put(`/pwa/admin/${cfg.endpoint}/${editor}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Updated');
      }
      cancelEdit();
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (id) => {
    try {
      await api.patch(`/pwa/admin/${cfg.endpoint}/${id}/toggle`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Toggle failed');
    }
  };

  const resetPassword = async (item) => {
    if (!confirm(`Reset password for ${item.email}? They'll receive a new temp password via email.`)) return;
    try {
      const r = await api.post(`/pwa/admin/${cfg.endpoint}/${item.id}/reset-password`);
      const temp = r.data?.data?.tempPassword;
      if (temp) setTempPwReveal({ email: item.email, password: temp });
      toast.success('Password reset');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Reset failed');
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold">{cfg.title}</h1>
          <p className="text-ink-muted text-sm">
            Manage {cfg.title.toLowerCase()} who sign into the audit PWA. Each new account receives
            a temporary password by email.
          </p>
        </div>
        <button
          onClick={startCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-brand-dark"
        >
          <Plus size={16} /> New {cfg.singular.toLowerCase()}
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${cfg.title.toLowerCase()}`}
            className="rounded-lg border border-slate-200 px-9 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">{cfg.singular}</th>
              <th className="px-4 py-3">Contact</th>
              {showStats && <th className="px-4 py-3">Property stats</th>}
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={showStats ? 6 : 5} className="px-4 py-8 text-center text-slate-400">
                <Loader2 size={18} className="mx-auto animate-spin" />
              </td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={showStats ? 6 : 5} className="px-4 py-8 text-center text-slate-400">No {cfg.title.toLowerCase()} yet.</td></tr>
            ) : items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {item.profilePhotoUrl ? (
                      <img src={fileUrl(item.profilePhotoUrl)} alt="" className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
                        {(item.name || '?').slice(0, 1)}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">{item.phone || '—'}</td>
                {showStats && (
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                        Approved {item.stats?.approvedCount || 0}
                      </span>
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">
                        Rejected {item.stats?.rejectedCount || 0}
                      </span>
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                        Follow-up {item.stats?.followUpCount || 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/pwa/signed-properties?officerId=${item.id}`)}
                        className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-teal-700 hover:bg-teal-100"
                        title="See signed documents"
                      >
                        <FileCheck2 size={12} /> Signed {item.stats?.signedCount || 0}
                      </button>
                    </div>
                  </td>
                )}
                <td className="px-4 py-3 text-xs text-slate-500">
                  {new Date(item.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    {item.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-1">
                    <button
                      onClick={() => startEdit(item)}
                      className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      title="Edit"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => resetPassword(item)}
                      className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      title="Reset password"
                    >
                      <KeyRound size={16} />
                    </button>
                    <button
                      onClick={() => toggle(item.id)}
                      className={`rounded-md p-1.5 ${item.isActive ? 'text-rose-500 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                      title={item.isActive ? 'Deactivate' : 'Activate'}
                    >
                      <Power size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editor === 'new' ? `New ${cfg.singular}` : `Edit ${cfg.singular}`}
              </h2>
              <button onClick={cancelEdit} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="col-span-2 flex flex-col gap-1 text-xs">
                <span className="font-semibold text-slate-600">Name</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                  required
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
                />
              </label>
              <label className="col-span-2 flex flex-col gap-1 text-xs">
                <span className="font-semibold text-slate-600">Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                  required
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-semibold text-slate-600">Phone</span>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-semibold text-slate-600">Date of birth</span>
                <DatePicker
                  value={form.dob || ''}
                  onChange={(v) => setForm((s) => ({ ...s, dob: v }))}
                  placeholder="Select date of birth"
                  max={new Date().toISOString().slice(0, 10)}
                  hideToday
                />
              </label>
              <label className="col-span-2 flex flex-col gap-1 text-xs">
                <span className="font-semibold text-slate-600">Address</span>
                <textarea
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
                />
              </label>
              <label className="col-span-2 flex flex-col gap-1 text-xs">
                <span className="font-semibold text-slate-600">Profile photo</span>
                <div className="flex items-center gap-3">
                  {photoPreview && (
                    <img src={photoPreview} alt="" className="h-12 w-12 rounded-full object-cover" />
                  )}
                  <input type="file" accept="image/*" onChange={onFile} className="text-xs" />
                </div>
              </label>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={cancelEdit}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >Cancel</button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-brand-dark disabled:opacity-60"
              >
                {saving ? 'Saving…' : editor === 'new' ? 'Create & email invite' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {tempPwReveal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold">Temporary password</h2>
            <p className="mt-1 text-sm text-slate-500">
              We've emailed this to <strong>{tempPwReveal.email}</strong>, but you can copy it here too.
              {' '}It will not be shown again.
            </p>
            <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 font-mono text-sm">
              <span className="select-all">{tempPwReveal.password}</span>
              <button
                onClick={() => navigator.clipboard?.writeText(tempPwReveal.password).then(() => toast.success('Copied'))}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                <Copy size={14} />
              </button>
            </div>
            <button
              onClick={() => setTempPwReveal(null)}
              className="mt-5 w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"
            >Done</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PwaUsersPage;
