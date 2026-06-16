import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Clock, Trophy } from 'lucide-react';
import { fileUrl } from '../../services/api';
import WishlistButton from './WishlistButton.jsx';
import useRequireLogin from '../../hooks/useRequireLogin.js';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function EventCard({ event, variant = 'horizontal' }) {
  const isSport = !!event.eventType?.isSport;
  const detailHref = `/events/${event.slug}`;
  const Overlay = (
    <Link
      to={detailHref}
      aria-label={`View ${event.name}`}
      tabIndex={-1}
      className="absolute inset-0 z-10"
    />
  );

  if (variant === 'vertical') {
    return (
      <article className="relative bg-white rounded-2xl shadow-card overflow-hidden hover:shadow-lg transition group">
        {Overlay}
        <div className="relative aspect-[16/10] bg-slate-100">
          {event.mainImage ? (
            <img
              src={fileUrl(event.mainImage)}
              alt={event.name}
              className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-ink-muted">
              <Calendar />
            </div>
          )}
          {event.isFeatured && (
            <span className="absolute top-3 left-3 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-1 rounded-full z-20">
              FEATURED
            </span>
          )}
          {isSport && (
            <span className="absolute top-3 right-3 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full inline-flex items-center gap-1 z-20">
              <Trophy size={10} /> SLOT BOOKING
            </span>
          )}
          <WishlistButton type="event" id={event.id} className="bottom-3 right-3" />
        </div>
        <div className="p-4">
          <Body event={event} isSport={isSport} detailHref={detailHref} />
        </div>
      </article>
    );
  }

  return (
    <article className="relative bg-white rounded-2xl shadow-card overflow-hidden flex flex-col md:flex-row hover:shadow-lg transition group">
      {Overlay}
      <div className="relative md:w-64 h-56 md:h-auto shrink-0 bg-slate-100">
        {event.mainImage ? (
          <img
            src={fileUrl(event.mainImage)}
            alt={event.name}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-muted">
            <Calendar />
          </div>
        )}
        {event.isFeatured && (
          <span className="absolute top-3 left-3 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-1 rounded-full z-20">
            FEATURED
          </span>
        )}
        {isSport && (
          <span className="absolute top-3 right-3 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full inline-flex items-center gap-1 z-20">
            <Trophy size={10} /> SLOT BOOKING
          </span>
        )}
        <WishlistButton type="event" id={event.id} className="bottom-3 right-3" />
      </div>

      <div className="flex-1 p-5 flex flex-col">
        <Body event={event} isSport={isSport} detailHref={detailHref} expanded />
      </div>
    </article>
  );
}

function Body({ event, isSport, detailHref, expanded }) {
  const navigate = useNavigate();
  const requireLogin = useRequireLogin();
  const handleBook = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const target = `/book/event/${event.id}`;
    requireLogin(() => navigate(target), { redirectTo: target });
  };
  return (
    <>
      <h3 className="font-display font-semibold text-lg leading-snug group-hover:text-brand transition line-clamp-2">
        {event.name}
      </h3>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted mt-1">
        {event.location?.name && (
          <span className="inline-flex items-center gap-1">
            <MapPin size={12} /> {event.location.name}
          </span>
        )}
        {event.eventDate && (
          <span className="inline-flex items-center gap-1">
            <Calendar size={12} /> {formatDate(event.eventDate)}
          </span>
        )}
        {(event.startTime || event.endTime) && (
          <span className="inline-flex items-center gap-1">
            <Clock size={12} /> {event.startTime || ''}{event.endTime ? ` – ${event.endTime}` : ''}
          </span>
        )}
        {event.eventType?.name && (
          <span className="inline-flex items-center gap-1 text-brand">
            <Trophy size={12} /> {event.eventType.name}
          </span>
        )}
      </div>

      {expanded && event.highlightsRich && (
        <div
          className="text-sm text-ink-muted mt-2 line-clamp-2 rich-prose"
          dangerouslySetInnerHTML={{ __html: event.highlightsRich }}
        />
      )}

      <div className="mt-auto pt-3 flex items-end justify-between gap-2">
        <div>
          <div>
            <span className="text-xl font-bold text-brand">
              {event.currency} {Number(event.price).toLocaleString()}
            </span>
            {event.priceOriginal && Number(event.priceOriginal) > Number(event.price) && (
              <span className="ml-2 line-through text-ink-muted text-sm">
                {Number(event.priceOriginal).toLocaleString()}
              </span>
            )}
          </div>
          {(event.minAge || event.maxAge) && (
            <div className="text-[11px] text-ink-muted">Age {event.minAge || 0}–{event.maxAge || '∞'}</div>
          )}
        </div>
        <div className="relative z-20 flex flex-col gap-2 items-stretch">
          <Link
            to={detailHref}
            onClick={(e) => e.stopPropagation()}
            className="btn-outline text-xs whitespace-nowrap"
          >
            Details
          </Link>
          <button
            type="button"
            onClick={handleBook}
            className="btn-primary text-xs whitespace-nowrap"
          >
            {isSport ? 'Book slot' : 'Book now'}
          </button>
        </div>
      </div>
    </>
  );
}
