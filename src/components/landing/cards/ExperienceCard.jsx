import { Link } from 'react-router-dom';
import { MapPin, Star, Clock, Users } from 'lucide-react';
import { formatMoney, imageOf, expHref } from '../../../utils/format';
import { WishHeart, IMG_BG } from './parts';

/*
  Grid experience card (image-top, details-below) — the app's ExperienceCard:
  heart top-right, dark category badge bottom-left, distance chip bottom-right,
  then title / city / rating + price / duration + capacity.
*/
export default function ExperienceCard({ item, className = '', imageClass = 'h-[140px]' }) {
  return (
    <Link to={expHref(item)} className={`group block bg-white rounded-2xl overflow-hidden shadow-soft hover:shadow-card transition focus:outline-none focus-visible:ring-2 focus-visible:ring-rc-brand ${className}`}>
      <div className="relative overflow-hidden">
        <img src={imageOf(item)} alt={item.name} loading="lazy" className={`w-full object-cover ${IMG_BG} ${imageClass} group-hover:scale-[1.03] transition duration-500`} />
        <WishHeart item={item} className="absolute top-2 right-2" />
        {!!item.category?.name && (
          <span className="absolute bottom-2 left-2 max-w-[70%] truncate bg-black/55 text-white text-[11px] font-semibold px-2 py-0.5 rounded-lg">
            {item.category.name}
          </span>
        )}
        {item.distanceKm != null && (
          <span className="absolute bottom-2 right-2 flex items-center gap-1 bg-white/90 text-rc-ink text-[11px] font-bold px-2 py-0.5 rounded-lg">
            <MapPin size={11} className="text-rc-ink-muted" />{item.distanceKm} km
          </span>
        )}
      </div>
      <div className="p-2.5">
        <h3 className="font-sans text-sm font-bold text-rc-navy leading-[18px] line-clamp-2">{item.name}</h3>
        {!!item.city && (
          <div className="flex items-center gap-1 mt-1 text-xs text-rc-ink-muted">
            <MapPin size={11} /><span className="truncate">{item.city}</span>
          </div>
        )}
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center gap-1 text-xs">
            <Star size={12} className="fill-rc-brand text-rc-brand" />
            <span className="font-bold text-rc-ink">{Number(item.rating || 0).toFixed(1)}</span>
            {item.reviewsCount ? <span className="text-rc-ink-muted">({item.reviewsCount})</span> : null}
          </div>
          <span className="text-sm font-black text-rc-brand-dark">
            {item.fromPrice ? formatMoney(item.fromPrice, item.currency) : 'Contact'}
          </span>
        </div>
        {(!!item.durationLabel || !!item.capacity) && (
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-rc-ink-muted">
            {!!item.durationLabel && <span className="flex items-center gap-1"><Clock size={11} />{item.durationLabel}</span>}
            {!!item.capacity && <span className="flex items-center gap-1"><Users size={11} />Up to {item.capacity}</span>}
          </div>
        )}
      </div>
    </Link>
  );
}
