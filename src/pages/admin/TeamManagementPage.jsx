import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Loader2, Users, ShieldCheck, ShieldOff, KeyRound, X, Gauge, Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const ROLE_BADGE = {
  bd: 'bg-amber-50 text-amber-700',
  cops: 'bg-blue-50 text-blue-700',
  account_manager: 'bg-purple-50 text-purple-700',
  csm: 'bg-emerald-50 text-emerald-700',
  qcops: 'bg-rose-50 text-rose-700',
  marketing_manager: 'bg-pink-50 text-pink-700',
};

// A KAM's supplier cap is both defaulted to and floored at 20 — the server
// rejects anything lower (lowering it once slots fill would orphan already-
// assigned suppliers). Keep this in sync with MIN_MAX_SUPPLIERS on the backend.
const MIN_MAX_SUPPLIERS = 20;

const PERMISSION_LABELS = {
  canCreateSupplier: 'Create Supplier',
  canAddExperience: 'Add Experience',
  canReviewListings: 'Review Listings',
  canAssignQCOPS: 'Assign to QCOPS',
  canManageAccounts: 'Manage Accounts (Round-robin pool)',
  canManageCustomers: 'Manage Customers (Round-robin pool)',
};

export default function TeamManagementPage() {
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissionKeys, setPermissionKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalMember, setModalMember] = useState(null); // null = closed, {} = create, {...} = edit
  const [kamManage, setKamManage] = useState(null); // null | the KAM row being managed
  const roleLabel = (v) => roles.find((r) => r.value === v)?.label || v;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [metaRes, listRes] = await Promise.all([
        api.get('/admin/team/meta'),
        api.get('/admin/team'),
      ]);
      setRoles(metaRes.data?.data?.roles || []);
      setPermissionKeys(metaRes.data?.data?.permissionKeys || []);
      setMembers(listRes.data?.data?.members || []);
    } catch {
      toast.error('Could not load team members');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (m) => {
    try {
      await api.put(`/admin/team/${m.id}`, { isActive: !m.isActive });
      toast.success(m.isActive ? 'Deactivated' : 'Activated');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold mb-1">Team Management</h1>
          <p className="text-sm text-ink-muted">Internal staff accounts — BD, Center Ops, Account Manager, CSM, QCOPS, Marketing.</p>
        </div>
        <button onClick={() => setModalMember({})}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand text-ink font-semibold hover:brightness-105">
          <Plus size={18} /> Add team member
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-soft p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
      ) : members.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
          <div className="inline-flex w-14 h-14 rounded-full bg-brand/10 text-brand items-center justify-center mb-4"><Users size={26} /></div>
          <h2 className="font-semibold text-lg">No team members yet</h2>
          <p className="text-sm text-ink-muted mt-1">Add your first internal staff account.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
          <div className="hidden md:grid grid-cols-12 px-5 py-3 bg-surface-alt text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            <div className="col-span-4">Name</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-2">Employee Code</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          <ul className="divide-y divide-slate-100">
            {members.map((m) => (
              <li key={m.id} className="grid grid-cols-12 gap-2 px-4 sm:px-5 py-3.5 items-center">
                <div className="col-span-12 md:col-span-4 min-w-0">
                  <div className="font-semibold text-ink truncate">{m.name}</div>
                  <div className="text-[11px] text-ink-muted truncate">{m.email}</div>
                </div>
                <div className="col-span-6 md:col-span-2">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ROLE_BADGE[m.roleType] || 'bg-slate-100 text-slate-600'}`}>
                    {roleLabel(m.roleType)}
                  </span>
                </div>
                <div className="col-span-6 md:col-span-2 text-sm font-mono text-ink-muted">{m.employeeCode}</div>
                <div className="col-span-6 md:col-span-2">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${m.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {m.isActive ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <div className="col-span-6 md:col-span-2 flex items-center justify-end gap-1">
                  {m.roleType === 'account_manager' && (
                    <IconBtn title="Manage supplier limit" onClick={() => setKamManage(m)}>
                      <Gauge size={15} className="text-purple-600" />
                    </IconBtn>
                  )}
                  <IconBtn title="Edit permissions" onClick={() => setModalMember(m)}><KeyRound size={15} /></IconBtn>
                  <IconBtn title={m.isActive ? 'Deactivate' : 'Activate'} danger={m.isActive} onClick={() => toggleActive(m)}>
                    {m.isActive ? <ShieldOff size={15} /> : <ShieldCheck size={15} />}
                  </IconBtn>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {modalMember && (
        <TeamMemberModal
          member={modalMember}
          roles={roles}
          permissionKeys={permissionKeys}
          onClose={() => setModalMember(null)}
          onSaved={() => { setModalMember(null); load(); }}
        />
      )}

      {kamManage && (
        <KamManageModal
          member={kamManage}
          onClose={() => setKamManage(null)}
          onSaved={() => { setKamManage(null); load(); }}
        />
      )}
    </div>
  );
}

// Manage ONE Account Manager's supplier cap. Opened from that KAM's own row,
// so it only ever shows/edits that single KAM — never the whole pool. Loads
// their live assigned-count from /admin/team/kams so the admin can't set a
// cap below what they already hold.
function KamManageModal({ member, onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [kam, setKam] = useState(null);
  const [draft, setDraft] = useState(String(member.maxSuppliers ?? 20));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const res = await api.get('/admin/team/kams');
        const found = (res.data?.data?.kams || []).find((k) => k.id === member.id);
        if (!off && found) { setKam(found); setDraft(String(found.maxSuppliers)); }
      } catch {
        if (!off) toast.error('Could not load this KAM');
      } finally {
        if (!off) setLoading(false);
      }
    })();
    return () => { off = true; };
  }, [member.id]);

  const save = async () => {
    const val = Number(draft);
    if (!Number.isFinite(val) || val < MIN_MAX_SUPPLIERS) {
      toast.error(`The limit can’t be below ${MIN_MAX_SUPPLIERS}.`);
      return;
    }
    if (kam && val < kam.assignedCount) {
      toast.error(`${member.name} already holds ${kam.assignedCount} suppliers — the limit can’t be lower than that.`);
      return;
    }
    setSaving(true);
    try {
      await api.put(`/admin/team/${member.id}`, { maxSuppliers: val });
      toast.success(`${member.name}: max suppliers set to ${val}`);
      onSaved();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const full = kam && kam.remaining === 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-display font-bold text-lg flex items-center gap-2"><Gauge size={18} className="text-purple-600" /> Manage supplier limit</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-alt text-ink-muted"><X size={18} /></button>
        </div>

        <div className="px-6 py-5">
          <div className="mb-4">
            <div className="font-semibold text-ink">{member.name}
              {!member.isActive && <span className="ml-2 text-[11px] text-slate-400">(disabled)</span>}
            </div>
            <div className="text-[11px] text-ink-muted">{member.email} · {member.employeeCode}</div>
          </div>

          {loading ? (
            <div className="py-8 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="rounded-xl bg-surface-alt px-3 py-2.5 text-center">
                  <div className={`text-lg font-bold ${full ? 'text-rose-600' : 'text-ink'}`}>{kam ? kam.assignedCount : 0}</div>
                  <div className="text-[10px] uppercase tracking-wide text-ink-muted">Currently assigned</div>
                </div>
                <div className="rounded-xl bg-surface-alt px-3 py-2.5 text-center">
                  <div className={`text-lg font-bold ${full ? 'text-rose-600' : 'text-emerald-600'}`}>{kam ? kam.remaining : '—'}</div>
                  <div className="text-[10px] uppercase tracking-wide text-ink-muted">{full ? 'FULL' : 'Free slots'}</div>
                </div>
              </div>

              <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">Max suppliers this KAM can hold</label>
              <input type="number" min={MIN_MAX_SUPPLIERS} value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none" />
              <p className="text-[11px] text-ink-muted mt-1.5">
                Round-robin never assigns beyond this. Minimum {MIN_MAX_SUPPLIERS} — raise it when onboarding starts failing for lack of capacity.
              </p>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-ink-muted hover:bg-surface-alt">Cancel</button>
          <button type="button" onClick={save} disabled={saving || loading}
            className="px-5 py-2 rounded-lg bg-brand text-ink text-sm font-semibold hover:brightness-105 disabled:opacity-60 inline-flex items-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Save limit
          </button>
        </div>
      </div>
    </div>
  );
}

function IconBtn({ title, onClick, children, danger }) {
  return (
    <button type="button" title={title} onClick={onClick}
      className={`p-2 rounded-lg transition ${danger ? 'text-rose-500 hover:bg-rose-50' : 'text-ink-muted hover:bg-surface-alt hover:text-brand'}`}>
      {children}
    </button>
  );
}

function TeamMemberModal({
  member, roles, permissionKeys, onClose, onSaved,
}) {
  const isEdit = !!member.id;
  const [name, setName] = useState(member.name || '');
  const [email, setEmail] = useState(member.email || '');
  const [password, setPassword] = useState('');
  const [roleType, setRoleType] = useState(member.roleType || roles[0]?.value || '');
  const [permissions, setPermissions] = useState(
    member.permissions || roles.find((r) => r.value === roleType)?.defaultPermissions || {}
  );
  const [maxSuppliers, setMaxSuppliers] = useState(
    member.maxSuppliers != null ? String(member.maxSuppliers) : String(MIN_MAX_SUPPLIERS)
  );
  const [saving, setSaving] = useState(false);

  // New member only — picking a role reseeds the toggles to that role's
  // defaults, so what the admin sees is what actually gets created (editing
  // an existing member never overwrites their already-set permissions).
  const onRoleChange = (value) => {
    setRoleType(value);
    if (!isEdit) setPermissions(roles.find((r) => r.value === value)?.defaultPermissions || {});
  };

  const togglePerm = (key) => setPermissions((p) => ({ ...p, [key]: !p[key] }));

  const submit = async (e) => {
    e.preventDefault();
    if (roleType === 'account_manager' && Number(maxSuppliers) < MIN_MAX_SUPPLIERS) {
      toast.error(`Max suppliers can’t be below ${MIN_MAX_SUPPLIERS}.`);
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        const body = { name, permissions };
        if (password) body.password = password;
        if (roleType === 'account_manager' && maxSuppliers) body.maxSuppliers = Number(maxSuppliers);
        await api.put(`/admin/team/${member.id}`, body);
        toast.success('Team member updated');
      } else {
        if (!name || !email || !roleType) { toast.error('Name, email and role are required'); setSaving(false); return; }
        // Password is generated server-side and emailed to them — never set here.
        await api.post('/admin/team', {
          name, email, roleType, permissions,
          ...(roleType === 'account_manager' && maxSuppliers ? { maxSuppliers: Number(maxSuppliers) } : {}),
        });
        toast.success('Team member created — login details emailed to them');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-display font-bold text-lg">{isEdit ? 'Edit Team Member' : 'Add Team Member'}</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-alt text-ink-muted"><X size={18} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none" />
          </Field>

          <Field label="Email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isEdit}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none disabled:bg-surface-alt disabled:text-ink-muted" />
          </Field>

          {isEdit ? (
            <Field label="Reset password (leave blank to keep current)">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none" />
            </Field>
          ) : (
            <div className="rounded-lg bg-surface-alt border border-gray-200 px-3 py-2.5 text-xs text-ink-muted">
              A strong password is generated automatically and emailed to them with a Team Portal sign-in link. It is never shown here.
            </div>
          )}

          <Field label="Role">
            <select value={roleType} disabled={isEdit}
              onChange={(e) => onRoleChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none disabled:bg-surface-alt disabled:text-ink-muted">
              {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </Field>

          {roleType === 'account_manager' && (
            <Field label="Max suppliers this KAM can hold">
              <input type="number" min={MIN_MAX_SUPPLIERS} value={maxSuppliers}
                onChange={(e) => setMaxSuppliers(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none" />
              <p className="text-[11px] text-ink-muted mt-1">
                Round-robin never assigns beyond this. Default &amp; minimum {MIN_MAX_SUPPLIERS} — raise it any time from a KAM’s row.
              </p>
            </Field>
          )}

          <div>
            <div className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">Access</div>
            <div className="space-y-2 bg-surface-alt rounded-xl p-3">
              {permissionKeys.map((key) => (
                <label key={key} className="flex items-center justify-between gap-3 text-sm py-1 cursor-pointer">
                  <span className="text-ink">{PERMISSION_LABELS[key] || key}</span>
                  <ToggleSwitch checked={!!permissions[key]} onChange={() => togglePerm(key)} />
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-ink-muted hover:bg-surface-alt">Cancel</button>
          <button type="submit" disabled={saving}
            className="px-5 py-2 rounded-lg bg-brand text-ink text-sm font-semibold hover:brightness-105 disabled:opacity-60 inline-flex items-center gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Save changes' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function ToggleSwitch({ checked, onChange }) {
  return (
    <button type="button" onClick={onChange}
      className={`relative w-10 h-5.5 rounded-full transition shrink-0 ${checked ? 'bg-brand' : 'bg-gray-300'}`}
      style={{ height: 22, width: 40 }}>
      <span className="absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition"
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(0)', width: 18, height: 18, top: 2, left: 2 }} />
    </button>
  );
}
