import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import api from '../../services/api';
import BlogCard from '../../components/public/BlogCard.jsx';

export default function BlogsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [blogs, setBlogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    search: searchParams.get('search') || '',
    page: parseInt(searchParams.get('page') || '1', 10),
  });

  const [searchInput, setSearchInput] = useState(filters.search);

  useEffect(() => {
    api.get('/blog-categories')
      .then((res) => setCategories(res.data?.data?.items || []))
      .catch(() => {});
  }, []);

  const queryString = useMemo(() => {
    const params = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined) params[k] = v;
    });
    return params;
  }, [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/blogs', { params: { ...queryString, limit: 9 } });
      setBlogs(res.data?.data?.items || []);
      setPagination(res.data?.data?.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    load();
    const sp = new URLSearchParams();
    Object.entries(queryString).forEach(([k, v]) => sp.set(k, v));
    setSearchParams(sp, { replace: true });
  }, [load, queryString, setSearchParams]);

  const update = (k, v) => setFilters((f) => ({ ...f, [k]: v, page: 1 }));

  const onSearch = (e) => {
    e.preventDefault();
    update('search', searchInput.trim());
  };

  const featured = blogs[0];
  const rest = blogs.slice(1);

  return (
    <>
      {/* Header band */}
      <div className="bg-gradient-to-br from-brand via-brand-dark to-wellness text-white">
        <div className="container-app py-12 md:py-20 text-center">
          <h1 className="text-3xl md:text-5xl font-display font-bold drop-shadow">
            Stories &amp; Wellness Tips
          </h1>
          <p className="mt-3 opacity-90 max-w-2xl mx-auto">
            Travel stories, wellness science, retreat reflections — straight from our team and guests.
          </p>

          <form onSubmit={onSearch} className="mt-8 max-w-xl mx-auto flex bg-white rounded-full overflow-hidden shadow-lg">
            <input
              type="text"
              placeholder="Search articles…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1 px-5 py-3 text-ink focus:outline-none"
            />
            <button type="submit" className="bg-brand text-white px-6 hover:bg-brand-dark transition">
              <Search size={18} />
            </button>
          </form>
        </div>
      </div>

      <div className="container-app py-10">
        {/* Category chips */}
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-8 justify-center">
            <button
              onClick={() => update('category', '')}
              className={`text-sm px-4 py-1.5 rounded-full border-2 transition ${
                !filters.category ? 'bg-brand text-white border-brand' : 'bg-white border-slate-200 hover:border-brand'
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => update('category', c.slug)}
                className={`text-sm px-4 py-1.5 rounded-full border-2 transition ${
                  filters.category === c.slug
                    ? 'bg-brand text-white border-brand'
                    : 'bg-white border-slate-200 hover:border-brand'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {filters.search && (
          <div className="mb-6 flex items-center gap-2 text-sm">
            <span className="text-ink-muted">Showing results for</span>
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-white border rounded-full">
              "{filters.search}"
              <button
                onClick={() => { setSearchInput(''); update('search', ''); }}
                className="text-ink-muted hover:text-red-600"
              >
                <X size={14} />
              </button>
            </span>
          </div>
        )}

        {loading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : blogs.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-ink-muted">No blogs match your filters.</p>
            <Link to="/blogs" className="btn-outline mt-4 inline-flex">View all blogs</Link>
          </div>
        ) : (
          <>
            {pagination.page === 1 && featured && (
              <div className="mb-10">
                <BlogCard blog={featured} variant="large" />
              </div>
            )}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rest.map((b) => <BlogCard key={b.id} blog={b} />)}
            </div>
          </>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-10">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
              className="btn-outline text-sm disabled:opacity-50"
            >Previous</button>
            <span className="text-sm">
              Page <strong>{pagination.page}</strong> / {pagination.pages}
            </span>
            <button
              disabled={pagination.page >= pagination.pages}
              onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
              className="btn-outline text-sm disabled:opacity-50"
            >Next</button>
          </div>
        )}
      </div>
    </>
  );
}
