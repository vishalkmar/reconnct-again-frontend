import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapPin, Calendar, PartyPopper } from 'lucide-react';
import api, { fileUrl } from '../../services/api';
import { CATEGORIES, AUDIENCE_OPTIONS, categoryLabel } from '../../config/eventActivitySchema.js';

export default function EventActivitiesListPage() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || '';
  const audience = params.get('audience') || '';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = {};
    if (category) q.category = category;
    if (audience) q.audience = audience.toLowerCase();
    api.get('/event-activities', { params: q })
      .then((r) => setItems(r.data?.data?.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [category, audience]);

  const setFilter = (key, val) => {
    const next = new URLSearchParams(params);
    if (val) next.set(key, val); else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <div className="container-app py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold">Events &amp; Activities</h1>
        <p className="text-ink-muted mt-1">Find the perfect experience — by category and who it's for.</p>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2 mb-3">
        <Chip active={!category} onClick={() => setFilter('category', '')}>All</Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c.value} active={category === c.value} onClick={() => setFilter('category', c.value)}>{c.label}</Chip>
        ))}
      </div>
      {/* Audience chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        <span className="text-sm text-ink-muted self-center mr-1">Who is it for:</span>
        <Chip small active={!audience} onClick={() => setFilter('audience', '')}>Anyone</Chip>
        {AUDIENCE_OPTIONS.map((a) => (
          <Chip key={a} small active={audience.toLowerCase() === a.toLowerCase()} onClick={() => setFilter('audience', a)}>{a}</Chip>
        ))}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[4/3] rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-ink-muted">
          <PartyPopper size={40} className="mx-auto mb-3 opacity-60" />
          <p>No events found for this filter.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map((e) => <EventCard key={e.id} e={e} />)}
        </div>
      )}
    </div>
  );
}

function EventCard({ e }) {
  return (
    <Link to={`/events-activities/${e.slug}`} className="card group overflow-hidden flex flex-col">
      <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
        {e.thumbnail || e.mainBanner ? (
          <img src={fileUrl(e.thumbnail || e.mainBanner)} alt={e.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
        ) : <div className="w-full h-full flex items-center justify-center text-ink-muted"><PartyPopper size={28} /></div>}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand/10 text-brand font-semibold w-max">{categoryLabel(e.category)}</span>
        <h3 className="font-semibold leading-tight line-clamp-2 mt-2 group-hover:text-brand">{e.title}</h3>
        {(e.city || e.venueName) && (
          <p className="text-xs text-ink-muted mt-1 flex items-center gap-1"><MapPin size={11} /> {[e.venueName, e.city].filter(Boolean).join(', ')}</p>
        )}
        {e.startDate && (
          <p className="text-xs text-ink-muted mt-0.5 flex items-center gap-1"><Calendar size={11} /> {e.startDate}</p>
        )}
        <div className="mt-auto pt-3 text-sm">
          {e.isPaid && Number(e.adultPrice) > 0 ? (
            <span className="font-bold text-brand">{e.currency} {Number(e.adultPrice).toLocaleString()}</span>
          ) : <span className="font-semibold text-emerald-600">Free</span>}
        </div>
      </div>
    </Link>
  );
}

function Chip({ active, small, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`rounded-full border font-medium transition ${small ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'} ${active ? 'border-brand bg-brand text-white' : 'border-slate-200 text-ink-muted hover:border-brand/50'}`}>
      {children}
    </button>
  );
}
