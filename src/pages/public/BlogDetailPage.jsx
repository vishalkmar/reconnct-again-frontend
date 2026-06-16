import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Calendar, Clock, Tag, Share2, ArrowLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';

import api, { fileUrl } from '../../services/api';
import BlogCard from '../../components/public/BlogCard.jsx';

export default function BlogDetailPage() {
  const { slug } = useParams();
  const [blog, setBlog] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/blogs/${slug}`)
      .then((res) => {
        if (cancelled) return;
        setBlog(res.data?.data?.blog || null);
        setRelated(res.data?.data?.related || []);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  const onShare = () => {
    if (navigator.share) {
      navigator.share({ title: blog?.title, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  if (loading) {
    return (
      <div className="container-app py-12">
        <div className="h-96 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="container-app section text-center">
        <h1 className="heading">Blog not found</h1>
        <Link to="/blogs" className="btn-primary mt-6 inline-flex">Browse all blogs</Link>
      </div>
    );
  }

  return (
    <>
      {/* Hero */}
      <div className="relative bg-ink text-white">
        {blog.featuredImage && (
          <>
            <img
              src={fileUrl(blog.featuredImage)}
              alt={blog.title}
              className="absolute inset-0 w-full h-full object-cover opacity-50"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/30" />
          </>
        )}
        <div className="container-app relative py-16 md:py-24">
          <Link to="/blogs" className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm mb-5">
            <ArrowLeft size={16} /> All blogs
          </Link>
          {blog.category && (
            <span className="inline-block text-[11px] uppercase tracking-widest bg-brand px-2 py-0.5 rounded-full font-semibold">
              {blog.category.name}
            </span>
          )}
          <h1 className="text-3xl md:text-5xl font-display font-bold mt-3 max-w-4xl leading-tight drop-shadow">
            {blog.title}
          </h1>
          {blog.excerpt && (
            <p className="mt-4 text-white/85 max-w-3xl text-base md:text-lg">
              {blog.excerpt.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()}
            </p>
          )}
          <div className="mt-6 flex items-center gap-4 text-sm text-white/80 flex-wrap">
            {blog.publishedAt && (
              <span className="inline-flex items-center gap-1">
                <Calendar size={14} /> {new Date(blog.publishedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            )}
            {blog.readMinutes && (
              <span className="inline-flex items-center gap-1">
                <Clock size={14} /> {blog.readMinutes} min read
              </span>
            )}
            <span>· {blog.viewCount || 0} views</span>
          </div>
        </div>
      </div>

      <div className="container-app py-10">
        {/* Article — full-width within container, capped to a comfortable reading
            measure so long lines don't hurt legibility. */}
        <article className="max-w-5xl mx-auto">
          {blog.content ? (
            <div
              className="blog-prose"
              dangerouslySetInnerHTML={{ __html: blog.content }}
            />
          ) : !blog.scenes?.length ? (
            <p className="text-ink-muted italic">No content yet.</p>
          ) : null}

          {/* Scenes — Holidays Seychelles style chapters */}
          {blog.scenes?.length > 0 && (
            <div className={`${blog.content ? 'mt-12' : ''} space-y-12`}>
              {blog.scenes.map((scene, i) => (
                <BlogScene key={scene.id} scene={scene} index={i} />
              ))}
            </div>
          )}

          {blog.tags?.length > 0 && (
            <div className="mt-10 pt-6 border-t flex flex-wrap items-center gap-2">
              <span className="text-sm text-ink-muted inline-flex items-center gap-1">
                <Tag size={14} /> Tags:
              </span>
              {blog.tags.map((t, i) => (
                <Link
                  key={i}
                  to={`/blogs?tag=${encodeURIComponent(t)}`}
                  className="text-xs px-3 py-1 bg-surface-alt rounded-full hover:bg-brand hover:text-white transition"
                >
                  {t}
                </Link>
              ))}
            </div>
          )}

          {/* Author */}
          {blog.authorName && (
            <div className="mt-8 bg-surface-alt rounded-xl p-5 flex items-start gap-4">
              {blog.authorImage && (
                <img
                  src={fileUrl(blog.authorImage)}
                  alt={blog.authorName}
                  className="w-14 h-14 rounded-full object-cover"
                />
              )}
              <div>
                <div className="text-xs uppercase tracking-widest text-ink-muted">Written by</div>
                <h4 className="font-semibold mt-0.5">{blog.authorName}</h4>
                {blog.authorTitle && (
                  <p className="text-sm text-ink-muted">{blog.authorTitle}</p>
                )}
              </div>
            </div>
          )}

          {/* Share */}
          <div className="mt-6 flex justify-end">
            <button onClick={onShare} className="btn-outline text-sm">
              <Share2 size={14} /> Share article
            </button>
          </div>
        </article>
      </div>

      {/* Footer related grid */}
      {related.length > 0 && (
        <section className="bg-surface-alt py-12">
          <div className="container-app">
            <h2 className="text-2xl font-display font-bold mb-6">You might also enjoy</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {related.map((r, i) => <BlogCard key={r.id} blog={r} index={i} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function BlogScene({ scene, index }) {
  const num = String(index + 1).padStart(2, '0');
  const hasImage = !!scene.imageUrl;
  const layout = scene.imagePosition || 'left';

  const imageBlock = hasImage && (
    <div className="rounded-2xl overflow-hidden bg-slate-100 ring-1 ring-slate-200 shadow-soft">
      <img src={fileUrl(scene.imageUrl)} alt={scene.title || ''} className="w-full h-full object-cover" />
    </div>
  );

  const textBlock = (
    <div>
      <div className="inline-flex items-center gap-2 mb-3">
        <span className="text-xs uppercase tracking-widest text-ink-muted">Scene {num}</span>
        <span className="h-px w-10 bg-brand" />
      </div>
      {scene.subtitle && (
        <p className="text-sm uppercase tracking-widest text-brand font-semibold mb-1">
          {scene.subtitle}
        </p>
      )}
      {scene.title && (
        <h3 className="text-2xl md:text-3xl font-display font-bold leading-tight mb-3">
          {scene.title}
        </h3>
      )}
      {scene.content && (
        <div
          className="blog-prose"
          dangerouslySetInnerHTML={{ __html: scene.content }}
        />
      )}
    </div>
  );

  if (layout === 'full') {
    return (
      <div className="space-y-5">
        {imageBlock}
        {textBlock}
      </div>
    );
  }
  if (layout === 'top') {
    return (
      <div className="space-y-5">
        {imageBlock}
        {textBlock}
      </div>
    );
  }
  if (layout === 'bottom') {
    return (
      <div className="space-y-5">
        {textBlock}
        {imageBlock}
      </div>
    );
  }
  // left (default) or right
  return (
    <div className={`grid md:grid-cols-2 gap-6 md:gap-10 items-center ${layout === 'right' ? 'md:[&>*:first-child]:order-2' : ''}`}>
      {imageBlock}
      {textBlock}
    </div>
  );
}
