import { Link } from 'react-router-dom';
import { Calendar, Clock, FileText, Share2, ArrowRight, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { fileUrl } from '../../services/api';

// Excerpt may now contain rich-text HTML — strip tags for plain card teasers.
const stripHtml = (s) =>
  (s || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/*
  BlogCard — Holidays-Seychelles inspired
   - "double-border" outer shell with soft padding
   - inner image is itself rounded
   - numbered/category badge tucked over title
   - "View Details" pill + Share button row

  Whole-card click: ghost overlay <Link> covers the card; share button + sub-
  links sit above it with `relative z-20`.
*/

export default function BlogCard({ blog, variant = 'default', index }) {
  const detailHref = `/blogs/${blog.slug}`;

  const onShare = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}${detailHref}`;
    if (navigator.share) {
      navigator.share({ title: blog.title, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied');
    }
  };

  if (variant === 'large') {
    // The large variant is already a single Link wrapper — keep it as-is.
    return (
      <Link
        to={detailHref}
        className="block relative rounded-3xl overflow-hidden group min-h-[420px] bg-slate-200 ring-1 ring-slate-200"
      >
        {blog.featuredImage ? (
          <img
            src={fileUrl(blog.featuredImage)}
            alt={blog.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brand to-wellness" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="relative h-full flex flex-col justify-end p-6 md:p-8 text-white">
          {blog.category && (
            <span className="self-start text-[11px] uppercase tracking-widest bg-brand px-2 py-0.5 rounded-full font-semibold">
              {blog.category.name}
            </span>
          )}
          <h2 className="text-2xl md:text-4xl font-display font-bold mt-3 leading-tight max-w-3xl">
            {blog.title}
          </h2>
          {blog.excerpt && (
            <p className="mt-2 text-white/85 max-w-2xl line-clamp-2">{stripHtml(blog.excerpt)}</p>
          )}
          <div className="mt-4 flex items-center gap-4 text-xs text-white/80">
            {blog.publishedAt && (
              <span className="inline-flex items-center gap-1">
                <Calendar size={12} /> {new Date(blog.publishedAt).toLocaleDateString()}
              </span>
            )}
            {blog.readMinutes && (
              <span className="inline-flex items-center gap-1">
                <Clock size={12} /> {blog.readMinutes} min read
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <article className="relative group rounded-3xl bg-white p-3 ring-1 ring-slate-200 shadow-soft hover:shadow-lg hover:ring-brand/40 transition duration-300">
      <Link
        to={detailHref}
        aria-label={`Read ${blog.title}`}
        tabIndex={-1}
        className="absolute inset-0 z-10 rounded-3xl"
      />

      <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-slate-100">
        {blog.featuredImage ? (
          <img
            src={fileUrl(blog.featuredImage)}
            alt={blog.title}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-muted bg-gradient-to-br from-brand-light/20 to-wellness-light/20">
            <FileText size={36} />
          </div>
        )}
        {blog.category && (
          <span className="absolute top-3 left-3 text-[10px] uppercase tracking-widest bg-white/95 backdrop-blur text-brand px-2.5 py-1 rounded-full font-semibold shadow z-20">
            {blog.category.name}
          </span>
        )}
      </div>

      <div className="px-3 pt-4 pb-3">
        <div className="flex items-start gap-3">
          {typeof index === 'number' && (
            <span className="shrink-0 w-7 h-7 rounded-md bg-brand text-white flex items-center justify-center font-bold text-sm">
              {index + 1}
            </span>
          )}
          <h3 className="flex-1 min-w-0 font-display font-semibold text-lg leading-snug line-clamp-2 group-hover:text-brand transition">
            {blog.title}
          </h3>
        </div>

        {blog.excerpt && (
          <p className="text-sm text-ink-muted mt-2 line-clamp-3 leading-relaxed">
            {stripHtml(blog.excerpt)}
          </p>
        )}

        <div className="mt-4 flex items-center gap-3 text-xs text-ink-muted">
          {blog.publishedAt && (
            <span className="inline-flex items-center gap-1">
              <Calendar size={12} /> {new Date(blog.publishedAt).toLocaleDateString()}
            </span>
          )}
          {blog.readMinutes ? (
            <span className="inline-flex items-center gap-1">
              <Clock size={12} /> {blog.readMinutes} min
            </span>
          ) : null}
          {typeof blog.viewCount === 'number' && blog.viewCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Eye size={12} /> {blog.viewCount} views
            </span>
          )}
        </div>

        <div className="relative z-20 mt-4 flex items-center gap-2">
          <Link
            to={detailHref}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-wellness text-white text-sm font-semibold hover:bg-wellness-dark transition"
          >
            View Details <ArrowRight size={14} />
          </Link>
          <button
            type="button"
            onClick={onShare}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border-2 border-slate-200 text-ink hover:border-brand hover:text-brand text-sm font-semibold transition"
          >
            <Share2 size={14} /> Share
          </button>
        </div>
      </div>
    </article>
  );
}
