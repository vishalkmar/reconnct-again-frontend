import { Link } from 'react-router-dom';
import { imageOf, expHref, categoryLabel } from '../../../utils/format';
import { CategoryBadge, PriceLine, LocationLine } from './parts';

/*
  Overlay deal card — photo fills the card, dark gradient at the bottom carries
  price / location / title in white, amber pill top-left.
*/
export default function OverlayDealCard({ item, width = 270, height = 290 }) {
  return (
    <Link
      to={expHref(item)}
      className="group relative block rounded-2xl overflow-hidden bg-[#141425] focus:outline-none focus-visible:ring-2 focus-visible:ring-rc-brand"
      style={{ width, height }}
    >
      <img src={imageOf(item)} alt={item.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.05] transition duration-700" />
      <div className="rc-scrim absolute inset-0" />
      <CategoryBadge label={categoryLabel(item)} className="absolute top-2.5 left-2.5" />
      <div className="absolute left-3 right-3 bottom-3.5">
        <PriceLine item={item} light size={17} />
        <LocationLine city={item.city} light />
        <h3 className="font-sans text-white text-sm font-extrabold leading-[17px] mt-1 line-clamp-2">{item.name}</h3>
      </div>
    </Link>
  );
}
