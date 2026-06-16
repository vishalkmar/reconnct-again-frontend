import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Edit, Trash2, Eye, EyeOff, X,
  ExternalLink, Link as LinkIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx';
import SortableList, { DragHandle } from '../../components/admin/SortableList.jsx';
import ToggleSwitch from '../../components/admin/ToggleSwitch.jsx';
import RowDetailsModal from '../../components/admin/RowDetailsModal.jsx';

const blank = { label: '', path: '', target: '_self', icon: '', isActive: true };

function LinkFormModal({ open, link, onClose, onSaved }) {
  const editing = !!link;
  const [form, setForm] = useState(blank);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (link) {
      setForm({
        label: link.label || '',
        path: link.path || '',
        target: link.target || '_self',
        icon: link.icon || '',
        isActive: link.isActive ?? true,
      });
    } else setForm(blank);
  }, [link, open]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.label.trim() || !form.path.trim()) return toast.error('Label and path required');

    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/header-links/${link.id}`, form);
        toast.success('Link updated');
      } else {
        await api.post('/header-links', form);
        toast.success('Link created');
      }
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-card">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-display font-semibold">
            {editing ? 'Edit Header Link' : 'New Header Link'}
          </h3>
          <button onClick={onClose} className="text-ink-muted hover:text-ink"><X size={22} /></button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="label">Label *</label>
            <input
              className="input" value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="e.g. Explore"
              required
            />
          </div>
          <div>
            <label className="label">Path / URL *</label>
            <input
              className="input" value={form.path}
              onChange={(e) => setForm({ ...form, path: e.target.value })}
              placeholder="/retreats or https://example.com"
              required
            />
            <p className="text-xs text-ink-muted mt-1">
              Use a relative path for internal pages, or a full URL for external links.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Open in</label>
              <select
                className="input" value={form.target}
                onChange={(e) => setForm({ ...form, target: e.target.value })}
              >
                <option value="_self">Same tab</option>
                <option value="_blank">New tab</option>
              </select>
            </div>
            <div>
              <label className="label">Icon (lucide name, optional)</label>
              <input
                className="input" value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                placeholder="globe, heart, …"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox" checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Visible on site
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button disabled={submitting} className="btn-primary">
              {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function HeaderLinksPage() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [viewItem, setViewItem] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/header-links/all');
      setLinks(res.data.data.links);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const persistOrder = async (ordered) => {
    setLinks(ordered);
    try {
      await api.put('/header-links/reorder', { order: ordered.map((l) => l.id) });
    } catch (err) {
      toast.error('Reorder failed');
      load();
    }
  };

  const toggle = async (l) => {
    try {
      await api.patch(`/header-links/${l.id}/toggle`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Toggle failed');
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/header-links/${deleteId}`);
      toast.success('Link deleted');
      setDeleteId(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Header Links</h1>
          <p className="text-ink-muted text-sm">
            Manage navbar links — drag the grip handle to reorder.
          </p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary whitespace-nowrap">
          <Plus size={18} /> New link
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : links.length === 0 ? (
        <div className="card p-12 text-center">
          <LinkIcon size={40} className="mx-auto text-ink-muted mb-3" />
          <p className="text-ink-muted">No header links yet. Create the first one.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-3 bg-surface-alt text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <div className="col-span-1">Order</div>
            <div className="col-span-3">Label</div>
            <div className="col-span-4">Path</div>
            <div className="col-span-2">Target</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          <SortableList
            items={links}
            onReorder={persistOrder}
            rowClassName="border-t hover:bg-surface-alt/50"
            renderItem={(l, { dragHandleProps }) => (
              <div
                className={`grid grid-cols-12 items-center px-4 py-3 ${
                  !l.isActive ? 'opacity-50' : ''
                }`}
              >
                <div className="col-span-1 flex items-center gap-2 text-xs text-ink-muted">
                  <DragHandle dragHandleProps={dragHandleProps} />
                </div>
                <div className="col-span-3 font-medium">{l.label}</div>
                <div className="col-span-4 text-sm text-ink-muted truncate">{l.path}</div>
                <div className="col-span-2 text-sm">
                  {l.target === '_blank' ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-brand/10 text-brand">
                      <ExternalLink size={12} /> New tab
                    </span>
                  ) : (
                    <span className="text-xs text-ink-muted">Same tab</span>
                  )}
                </div>
                <div className="col-span-2 flex items-center justify-end gap-1.5">
                  <ToggleSwitch checked={l.isActive} onChange={() => toggle(l)} size="sm" />
                  <button onClick={() => setViewItem(l)} className="p-1.5 hover:bg-surface-alt rounded" title="View details">
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => { setEditing(l); setShowForm(true); }}
                    className="p-1.5 hover:bg-surface-alt rounded"
                    title="Edit"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteId(l.id)}
                    className="p-1.5 hover:bg-red-50 text-red-600 rounded"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )}
          />
        </div>
      )}

      <LinkFormModal
        open={showForm}
        link={editing}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSaved={load}
      />

      <ConfirmDialog
        open={!!deleteId}
        title="Delete link?"
        message="This link will be removed from the navigation."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onClose={() => setDeleteId(null)}
      />

      <RowDetailsModal
        open={!!viewItem}
        onClose={() => setViewItem(null)}
        title={viewItem?.label || viewItem?.name}
        data={viewItem}
      />
    </div>
  );
}
