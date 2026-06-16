import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, BookOpen, Sparkles } from 'lucide-react';
import api from '../../services/api';
import BlogCard from './BlogCard.jsx';

export default function BlogsSection() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get('/blogs', { params: { limit: 3 } })
      .then((res) => { if (!cancelled) setBlogs(res.data?.data?.items || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (!loading && !blogs.length) return null;

  return (
    <section className="relative py-16 md:py-20 overflow-hidden">
      {/* Soft watercolor blobs */}
      <div
        aria-hidden
        className="absolute -top-10 -left-10 w-72 h-72 rounded-full bg-brand/10 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute -bottom-10 -right-10 w-80 h-80 rounded-full bg-wellness/10 blur-3xl pointer-events-none"
      />

      <div className="container-app relative">
        {/* Header — centred */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] font-bold text-brand bg-brand/10 px-3 py-1.5 rounded-full mb-4">
            <Sparkles size={12} /> From the journal
          </div>
          <h2 className="text-3xl md:text-5xl font-display font-bold leading-tight text-ink">
            Stories, guides &{' '}
            <span className="relative inline-block">
              <span className="relative z-10 text-brand">retreat reflections</span>
              <span
                aria-hidden
                className="absolute left-0 right-0 -bottom-1 h-2 bg-wellness/25 rounded-full"
              />
            </span>
          </h2>
          <p className="text-ink-muted mt-4 text-base md:text-lg leading-relaxed">
            Wellness tips, travel stories and reflections from our travellers and hosts —
            read before you go, or savour after you return.
          </p>

          <Link
            to="/blogs"
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-wellness text-white text-sm font-semibold hover:bg-wellness-dark transition"
          >
            <BookOpen size={16} />
            All articles
            <ChevronRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-80 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {blogs.map((b, i) => <BlogCard key={b.id} blog={b} index={i} />)}
          </div>
        )}
      </div>
    </section>
  );
}
