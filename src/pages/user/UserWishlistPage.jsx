import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart, Loader2, Trash2, MapPin, Calendar, Users, Bed, Sparkles, Trophy, Hotel as HotelIcon, Compass,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import { useWishlist } from '../../context/WishlistContext.jsx';

const TYPE_LABELS = {
  package: 'Retreats',
  room: 'Hotel Rooms',
  event: 'Events',
  addon: 'Add-on Activities',
  experience: 'Experiences',
};

const TYPE_ICONS = {
  package: Sparkles,
  room: Bed,
  event: Trophy,
  addon: HotelIcon,
  experience: Compass,
};

export default function UserWishlistPage() {
  const { refresh } = useWishlist();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [removingId, setRemovingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/wishlist');
      setItems(res.data?.data?.items || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load wishlist');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRemove = async (item) => {
    setRemovingId(item.wishlistId);
    try {
      await api.delete('/wishlist', { data: { entityType: item.type, entityId: item.id }, params: { entityType: item.type, entityId: item.id } });
      setItems((prev) => prev.filter((x) => x.wishlistId !== item.wishlistId));
      refresh();
      toast.success('Removed from wishlist');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove');
    } finally {
      setRemovingId(null);
    }
  };

  const filtered = filter === 'all' ? items : items.filter((i) => i.type === filter);

  const counts = items.reduce((acc, i) => {
    acc[i.type] = (acc[i.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Heart className="text-rose-500" /> Wishlist
            {items.length > 0 && <span className="text-base text-ink-muted font-medium">({items.length})</span>}
          </h1>
          <p className="text-sm text-ink-muted mt-1">Your saved retreats, rooms, events, add-ons and experiences — book any of them in one click.</p>
        </div>
      </div>

      {/* Filter pills */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <FilterPill active={filter === 'all'} onClick={() => setFilter('all')} label={`All (${items.length})`} />
          {Object.entries(counts).map(([type, c]) => (
            <FilterPill
              key={type}
              active={filter === type}
              onClick={() => setFilter(type)}
              label={`${TYPE_LABELS[type]} (${c})`}
            />
          ))}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl shadow-soft p-16 text-center">
          <Loader2 className="animate-spin mx-auto text-brand" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-10 text-center text-ink-muted">
          Nothing saved in this category yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((item) => (
            <WishlistCard
              key={item.wishlistId}
              item={item}
              onRemove={() => handleRemove(item)}
              removing={removingId === item.wishlistId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterPill({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition ${
        active
          ? 'bg-brand text-white border-brand shadow-soft'
          : 'border-gray-200 text-ink hover:border-brand/40 hover:text-brand bg-white'
      }`}
    >
      {label}
    </button>
  );
}

function WishlistCard({ item, onRemove, removing }) {
  const Icon = TYPE_ICONS[item.type] || Heart;
  const discount =
    item.priceOriginal && item.priceOriginal > item.price
      ? Math.round(((item.priceOriginal - item.price) / item.priceOriginal) * 100)
      : 0;

  return (
    <article className="bg-white rounded-2xl shadow-soft overflow-hidden flex flex-col group hover:shadow-card transition">
      <div className="relative aspect-[16/10] bg-slate-100">
        {item.image ? (
          <img
            src={fileUrl(item.image)}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-muted">
            <Icon size={36} />
          </div>
        )}
        <span className="absolute top-3 left-3 inline-flex items-center gap-1 bg-white/95 backdrop-blur text-ink text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full shadow">
          <Icon size={11} /> {TYPE_LABELS[item.type] || item.type}
        </span>
        {discount > 0 && (
          <span className="absolute top-3 right-3 bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow">
            {discount}% OFF
          </span>
        )}
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-white/95 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center shadow transition disabled:opacity-60"
          aria-label="Remove from wishlist"
        >
          {removing ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
        </button>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-display font-semibold text-base leading-snug line-clamp-2">
          {item.name}
        </h3>
        {item.type === 'room' && item.hotel?.name && (
          <div className="text-xs text-ink-muted mt-0.5 flex items-center gap-1">
            <HotelIcon size={12} /> {item.hotel.name}
          </div>
        )}
        {item.location && (
          <div className="text-xs text-ink-muted mt-1 flex items-center gap-1">
            <MapPin size={12} /> {item.location}
          </div>
        )}

        <Meta item={item} />

        <div className="mt-auto pt-3 border-t border-slate-100 flex items-end justify-between gap-2">
          <div>
            <div className="text-[10px] text-ink-muted uppercase tracking-wide">From</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-brand">
                {item.currency} {Number(item.price).toLocaleString()}
              </span>
              {item.priceOriginal && (
                <span className="text-xs line-through text-ink-muted">
                  {Number(item.priceOriginal).toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 items-stretch">
            {item.detailHref && item.type !== 'experience' && (
              <Link to={item.detailHref} className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-surface-alt text-ink text-center transition">
                View
              </Link>
            )}
            <Link
              to={`/book/${item.type}/${item.id}`}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand text-white hover:brightness-110 text-center transition"
            >
              Book now
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function Meta({ item }) {
  const m = item.meta || {};
  if (item.type === 'package') {
    return (
      <div className="text-[11px] text-ink-muted mt-1.5 flex items-center gap-2">
        {(m.durationDays > 0 || m.durationNights > 0) && (
          <span>{m.durationDays}d · {m.durationNights}n</span>
        )}
      </div>
    );
  }
  if (item.type === 'room') {
    return (
      <div className="text-[11px] text-ink-muted mt-1.5 flex items-center gap-2 flex-wrap">
        {m.roomSize && <span>{m.roomSize}</span>}
        {m.maxOccupancy && (
          <span className="inline-flex items-center gap-1"><Users size={11} /> {m.maxOccupancy}</span>
        )}
      </div>
    );
  }
  if (item.type === 'event') {
    return (
      <div className="text-[11px] text-ink-muted mt-1.5 flex items-center gap-2 flex-wrap">
        {m.eventDate && <span className="inline-flex items-center gap-1"><Calendar size={11} /> {formatDate(m.eventDate)}</span>}
        {m.eventTypeName && <span>· {m.eventTypeName}</span>}
      </div>
    );
  }
  if (item.type === 'addon') {
    return (
      <div className="text-[11px] text-ink-muted mt-1.5 flex items-center gap-2">
        {(m.minAge || m.maxAge) && (
          <span className="inline-flex items-center gap-1"><Users size={11} /> Age {m.minAge || 0}–{m.maxAge || '∞'}</span>
        )}
      </div>
    );
  }
  return null;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl shadow-soft p-10 text-center">
      <div className="inline-flex w-14 h-14 rounded-full bg-rose-50 text-rose-600 items-center justify-center mb-4">
        <Heart size={26} />
      </div>
      <h2 className="font-semibold text-lg text-ink">Your wishlist is empty</h2>
      <p className="text-sm text-ink-muted mt-1 max-w-md mx-auto">
        Tap the heart on any retreat, hotel room, event or add-on to save it here for one-click booking later.
      </p>
      <Link to="/retreats" className="inline-block mt-5 px-5 py-2.5 rounded-lg bg-brand text-white font-medium hover:brightness-110 transition">
        Start exploring
      </Link>
    </div>
  );
}
