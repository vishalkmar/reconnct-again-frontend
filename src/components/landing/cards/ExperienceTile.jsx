import { useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, MapPin, Star } from 'lucide-react';
import { iconForCategory } from '../../../utils/categoryIcons';
import {
  categoriesOf, imageOf, expHref, formatMoney, strikePrice,
} from '../../../utils/format';
import { WishHeart } from './parts';

/*
  Result card for /experiences. Photo on top with a tinted category pill and
  the wishlist heart; the white panel rises into the photo through a soft
  cloud-like curve. "Was" price / % OFF = the existing app rule (strikePrice).
*/
const PILL_TINTS = [
  [/adventure|explor/, 'bg-[#FFC629] text-rc-navy'],
  [/water|swim|cruise|sail|kayak|raft/, 'bg-[#DCEBFF] text-[#0B3B66]'],
  [/wellness|heal/, 'bg-[#FBD3EA] text-[#6B1D47]'],
  [/spiritual|heritage|culture/, 'bg-[#FFF3DD] text-[#5B3A12]'],
  [/food/, 'bg-[#C8F2D2] text-[#14532D]'],
  [/sport|fun/, 'bg-[#DCEBFF] text-[#0B3B66]'],
  [/art|creativ/, 'bg-[#E4D7FF] text-[#3B1E7A]'],
  [/learn|growth/, 'bg-[#D9F2F2] text-[#134E4A]'],
  [/relationship|communit|group|corporate/, 'bg-[#FFE0CC] text-[#7A2E0B]'],
];
// Food & Culture must read as food, so test the name in table order.
export const pillTint = (name) => (PILL_TINTS.find(([re]) => re.test((name || '').toLowerCase())) || [null, 'bg-white/95 text-rc-navy'])[1];

export default function ExperienceTile({ item }) {
  const navigate = useNavigate();
  const cat = categoriesOf(item)[0];
  const CatIcon = cat ? iconForCategory(cat.name) : null;
  const price = Number(item.fromPrice) || 0;
  const was = strikePrice(price);
  const off = price && was > price ? Math.round(((was - price) / was) * 100) : 0;
  const href = expHref(item);
  const rating = Number(item.rating || 0);

  return (
    <div
      onClick={() => navigate(href)}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(href); }}
      role="link"
      tabIndex={0}
      aria-label={`${item.name}${price ? `, ${formatMoney(price, item.currency)}` : ''}`}
      className="group relative flex flex-col h-full min-h-[372px] rounded-[20px] overflow-hidden bg-white shadow-[0_14px_34px_-20px_rgba(16,24,40,0.45)] hover:shadow-[0_24px_44px_-20px_rgba(16,24,40,0.5)] hover:-translate-y-1 transition duration-300 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-rc-brand/50"
    >
      <div className="relative h-[210px] sm:h-[200px] xl:h-[210px] overflow-hidden shrink-0">
        <img src={imageOf(item)} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.06] transition duration-700" />
        <span className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/25 to-transparent" aria-hidden="true" />
        {cat && (
          <span className={`absolute top-3.5 left-3.5 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-bold max-w-[72%] shadow-sm ${pillTint(cat.name)}`}>
            {CatIcon && <CatIcon size={15} className="shrink-0" />}<span className="truncate">{cat.name}</span>
          </span>
        )}
        <WishHeart item={item} size={36} className="absolute top-3.5 right-3.5" />
        {off > 0 && (
          <span className="absolute left-3.5 bottom-6 z-10 inline-flex items-center h-7 px-2.5 rounded-lg bg-[#FF2056] text-white text-xs font-extrabold tracking-wide shadow-[0_6px_14px_-6px_rgba(255,32,86,0.8)]">{off}% OFF</span>
        )}
        {/* Soft cloud edge — the panel rises into the photo on the right */}
        <svg viewBox="0 0 320 40" preserveAspectRatio="none" className="absolute inset-x-0 -bottom-px w-full h-9 text-white" aria-hidden="true">
          <path d="M0 40 L0 34 C 70 34, 150 34, 205 28 C 240 24, 252 6, 285 8 C 305 9, 314 18, 320 22 L320 40 Z" fill="currentColor" />
        </svg>
      </div>

      <div className="flex-1 flex flex-col px-4 pb-4 pt-1">
        <h3 className="font-sans text-[16px] sm:text-[17px] font-extrabold text-rc-navy leading-snug line-clamp-2">{item.name}</h3>
        {(item.distanceKm != null || item.city) && (
          <div className="flex items-center gap-1.5 text-[13px] text-rc-ink-muted mt-1">
            <MapPin size={14} className="shrink-0" /><span className="truncate">{item.distanceKm != null ? `${item.distanceKm} km away` : item.city}</span>
          </div>
        )}
        <div className="flex items-center gap-5 text-[13px] text-rc-ink mt-1.5">
          {!!item.durationLabel && <span className="flex items-center gap-1.5"><Clock size={15} className="text-rc-ink-muted" />{item.durationLabel}</span>}
          <span className="flex items-center gap-1.5"><Star size={15} className="text-rc-brand fill-rc-brand" />{rating ? rating.toFixed(1) : 'New'}{item.reviewsCount ? ` (${item.reviewsCount})` : ''}</span>
        </div>
        <div className="mt-auto pt-3 flex items-center justify-between gap-2">
          <div className="flex items-end gap-1.5 min-w-0 flex-wrap">
            <span className="text-[22px] sm:text-[24px] font-black text-rc-navy leading-none">{price ? formatMoney(price, item.currency) : 'Contact'}</span>
            {off > 0 && <span className="text-[13px] text-rc-ink-muted line-through decoration-[#FF2056]">{formatMoney(was, item.currency)}</span>}
            {!!price && <span className="text-[13px] text-rc-ink-muted">/{item.priceUnit || 'person'}</span>}
          </div>
          <span className="grid place-items-center w-11 h-11 rounded-full shrink-0 bg-rc-brand text-rc-navy shadow-[0_8px_18px_-8px_rgba(255,185,0,0.9)] group-hover:translate-x-0.5 transition">
            <ArrowRight size={20} />
          </span>
        </div>
      </div>
    </div>
  );
}
