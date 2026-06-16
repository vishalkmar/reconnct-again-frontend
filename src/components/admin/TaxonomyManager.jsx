import { useEffect, useState, useCallback } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, X, ImageIcon, LayoutGrid, List as ListIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import ConfirmDialog from './ConfirmDialog.jsx';
import ToggleSwitch from './ToggleSwitch.jsx';
import RowDetailsModal from './RowDetailsModal.jsx';
import Dropzone from './Dropzone.jsx';
import SortableList, { DragHandle } from './SortableList.jsx';

/**
 * Reusable CRUD page for taxonomy entities (City, Category, Problem, Activity).
 *
 * Two view modes:
 *   - "list" (default) → drag-and-drop reorderable rows
 *   - "grid" → existing card grid (no reorder)
 *
 * Props:
 *   resource     — API path segment, e.g. "cities"
 *   title        — page title
 *   subtitle     — page subtitle
 *   labels       — { singular, plural }
 *   extraFields  — array of { name, label, placeholder?, type? }
 *   color        — "brand" | "wellness"
 */
export default function TaxonomyManager({
  resource,
  title,
  subtitle,
  labels = { singular: 'item', plural: 'items' },
  extraFields = [],
  color = 'brand',
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [view, setView] = useState('list');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/${resource}/all`);
      setItems(res.data.data.items);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [resource]);

  useEffect(() => { load(); }, [load]);

  const persistOrder = async (ordered) => {
    setItems(ordered);
    try {
      await api.put(`/${resource}/reorder`, { order: ordered.map((it) => it.id) });
    } catch (err) {
      toast.error('Reorder failed');
      load();
    }
  };

  const toggle = async (it) => {
    try {
      await api.patch(`/${resource}/${it.id}/toggle`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Toggle failed');
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/${resource}/${deleteId}`);
      toast.success(`${labels.singular} deleted`);
      setDeleteId(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const accent = color === 'wellness' ? 'text-wellness' : 'text-brand';
  const accentBg = color === 'wellness' ? 'bg-wellness/10' : 'bg-brand/10';

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">{title}</h1>
          {subtitle && <p className="text-ink-muted text-sm">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex bg-surface-alt rounded-lg p-1 text-sm">
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 ${
                view === 'list' ? 'bg-white shadow-soft text-brand' : 'text-ink-muted hover:text-ink'
              }`}
              title="List view (drag to reorder)"
            >
              <ListIcon size={14} /> List
            </button>
            <button
              onClick={() => setView('grid')}
              className={`px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 ${
                view === 'grid' ? 'bg-white shadow-soft text-brand' : 'text-ink-muted hover:text-ink'
              }`}
              title="Grid view"
            >
              <LayoutGrid size={14} /> Grid
            </button>
          </div>
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary whitespace-nowrap">
            <Plus size={18} /> New {labels.singular}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center">
          <div className={`w-14 h-14 ${accentBg} ${accent} rounded-full inline-flex items-center justify-center mb-3`}>
            <ImageIcon size={24} />
          </div>
          <p className="text-ink-muted">No {labels.plural} yet. Create the first one.</p>
        </div>
      ) : view === 'list' ? (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-3 bg-surface-alt text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <div className="col-span-1">Order</div>
            <div className="col-span-2">Image</div>
            <div className="col-span-5">Name</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          <SortableList
            items={items}
            onReorder={persistOrder}
            renderItem={(it, { dragHandleProps }) => (
              <div
                className={`grid grid-cols-12 items-center px-4 py-3 border-t hover:bg-surface-alt/50 ${
                  !it.isActive ? 'opacity-50' : ''
                }`}
              >
                <div className="col-span-1">
                  <DragHandle dragHandleProps={dragHandleProps} />
                </div>
                <div className="col-span-2">
                  <div className="w-14 h-10 rounded-md overflow-hidden bg-slate-100 flex items-center justify-center">
                    {it.imageUrl ? (
                      <img src={fileUrl(it.imageUrl)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={16} className="text-ink-muted" />
                    )}
                  </div>
                </div>
                <div className="col-span-5">
                  <div className="font-medium leading-tight">{it.name}</div>
                  {extraFields.map((f) =>
                    it[f.name] ? (
                      <div key={f.name} className="text-[11px] text-ink-muted mt-0.5">
                        {f.label}: <span className="font-medium">{it[f.name]}</span>
                      </div>
                    ) : null
                  )}
                </div>
                <div className="col-span-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    it.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {it.isActive ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
                <div className="col-span-2 flex items-center justify-end gap-1.5">
                  <ToggleSwitch checked={it.isActive} onChange={() => toggle(it)} size="sm" />
                  <button onClick={() => setViewItem(it)} className="p-1.5 hover:bg-surface-alt rounded" title="View details">
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => { setEditing(it); setShowForm(true); }}
                    className="p-1.5 hover:bg-surface-alt rounded"
                    title="Edit"
                  >
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
            )}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {items.map((it) => (
            <div key={it.id} className={`card group ${!it.isActive && 'opacity-60'}`}>
              <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                {it.imageUrl ? (
                  <img src={fileUrl(it.imageUrl)} alt={it.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-ink-muted">
                    <ImageIcon />
                  </div>
                )}
                <span className={`absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full font-semibold ${it.isActive ? 'bg-green-500 text-white' : 'bg-slate-500 text-white'}`}>
                  {it.isActive ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-semibold leading-tight">{it.name}</h3>
                {extraFields.map((f) =>
                  it[f.name] ? (
                    <p key={f.name} className="text-xs text-ink-muted mt-0.5">
                      {f.label}: <span className="font-medium">{it[f.name]}</span>
                    </p>
                  ) : null
                )}
                {it.description && (
                  <p className="text-sm mt-2 line-clamp-2 text-ink-muted">{it.description}</p>
                )}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                  <ToggleSwitch checked={it.isActive} onChange={() => toggle(it)} showLabel labelOn="Enabled" labelOff="Disabled" />
                  <button onClick={() => setViewItem(it)} className="ml-auto btn-ghost text-xs">
                    <Eye size={14} /> View
                  </button>
                  <button
                    onClick={() => { setEditing(it); setShowForm(true); }}
                    className="btn-ghost text-xs"
                  >
                    <Edit size={14} /> Edit
                  </button>
                  <button
                    onClick={() => setDeleteId(it.id)}
                    className="flex-1 btn-ghost text-xs text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <TaxonomyFormModal
        open={showForm}
        item={editing}
        resource={resource}
        labels={labels}
        extraFields={extraFields}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSaved={load}
      />

      <ConfirmDialog
        open={!!deleteId}
        title={`Delete ${labels.singular}?`}
        message={`This will permanently remove this ${labels.singular} and its image.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onClose={() => setDeleteId(null)}
      />

      <RowDetailsModal
        open={!!viewItem}
        onClose={() => setViewItem(null)}
        title={viewItem?.name}
        data={viewItem}
      />
    </div>
  );
}

function TaxonomyFormModal({ open, item, resource, labels, extraFields, onClose, onSaved }) {
  const editing = !!item;
  const [form, setForm] = useState({});
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const base = {
      name: item?.name || '',
      description: item?.description || '',
      sortOrder: item?.sortOrder ?? 0,
      isActive: item?.isActive ?? true,
    };
    extraFields.forEach((f) => {
      if (f.type === 'checkbox') base[f.name] = !!item?.[f.name];
      else base[f.name] = item?.[f.name] || '';
    });
    setForm(base);
    setFile(null);
  }, [item, open, extraFields]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name?.trim()) return toast.error('Name is required');

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v !== undefined && v !== null) fd.append(k, v);
    });
    if (file) fd.append('image', file);

    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/${resource}/${item.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success(`${labels.singular} updated`);
      } else {
        await api.post(`/${resource}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success(`${labels.singular} created`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full my-8 shadow-card">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-display font-semibold">
            {editing ? `Edit ${labels.singular}` : `New ${labels.singular}`}
          </h3>
          <button onClick={onClose} className="text-ink-muted hover:text-ink"><X size={22} /></button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="label">Name *</label>
            <input
              className="input"
              value={form.name || ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          {extraFields.map((f) => {
            if (f.type === 'checkbox') {
              return (
                <label key={f.name} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!form[f.name]}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.checked })}
                  />
                  <span className="text-sm">{f.label}</span>
                  {f.help && <span className="text-[11px] text-ink-muted ml-1">— {f.help}</span>}
                </label>
              );
            }
            return (
              <div key={f.name}>
                <label className="label">{f.label}</label>
                <input
                  type={f.type || 'text'}
                  className="input"
                  placeholder={f.placeholder}
                  value={form[f.name] || ''}
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                />
              </div>
            );
          })}

          <div>
            <label className="label">Description</label>
            <textarea
              className="input" rows={3}
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Image</label>
            <Dropzone
              accept="image/*"
              value={file}
              onChange={setFile}
              existingUrl={item?.imageUrl}
              placeholder={item?.imageUrl ? 'Drag & drop a new image to replace, or click' : 'Drag & drop an image, or click to browse'}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Sort order</label>
              <input
                type="number" className="input"
                value={form.sortOrder ?? 0}
                onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value || 0, 10) })}
              />
            </div>
            <label className="flex items-center gap-2 mt-7">
              <input
                type="checkbox"
                checked={!!form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Visible on site
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button disabled={submitting} className="btn-primary">
              {submitting ? 'Saving…' : editing ? 'Save changes' : `Create ${labels.singular}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
