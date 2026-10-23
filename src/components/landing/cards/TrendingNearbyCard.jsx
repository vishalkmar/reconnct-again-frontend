import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { imageOf, expHref, categoryLabel } from '../../../utils/format';
import { CategoryBadge, PriceLine, LocationLine, IMG_BG } from './parts';

/*
  "Trending Nearby" — white container (330 wide, radius 16, padding 15) with
  a header ("Trending Nearby · N Events ›") and three stacked 120 px rows.
*/
function TrendingRow({ item }) {
  return (
    <Link to={expHref(item)} className="group flex h-[120px] rounded-lg overflow-hidden bg-white hover:bg-rc-bg/60 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-rc-brand">
      <div className={`relative w-[120px] h-full shrink-0 rounded-lg overflow-hidden ${IMG_BG}`}>
        <img src={imageOf(item)} alt={item.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.05] transition duration-500" />
        <CategoryBadge label={categoryLabel(item)} className="absolute top-2 left-2" />
      </div>
      <div className="flex-1 min-w-0 px-2.5 py-2.5 flex flex-col justify-center">
        <PriceLine item={item} size={16} strikeClass="text-rc-strike-dark" stacked />
        <LocationLine city={item.city} />
        <h3 className="font-sans text-rc-navy text-sm font-bold leading-[18px] mt-1 line-clamp-2">{item.name}</h3>
      </div>
    </Link>
  );
}

export default function TrendingNearbyCard({ group, count, seeAllHref = '/experiences', width = 330 }) {
  return (
    <div className="bg-white rounded-2xl p-[15px] shadow-soft max-w-[calc(100vw-48px)]" style={{ width }}>
      <Link to={seeAllHref} className="flex items-center mb-4 group">
        <div className="flex-1">
          <div className="font-sans text-[17px] font-extrabold text-rc-navy">Trending Nearby</div>
          <div className="text-xs font-semibold text-[#7A7E8C] mt-0.5">{count} Events</div>
        </div>
        <ChevronRight size={22} className="text-rc-navy group-hover:translate-x-0.5 transition" />
      </Link>
      <div className="flex flex-col gap-2.5">
        {group.map((it, i) => <TrendingRow key={it.id || i} item={it} />)}
      </div>
    </div>
  );
}
