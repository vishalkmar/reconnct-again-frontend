import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Tag, FileText, User, Settings, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import Dropzone from '../../components/admin/Dropzone.jsx';
import BlogScenesEditor from '../../components/admin/BlogScenesEditor.jsx';
import RichTextEditor from '../../components/admin/RichTextEditor.jsx';

const blank = {
  title: '', slug: '',
  excerpt: '', content: '',
  blogCategoryId: '',
  authorName: '', authorTitle: '',
  tags: '',
  readMinutes: 5,
  isFeatured: false, isPublished: false,
  metaTitle: '', metaDescription: '',
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

export default function BlogFormPage() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();

  const [form, setForm] = useState(blank);
  const [blog, setBlog] = useState(null);
  const [categories, setCategories] = useState([]);
  const [featuredImage, setFeaturedImage] = useState(null);
  const [authorImage, setAuthorImage] = useState(null);
  const [loading, setLoading] = useState(editing);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/blog-categories/all')
      .then((res) => setCategories(res.data?.data?.items || []))
      .catch(() => {});
  }, []);

  const loadBlog = useCallback(async () => {
    if (!editing) return;
    setLoading(true);
    try {
      const res = await api.get(`/blogs/admin/${id}`);
      const b = res.data.data.blog;
      setBlog(b);
      setForm({
        title: b.title || '',
        slug: b.slug || '',
        excerpt: b.excerpt || '',
        content: b.content || '',
        blogCategoryId: b.blogCategoryId || '',
        authorName: b.authorName || '',
        authorTitle: b.authorTitle || '',
        tags: Array.isArray(b.tags) ? b.tags.join(', ') : '',
        readMinutes: b.readMinutes ?? 5,
        isFeatured: !!b.isFeatured,
        isPublished: !!b.isPublished,
        metaTitle: b.metaTitle || '',
        metaDescription: b.metaDescription || '',
        sortOrder: b.sortOrder ?? 0,
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [editing, id]);

  useEffect(() => { loadBlog(); }, [loadBlog]);

  const change = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title?.trim()) return toast.error('Title is required');

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      fd.append(k, v);
    });
    if (featuredImage) fd.append('featuredImage', featuredImage);
    if (authorImage) fd.append('authorImage', authorImage);

    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/blogs/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Blog saved');
        loadBlog();
        setFeaturedImage(null);
        setAuthorImage(null);
      } else {
        const res = await api.post('/blogs', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Blog created');
        navigate(`/admin/blogs/${res.data.data.blog.id}/edit`, { replace: true });
      }
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
    <form onSubmit={submit}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/admin/blogs" className="p-2 rounded-lg hover:bg-surface-alt">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold">
              {editing ? 'Edit Blog' : 'New Blog'}
            </h1>
            {editing && blog && (
              <p className="text-xs text-ink-muted">
                Public URL:{' '}
                <Link to={`/blogs/${blog.slug}`} target="_blank" className="text-brand hover:underline">
                  /blogs/{blog.slug}
                </Link>
              </p>
            )}
          </div>
        </div>
        <button disabled={submitting} className="btn-primary">
          <Save size={16} /> {submitting ? 'Saving…' : 'Save blog'}
        </button>
      </div>

      <Section icon={FileText} title="Article">
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-8">
          <div className="sm:col-span-2">
            <label className="label">Title *</label>
            <input
              className="input" value={form.title}
              onChange={(e) => change('title', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Property name</label>
            <input
              className="input" value={form.slug}
              onChange={(e) => change('slug', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Read time (minutes)</label>
            <input
              type="number" className="input" min={1}
              value={form.readMinutes}
              onChange={(e) => change('readMinutes', parseInt(e.target.value || 5, 10))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Excerpt</label>
            <RichTextEditor
              value={form.excerpt}
              onChange={(v) => change('excerpt', v)}
              placeholder="A short teaser shown in cards, search results and the article hero."
              minHeight={140}
            />
            <p className="text-[11px] text-ink-muted mt-1.5">
              Plain text from this block is used in card previews — formatting still renders on the article page.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Content</label>
            <RichTextEditor
              value={form.content}
              onChange={(v) => change('content', v)}
              placeholder="Write your article here — use the toolbar for headings, lists, links, images, icons and more."
              minHeight={360}
            />
            <p className="text-[11px] text-ink-muted mt-1.5">
              The rich editor below renders exactly as it appears here on the public site.
            </p>
          </div>
        </div>
      </Section>

      <Section icon={Tag} title="Category, tags & featured image">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Category</label>
            <select
              className="input"
              value={form.blogCategoryId}
              onChange={(e) => change('blogCategoryId', e.target.value)}
            >
              <option value="">— select —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tags (comma-separated)</label>
            <input
              className="input" value={form.tags}
              onChange={(e) => change('tags', e.target.value)}
              placeholder="travel, wellness, kerala"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Featured image</label>
            <Dropzone
              accept="image/*"
              value={featuredImage}
              onChange={setFeaturedImage}
              existingUrl={blog?.featuredImage}
              placeholder={blog?.featuredImage ? 'Drag a new image to replace, or click' : 'Drag & drop the cover image, or click'}
            />
          </div>
        </div>
      </Section>

      <Section icon={Layers} title="Scenes (multi-section blog)" defaultOpen={true}>
        <p className="text-sm text-ink-muted">
          Break this blog into chapters — each scene has its own image, title and content,
          and renders one after another on the public detail page.
        </p>
        <BlogScenesEditor blogId={editing ? id : null} />
      </Section>

      <Section icon={User} title="Author" defaultOpen={false}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Author name</label>
            <input
              className="input" value={form.authorName}
              onChange={(e) => change('authorName', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Author title / role</label>
            <input
              className="input" value={form.authorTitle}
              onChange={(e) => change('authorTitle', e.target.value)}
              placeholder="Wellness writer"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Author image</label>
            <Dropzone
              accept="image/*"
              value={authorImage}
              onChange={setAuthorImage}
              existingUrl={blog?.authorImage}
              placeholder="Drag author photo, or click"
            />
          </div>
        </div>
      </Section>

      <Section icon={Settings} title="Status & SEO" defaultOpen={false}>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox" checked={form.isPublished}
              onChange={(e) => change('isPublished', e.target.checked)}
            />
            Published
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox" checked={form.isFeatured}
              onChange={(e) => change('isFeatured', e.target.checked)}
            />
            Featured (homepage)
          </label>
          <div>
            <label className="label">Sort order</label>
            <input
              type="number" className="input"
              value={form.sortOrder}
              onChange={(e) => change('sortOrder', parseInt(e.target.value || 0, 10))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Meta title</label>
            <input
              className="input" value={form.metaTitle}
              onChange={(e) => change('metaTitle', e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Meta description</label>
            <textarea
              className="input" rows={2}
              value={form.metaDescription}
              onChange={(e) => change('metaDescription', e.target.value)}
            />
          </div>
        </div>
      </Section>

      <div className="sticky bottom-4 flex justify-end mt-6">
        <button disabled={submitting} className="btn-primary shadow-card">
          <Save size={16} /> {submitting ? 'Saving…' : 'Save blog'}
        </button>
      </div>
    </form>
  );
}
