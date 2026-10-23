import { Link } from 'react-router-dom';
import { imageOf, expHref, categoryLabel } from '../../../utils/format';
import { CategoryBadge, PriceLine, LocationLine, IMG_BG } from './parts';

/*
  Framed deal card — Figma spec from the app: 170 wide, radius 16, padding
  10/10/20, navy gradient #305BA4 → #141425, image radius 8 (width − 20).
  `width` / `imageH` / `height` stay props so the focus + partner rails resize it.
*/
export default function FramedDealCard({ item, width = 170, imageH = 162, height, className = '' }) {
  return (
    <Link
      to={expHref(item)}
      className={`rc-deal-grad group block rounded-2xl overflow-hidden p-2.5 ${height ? 'flex flex-col justify-between' : 'pb-5'} focus:outline-none focus-visible:ring-2 focus-visible:ring-rc-brand ${className}`}
      style={{ width, height }}
    >
      <div className="relative rounded-lg overflow-hidden shrink-0" style={{ height: imageH }}>
        <img src={imageOf(item)} alt={item.name} loading="lazy" className={`w-full h-full object-cover ${IMG_BG} group-hover:scale-[1.04] transition duration-500`} />
        <CategoryBadge label={categoryLabel(item)} className="absolute top-2 left-2" />
      </div>
      <div className="mt-2.5">
        <PriceLine item={item} light size={16} />
        <LocationLine city={item.city} light />
        <h3 className="font-sans text-white text-sm font-extrabold leading-[17px] mt-1 line-clamp-2">{item.name}</h3>
      </div>
    </Link>
  );
}
