import { Heart, MapPin } from 'lucide-react';
import { useWishlist } from '../../../context/WishlistContext.jsx';
import { formatMoney, strikePrice } from '../../../utils/format';

/*
  Shared bits for every landing card so badge / price / location look the same
  across card variants — web twin of App/reconnct/src/components/deals/parts.jsx.
*/

// Amber gradient pill on the image's top-left.
export function CategoryBadge({ label, className = '' }) {
  return (
    <span className={`rc-brand-grad inline-flex items-center h-5 px-2.5 rounded-[7px] text-[10px] font-black text-rc-navy max-w-[80%] truncate ${className}`}>
      {label || 'Cultural'}
    </span>
  );
}

// Crossed-out "was" price → price → /unit. `stacked` puts the strike on its own line.
export function PriceLine({ item, light = false, size = 16, strikeClass = 'text-rc-strike', stacked = false }) {
  const price = Number(item.fromPrice) || 0;
  const strike = strikePrice(price);
  const strikeEl = strike ? (
    <span className={`${strikeClass} text-[11px] font-bold line-through ${stacked ? 'block leading-tight' : 'mr-1.5'}`}>
      {formatMoney(strike, item.currency)}
    </span>
  ) : null;
  const main = (
    <>
      <span className={`font-bold leading-5 ${light ? 'text-white' : 'text-rc-navy'}`} style={{ fontSize: size }}>
        {price ? formatMoney(price, item.currency) : 'Contact'}
      </span>
      {!!price && (
        <span className={`text-[10px] ml-px ${light ? 'text-white/80' : 'text-[#7A7E8C]'}`}>/{item.priceUnit || 'person'}</span>
      )}
    </>
  );
  if (stacked) {
    return (
      <div>
        {strikeEl}
        <div className="flex items-end">{main}</div>
      </div>
    );
  }
  return <div className="flex items-end flex-wrap">{strikeEl}{main}</div>;
}

// Pin + city (or "N km away" when a distance is known).
export function LocationLine({ city, distanceKm, light = false }) {
  const text = distanceKm != null ? `${distanceKm} km away` : city;
  if (!text) return null;
  return (
    <div className={`flex items-center gap-1 mt-0.5 text-[11px] ${light ? 'text-white/85' : 'text-[#5A5E6C]'}`}>
      <MapPin size={11} className="shrink-0" />
      <span className="truncate">{text}</span>
    </div>
  );
}

// Wishlist heart — its own button so clicking it never follows the card link.
// Logged-out users get the OTP modal (WishlistContext handles that).
export function WishHeart({ item, size = 32, className = '' }) {
  const { isWished, toggle } = useWishlist();
  const wished = isWished('experience', item.id);
  return (
    <button
      type="button"
      aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'}
      aria-pressed={wished}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle('experience', item.id); }}
      className={`grid place-items-center rounded-full bg-white/95 shadow-soft hover:scale-105 transition ${className}`}
      style={{ width: size, height: size }}
    >
      <Heart size={Math.round(size / 2)} className={wished ? 'fill-rc-brand text-rc-brand' : 'text-rc-ink-muted'} />
    </button>
  );
}

// Grey image placeholder used while photos load.
export const IMG_BG = 'bg-[#DCE0E6]';
