import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, ChevronUp, ChevronDown, Edit, X, Layers, ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import Dropzone from './Dropzone.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import RichTextEditor from './RichTextEditor.jsx';

const POSITIONS = [
  { value: 'left', label: 'Image left, text right' },
  { value: 'right', label: 'Image right, text left' },
  { value: 'top', label: 'Image on top' },
  { value: 'bottom', label: 'Image at bottom' },
  { value: 'full', label: 'Full-width image' },
];

const blank = {
  title: '',
  subtitle: '',
  content: '',
  imagePosition: 'left',
};

export default function BlogScenesEditor({ blogId }) {
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const load = useCallback(async () => {
    if (!blogId) return;
    setLoading(true);
    try {
      const res = await api.get(`/blogs/${blogId}/scenes`);
      setScenes(res.data?.data?.scenes || []);
    } catch (err) {
      toast.error('Failed to load scenes');
    } finally {
      setLoading(false);
    }
  }, [blogId]);

  useEffect(() => { load(); }, [load]);

  const move = async (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= scenes.length) return;
    const next = [...scenes];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setScenes(next);
    try {
      await api.put(`/blogs/${blogId}/scenes/reorder`, { order: next.map((s) => s.id) });
    } catch (err) {
      toast.error('Reorder failed');
      load();
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/blogs/${blogId}/scenes/${deleteId}`);
      toast.success('Scene removed');
      setDeleteId(null);
      load();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  if (!blogId) {
    return (
      <div className="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center">
        <Layers size={28} className="text-ink-muted mx-auto mb-2" />
        <p className="text-sm text-ink-muted italic">
          Save the blog first — scenes can be added once the article exists.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header / counter */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-ink-muted">
          <Layers size={14} />
          {loading
            ? 'Loading scenes…'
            : `${scenes.length} ${scenes.length === 1 ? 'scene' : 'scenes'} added`}
        </div>
        <button
          type="button"
          onClick={() => { setEditing(null); setFormOpen(true); }}
          className="btn-primary text-sm"
        >
          <Plus size={14} /> Add scene
        </button>
      </div>

      {loading ? (
        <div className="h-24 bg-surface-alt rounded-xl animate-pulse" />
      ) : scenes.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
          <Layers size={28} className="text-ink-muted mx-auto mb-2" />
          <p className="text-sm text-ink-muted">
            No scenes yet. Click <strong>Add scene</strong> above to break this article into
            chapter-style sections (image + title + content).
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {scenes.map((s, i) => (
            <div
              key={s.id}
              className="bg-white border border-slate-200 hover:border-brand/40 rounded-xl p-3 flex items-center gap-3 shadow-sm transition"
            >
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="text-ink-muted hover:text-brand disabled:opacity-30"
                ><ChevronUp size={16} /></button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === scenes.length - 1}
                  className="text-ink-muted hover:text-brand disabled:opacity-30"
                ><ChevronDown size={16} /></button>
              </div>

              <div className="w-24 h-16 rounded-lg overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center text-ink-muted">
                {s.imageUrl ? (
                  <img src={fileUrl(s.imageUrl)} className="w-full h-full object-cover" alt="" />
                ) : (
                  <ImageIcon size={16} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-brand font-bold bg-brand/10 px-2 py-0.5 rounded-full">
                    Scene {i + 1}
                  </span>
                  {s.imagePosition && (
                    <span className="text-[10px] uppercase text-ink-muted">{s.imagePosition} layout</span>
                  )}
                </div>
                <div className="font-semibold text-sm mt-1 truncate">{s.title || <em className="text-ink-muted">Untitled scene</em>}</div>
                {s.subtitle && (
                  <div className="text-xs text-ink-muted truncate">{s.subtitle}</div>
                )}
              </div>

              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => { setEditing(s); setFormOpen(true); }}
                  className="p-2 text-brand hover:bg-brand/10 rounded-lg transition"
                  title="Edit"
                ><Edit size={16} /></button>
                <button
                  type="button"
                  onClick={() => setDeleteId(s.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                  title="Delete"
                ><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <SceneFormModal
        open={formOpen}
        scene={editing}
        blogId={blogId}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSaved={load}
      />

      <ConfirmDialog
        open={!!deleteId}
        title="Delete scene?"
        message="This will permanently remove this scene and its image."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
}

function SceneFormModal({ open, scene, blogId, onClose, onSaved }) {
  const editing = !!scene;
  const [form, setForm] = useState(blank);
  const [image, setImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (scene) {
      setForm({
        title: scene.title || '',
        subtitle: scene.subtitle || '',
        content: scene.content || '',
        imagePosition: scene.imagePosition || 'left',
      });
    } else setForm(blank);
    setImage(null);
  }, [scene, open]);

  if (!open) return null;

  const change = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const submit = async (e) => {
    e?.preventDefault?.();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v !== undefined && v !== null) fd.append(k, v);
    });
    if (image) fd.append('image', image);

    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/blogs/${blogId}/scenes/${scene.id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Scene updated');
      } else {
        await api.post(`/blogs/${blogId}/scenes`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Scene added');
      }
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  // The parent <BlogFormPage /> is itself a <form>. Rendering this modal as a
  // direct child results in nested forms, which HTML doesn't allow — browsers
  // collapse the inner form and the modal's "Add scene" submit ends up
  // submitting the outer blog form (causing a page refresh and the scene
  // never being saved). Portalling to <body> moves the modal out of the
  // blog form's subtree and lets its <form onSubmit> work correctly.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full my-8 shadow-card">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-display font-semibold">
            {editing ? 'Edit scene' : 'New scene'}
          </h3>
          <button type="button" onClick={onClose} className="text-ink-muted hover:text-ink"><X size={22} /></button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Title</label>
              <input
                className="input" value={form.title}
                onChange={(e) => change('title', e.target.value)}
                placeholder="An Ideal Post-Covid Destination"
              />
            </div>
            <div>
              <label className="label">Subtitle (optional)</label>
              <input
                className="input" value={form.subtitle}
                onChange={(e) => change('subtitle', e.target.value)}
                placeholder="Seychelles"
              />
            </div>
          </div>
          <div>
            <label className="label">Content</label>
            <RichTextEditor
              value={form.content}
              onChange={(v) => change('content', v)}
              placeholder="Write the scene content — formatting, lists, links, images, icons all supported."
              minHeight={220}
            />
          </div>
          <div>
            <label className="label">Image layout</label>
            <select
              className="input"
              value={form.imagePosition}
              onChange={(e) => change('imagePosition', e.target.value)}
            >
              {POSITIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Scene image</label>
            <Dropzone
              accept="image/*"
              value={image}
              onChange={setImage}
              existingUrl={scene?.imageUrl}
              placeholder={scene?.imageUrl ? 'Drag a new image to replace, or click' : 'Drag & drop an image, or click'}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="button" onClick={submit} disabled={submitting} className="btn-primary">
              {submitting ? 'Saving…' : editing ? 'Save' : 'Add scene'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
