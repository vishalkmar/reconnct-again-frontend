import { Link } from 'react-router-dom';
import { imageOf, expHref, categoryLabel } from '../../../utils/format';
import { CategoryBadge, PriceLine, LocationLine, IMG_BG } from './parts';

/*
  Clean deal card — no frame: square photo with the amber pill, then strike
  price → price → location → title in dark text on the page background.
*/
export default function CleanDealCard({ item, width = 170 }) {
  return (
    <Link to={expHref(item)} className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-rc-brand rounded-lg" style={{ width }}>
      <div className={`relative aspect-square rounded-lg overflow-hidden ${IMG_BG}`}>
        <img src={imageOf(item)} alt={item.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.04] transition duration-500" />
        <CategoryBadge label={categoryLabel(item)} className="absolute top-2.5 left-2.5" />
      </div>
      <div className="pt-2.5">
        <PriceLine item={item} size={17} strikeClass="text-rc-strike-dark" />
        <LocationLine city={item.city} />
        <h3 className="font-sans text-rc-navy text-sm font-extrabold leading-[17px] mt-1 line-clamp-2">{item.name}</h3>
      </div>
    </Link>
  );
}
