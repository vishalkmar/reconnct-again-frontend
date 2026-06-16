import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Edit, Trash2, Eye, EyeOff, X, Save, ShieldCheck, Image as ImageIcon,
  BadgeCheck, ClipboardCheck, Utensils, Sparkles, ClipboardList, Siren,
  MessageSquare, CreditCard, RefreshCcw, Accessibility, Leaf, Lock,
  CalendarX, Star, Umbrella, Award, Building2, Globe, GraduationCap,
  MessageCircle, Search as SearchIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx';
import ToggleSwitch from '../../components/admin/ToggleSwitch.jsx';
import RowDetailsModal from '../../components/admin/RowDetailsModal.jsx';
import Dropzone from '../../components/admin/Dropzone.jsx';
import SortableList, { DragHandle } from '../../components/admin/SortableList.jsx';

const ICON_OPTIONS = [
  { name: 'ShieldCheck', Component: ShieldCheck },
  { name: 'BadgeCheck', Component: BadgeCheck },
  { name: 'ClipboardCheck', Component: ClipboardCheck },
  { name: 'ClipboardList', Component: ClipboardList },
  { name: 'Utensils', Component: Utensils },
  { name: 'Sparkles', Component: Sparkles },
  { name: 'Siren', Component: Siren },
  { name: 'MessageSquare', Component: MessageSquare },
  { name: 'MessageCircle', Component: MessageCircle },
  { name: 'CreditCard', Component: CreditCard },
  { name: 'RefreshCcw', Component: RefreshCcw },
  { name: 'Accessibility', Component: Accessibility },
  { name: 'Leaf', Component: Leaf },
  { name: 'Lock', Component: Lock },
  { name: 'CalendarX', Component: CalendarX },
  { name: 'Star', Component: Star },
  { name: 'Umbrella', Component: Umbrella },
  { name: 'Award', Component: Award },
  { name: 'Building2', Component: Building2 },
  { name: 'Globe', Component: Globe },
  { name: 'GraduationCap', Component: GraduationCap },
];

const ICON_BY_NAME = Object.fromEntries(ICON_OPTIONS.map((o) => [o.name, o.Component]));

function resolveIcon(name) {
  return ICON_BY_NAME[name] || ShieldCheck;
}

export default function ChecklistPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // item being edited / new
  const [deleteId, setDeleteId] = useState(null);
  const [viewItem, setViewItem] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/checklist/admin/all');
      setItems(res.data.data.items);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const persistOrder = async (ordered) => {
    setItems(ordered);
    try {
      await api.put('/checklist/admin/reorder', { order: ordered.map((it) => it.id) });
    } catch (err) {
      toast.error('Reorder failed');
      load();
    }
  };

  const toggle = async (it) => {
    try {
      await api.patch(`/checklist/${it.id}/toggle`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Toggle failed');
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/checklist/${deleteId}`);
      toast.success('Item deleted');
      setDeleteId(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Trust &amp; Safety Checklist</h1>
          <p className="text-ink-muted text-sm">
            The 20 audit points shown on the homepage between the hero and the featured retreats.
            Each chip's tooltip is the description below.
          </p>
        </div>
        <button onClick={() => setEditing({})} className="btn-primary whitespace-nowrap">
          <Plus size={18} /> New item
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center">
          <ShieldCheck size={40} className="mx-auto text-ink-muted mb-3" />
          <p className="text-ink-muted">No checklist items yet.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-3 bg-surface-alt text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <div className="col-span-1">Order</div>
            <div className="col-span-1">Icon</div>
            <div className="col-span-4">Label</div>
            <div className="col-span-4">Tooltip</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>
          <SortableList
            items={items}
            onReorder={persistOrder}
            showHandle
            renderItem={(it, { dragHandleProps }) => {
              const IconComp = resolveIcon(it.iconName);
              return (
                <div className={`grid grid-cols-12 items-center px-4 py-3 border-t hover:bg-surface-alt/50 ${!it.isActive && 'opacity-60'}`}>
                  <div className="col-span-1">
                    <DragHandle dragHandleProps={dragHandleProps} />
                  </div>
                  <div className="col-span-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand to-emerald-500 text-white flex items-center justify-center shadow-sm">
                      {it.iconUrl ? (
                        <img src={fileUrl(it.iconUrl)} alt="" className="w-6 h-6 object-contain" />
                      ) : (
                        <IconComp size={18} />
                      )}
                    </div>
                  </div>
                  <div className="col-span-4">
                    <div className="font-medium text-sm">{it.label}</div>
                    <div className="text-[11px] text-ink-muted mt-0.5">
                      Icon: <code className="text-brand">{it.iconUrl ? 'uploaded' : (it.iconName || 'default')}</code>
                    </div>
                  </div>
                  <div className="col-span-4 text-xs text-ink-muted line-clamp-2">
                    {it.description || <span className="italic">No tooltip text</span>}
                  </div>
                  <div className="col-span-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${it.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                      {it.isActive ? 'LIVE' : 'OFF'}
                    </span>
                  </div>
                  <div className="col-span-1 flex items-center justify-end gap-1.5">
                    <ToggleSwitch checked={it.isActive} onChange={() => toggle(it)} size="sm" />
                    <button onClick={() => setViewItem(it)} className="p-1.5 hover:bg-surface-alt rounded" title="View details">
                      <Eye size={16} />
                    </button>
                    <button onClick={() => setEditing(it)} className="p-1.5 hover:bg-surface-alt rounded" title="Edit">
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => setDeleteId(it.id)}
                      className="p-1.5 hover:bg-red-50 text-red-600 rounded"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            }}
          />
        </div>
      )}

      {editing !== null && (
        <ChecklistFormModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete checklist item?"
        message="This removes the badge from the homepage immediately."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onClose={() => setDeleteId(null)}
      />

      <RowDetailsModal
        open={!!viewItem}
        onClose={() => setViewItem(null)}
        title={viewItem?.title || viewItem?.label || viewItem?.name}
        data={viewItem}
      />
    </div>
  );
}

function ChecklistFormModal({ initial, onClose, onSaved }) {
  const editing = !!initial?.id;
  const [form, setForm] = useState({
    label: initial.label || '',
    description: initial.description || '',
    iconName: initial.iconName || 'ShieldCheck',
    isActive: initial.isActive !== false,
    sortOrder: initial.sortOrder ?? 0,
  });
  const [iconFile, setIconFile] = useState(null);
  const [clearIconUrl, setClearIconUrl] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [iconSearch, setIconSearch] = useState('');

  const filteredIcons = ICON_OPTIONS.filter((opt) =>
    !iconSearch || opt.name.toLowerCase().includes(iconSearch.toLowerCase())
  );

  const submit = async (e) => {
    e.preventDefault();
    if (!form.label.trim()) return toast.error('Label is required');
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('label', form.label);
      fd.append('description', form.description || '');
      fd.append('iconName', form.iconName || '');
      fd.append('isActive', String(form.isActive));
      fd.append('sortOrder', String(form.sortOrder || 0));
      if (iconFile) fd.append('icon', iconFile);
      if (clearIconUrl) fd.append('clearIconUrl', 'true');

      if (editing) {
        await api.put(`/checklist/${initial.id}`, fd);
      } else {
        await api.post('/checklist', fd);
      }
      toast.success(editing ? 'Updated' : 'Created');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
          <h3 className="font-display font-bold text-lg">
            {editing ? 'Edit checklist item' : 'New checklist item'}
          </h3>
          <button type="button" onClick={onClose} className="text-ink-muted hover:text-ink">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="label">Label *</label>
            <input
              className="input"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="e.g. Practitioner credentials"
              required
              maxLength={120}
            />
          </div>

          <div>
            <label className="label">Tooltip description</label>
            <textarea
              className="input"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What gets shown when a visitor hovers this badge. Keep it under 2 sentences."
            />
          </div>

          <div>
            <label className="label">Default icon</label>
            <div className="relative mb-2">
              <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                className="input pl-9 text-sm"
                placeholder="Search icons by name…"
                value={iconSearch}
                onChange={(e) => setIconSearch(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1">
              {filteredIcons.map((opt) => {
                const C = opt.Component;
                const active = form.iconName === opt.name;
                return (
                  <button
                    key={opt.name}
                    type="button"
                    onClick={() => setForm({ ...form, iconName: opt.name })}
                    title={opt.name}
                    className={`aspect-square rounded-lg border-2 flex items-center justify-center transition ${
                      active ? 'border-brand bg-brand/10 text-brand' : 'border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <C size={20} />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="label">Or upload custom icon image</label>
            <Dropzone
              accept="image/*"
              value={iconFile}
              onChange={setIconFile}
              existingUrl={!clearIconUrl && initial.iconUrl ? fileUrl(initial.iconUrl) : ''}
              onClearExisting={() => setClearIconUrl(true)}
              placeholder="Drop an icon image (PNG/SVG)"
              subLabel="Custom uploads override the default icon"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Show on homepage
            </label>
            <div className="flex items-center gap-2 text-sm ml-auto">
              <label className="text-ink-muted">Sort order:</label>
              <input
                type="number"
                className="input w-20 text-sm"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value, 10) || 0 })}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-5 border-t bg-surface-alt/50">
          <button type="button" onClick={onClose} className="btn-ghost text-sm">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-primary text-sm">
            <Save size={14} /> {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
