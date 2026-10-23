import { Link } from 'react-router-dom';
import { MapPin, Star } from 'lucide-react';
import { formatMoney, imageOf, expHref } from '../../../utils/format';
import { WishHeart, IMG_BG } from './parts';

/*
  Compact card used by "Near you" (app TrendingNearYouCard): white category
  pill, heart, 2-line title, distance or city, rating + price.
*/
export default function NearYouCard({ item, width = 168 }) {
  return (
    <Link to={expHref(item)} className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-rc-brand rounded-2xl" style={{ width }}>
      <div className="relative rounded-2xl overflow-hidden">
        <img src={imageOf(item)} alt={item.name} loading="lazy" className={`w-full h-[118px] object-cover ${IMG_BG} group-hover:scale-[1.04] transition duration-500`} />
        {!!item.category?.name && (
          <span className="absolute top-2 left-2 max-w-[75%] truncate bg-white/95 text-rc-ink text-[10px] font-extrabold px-2 py-0.5 rounded-full">
            {item.category.name}
          </span>
        )}
        <WishHeart item={item} size={26} className="absolute top-2 right-2" />
      </div>
      <h3 className="font-sans text-[13px] font-extrabold text-rc-ink leading-4 mt-2 line-clamp-2">{item.name}</h3>
      {(item.distanceKm != null || !!item.city) && (
        <div className="flex items-center gap-1 mt-1 text-[11px] text-rc-ink-muted">
          <MapPin size={10} /><span className="truncate">{item.distanceKm != null ? `${item.distanceKm} km away` : item.city}</span>
        </div>
      )}
      <div className="flex items-center justify-between mt-1.5">
        <span className="flex items-center gap-1 text-[11px] font-bold text-rc-ink">
          <Star size={11} className="fill-rc-brand text-rc-brand" />{Number(item.rating || 0).toFixed(1)}
        </span>
        <span className="text-[13px] font-black text-rc-brand-dark truncate">
          {item.fromPrice ? formatMoney(item.fromPrice, item.currency) : 'Contact'}
        </span>
      </div>
    </Link>
  );
}
