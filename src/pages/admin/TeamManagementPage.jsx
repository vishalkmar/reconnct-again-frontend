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
  const [phone, setPhone] = useState(member.phone || '');
  const [password, setPassword] = useState('');
  const [roleType, setRoleType] = useState(member.roleType || roles[0]?.value || '');
  const [permissions, setPermissions] = useState(
    member.permissions || roles.find((r) => r.value === roleType)?.defaultPermissions || {}
  );
  const [alsoQcops, setAlsoQcops] = useState(!!member.alsoQcops);
  const [maxSuppliers, setMaxSuppliers] = useState(
    member.maxSuppliers != null ? String(member.maxSuppliers) : String(MIN_MAX_SUPPLIERS)
  );
  const [saving, setSaving] = useState(false);

  // Category Manager assignment: the 10 broad categories with their current
  // owner, the CMs available as hand-off targets, this member's selected set,
  // and the hand-off target chosen for each category being de-assigned.
  const [catData, setCatData] = useState(null); // { categories, managers }
  const [catError, setCatError] = useState('');
  const [selectedCats, setSelectedCats] = useState(() => (member.categoryIds || []));
  const [handoffs, setHandoffs] = useState({}); // categoryId -> targetCmId
  const [handoffFor, setHandoffFor] = useState(null); // category being de-assigned

  useEffect(() => {
    if (roleType !== 'category_manager') return;
    setCatError('');
    api.get('/admin/team/categories')
      .then(({ data }) => setCatData(data?.data || { categories: [], managers: [] }))
      // Surface the real reason instead of a silently-empty list — almost
      // always "the backend isn't running the latest code yet" (this endpoint
      // is new).
      .catch((err) => { setCatData({ categories: [], managers: [] }); setCatError(err.response?.data?.message || 'Could not load categories — is the backend up to date?'); });
  }, [roleType]);

  // New member only — picking a role reseeds the toggles to that role's
  // defaults, so what the admin sees is what actually gets created (editing
  // an existing member never overwrites their already-set permissions).
  const onRoleChange = (value) => {
    setRoleType(value);
    if (!isEdit) setPermissions(roles.find((r) => r.value === value)?.defaultPermissions || {});
  };

  // Toggle a category. Freeing one that's currently ours needs a hand-off
  // target — opening that picker is what actually removes it.
  const ownedByMe = (c) => isEdit && c.categoryManagerId === member.id;
  const toggleCat = (c) => {
    if (c.categoryManagerId && !ownedByMe(c)) return; // locked — someone else's
    if (selectedCats.includes(c.id)) {
      if (ownedByMe(c)) { setHandoffFor(c); return; } // de-assign → must hand off
      setSelectedCats((s) => s.filter((x) => x !== c.id)); // was just-added, drop freely
    } else {
      setSelectedCats((s) => [...s, c.id]);
      setHandoffs((h) => { const n = { ...h }; delete n[c.id]; return n; });
    }
  };
  const confirmHandoff = (catId, targetCmId) => {
    setSelectedCats((s) => s.filter((x) => x !== catId));
    setHandoffs((h) => ({ ...h, [catId]: targetCmId }));
    setHandoffFor(null);
  };

  const togglePerm = (key) => setPermissions((p) => ({ ...p, [key]: !p[key] }));

  const submit = async (e) => {
    e.preventDefault();
    if (roleType === 'account_manager' && Number(maxSuppliers) < MIN_MAX_SUPPLIERS) {
      toast.error(`Max suppliers can’t be below ${MIN_MAX_SUPPLIERS}.`);
      return;
    }
    if (roleType === 'account_manager' && !phone.trim()) {
      toast.error('Phone number is required for an Account Manager — suppliers call them from the app.');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        const body = { name, phone, permissions };
        if (roleType === 'cops') body.alsoQcops = alsoQcops;
        if (password) body.password = password;
        if (roleType === 'account_manager' && maxSuppliers) body.maxSuppliers = Number(maxSuppliers);
        if (roleType === 'category_manager') { body.categoryIds = selectedCats; body.handoffs = handoffs; }
        await api.put(`/admin/team/${member.id}`, body);
        toast.success('Team member updated');
      } else {
        if (!name || !email || !roleType) { toast.error('Name, email and role are required'); setSaving(false); return; }
        // Password is generated server-side and emailed to them — never set here.
        await api.post('/admin/team', {
          name, email, phone, roleType, permissions,
          ...(roleType === 'cops' ? { alsoQcops } : {}),
          ...(roleType === 'account_manager' && maxSuppliers ? { maxSuppliers: Number(maxSuppliers) } : {}),
          ...(roleType === 'category_manager' ? { categoryIds: selectedCats } : {}),
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

          <Field label={roleType === 'account_manager' ? 'Phone (required)' : 'Phone (optional)'}>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 9540792427"
              required={roleType === 'account_manager'}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none" />
            <p className="text-[11px] text-ink-muted mt-1">
              {roleType === 'account_manager'
                ? 'Required — their suppliers get a one-tap Call button on the app.'
                : 'Shown to the suppliers this member looks after.'}
            </p>
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

          {roleType === 'cops' && (
            <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-3">
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span>
                  <span className="text-sm font-semibold text-ink block">Assign QCOPS department too</span>
                  <span className="text-[11px] text-ink-muted">
                    Lets this Center Ops member also work the QCOPS queue. They’ll choose which dashboard to open at login.
                  </span>
                </span>
                <ToggleSwitch checked={alsoQcops} onChange={() => setAlsoQcops((v) => !v)} />
              </label>
            </div>
          )}

          {roleType === 'category_manager' && (
            <Field label="Assigned broad categories">
              {!catData ? (
                <div className="text-xs text-ink-muted py-2">Loading categories…</div>
              ) : catError ? (
                <div className="text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{catError}</div>
              ) : catData.categories.length === 0 ? (
                <div className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">No broad categories found. Seed the taxonomy first.</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-1.5">
                    {catData.categories.map((c) => {
                      const mine = isEdit && c.categoryManagerId === member.id;
                      const lockedElsewhere = c.categoryManagerId && !mine;
                      const checked = selectedCats.includes(c.id);
                      const handedOff = handoffs[c.id];
                      return (
                        <button type="button" key={c.id} disabled={lockedElsewhere}
                          onClick={() => toggleCat(c)}
                          title={lockedElsewhere ? `Already assigned to ${c.managerName || 'another manager'}` : ''}
                          className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm text-left transition
                            ${lockedElsewhere ? 'border-gray-200 bg-surface-alt text-ink-muted cursor-not-allowed'
                              : checked ? 'border-brand bg-brand/10 text-ink' : 'border-gray-200 hover:border-brand/40 text-ink'}`}>
                          <span className="font-medium">{c.name}</span>
                          {lockedElsewhere ? (
                            <span className="text-[10px] font-semibold text-ink-muted inline-flex items-center gap-1">🔒 {c.managerName || 'assigned'}</span>
                          ) : handedOff ? (
                            <span className="text-[10px] font-semibold text-amber-600">→ handed off</span>
                          ) : checked ? (
                            <Check size={15} className="text-brand" />
                          ) : <span className="text-[10px] text-ink-muted">tap to assign</span>}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-ink-muted mt-1.5">
                    Locked 🔒 = owned by another manager. Un-checking one you own asks who to hand it to — a category always keeps an owner.
                  </p>
                </>
              )}
            </Field>
          )}

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

          {/* A Category Manager's access is defined entirely by the categories
              they own (above) — the permission toggles don't apply to them, so
              hide them and let the category picker be the whole story. */}
          {roleType !== 'category_manager' && (
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
          )}
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

      {handoffFor && (
        <HandoffModal
          category={handoffFor}
          managers={(catData?.managers || []).filter((m) => m.id !== member.id)}
          onCancel={() => setHandoffFor(null)}
          onConfirm={(targetId) => confirmHandoff(handoffFor.id, targetId)}
        />
      )}
    </div>
  );
}

// Un-assigning a category from this CM is a HAND-OFF, never a plain removal —
// the admin picks exactly one other Category Manager to take it (and, with it,
// that category's whole dashboard). Enforced here and again on the server.
function HandoffModal({ category, managers, onCancel, onConfirm }) {
  const [target, setTarget] = useState('');
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display font-bold text-lg mb-1">Hand off “{category.name}”</h3>
        <p className="text-sm text-ink-muted mb-4">
          A category always keeps an owner. Choose the Category Manager who should take “{category.name}” — everything under it moves to them.
        </p>
        {managers.length === 0 ? (
          <p className="text-sm text-rose-600">No other Category Manager exists yet. Create one first, then hand off.</p>
        ) : (
          <select value={target} onChange={(e) => setTarget(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none">
            <option value="">Select a manager…</option>
            {managers.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.employeeCode})</option>)}
          </select>
        )}
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-semibold text-ink-muted hover:bg-surface-alt">Cancel</button>
          <button type="button" disabled={!target} onClick={() => onConfirm(Number(target))}
            className="px-5 py-2 rounded-lg bg-brand text-ink text-sm font-semibold hover:brightness-105 disabled:opacity-40">
            Hand off
          </button>
        </div>
      </div>
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
