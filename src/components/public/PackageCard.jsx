import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin, Star, Calendar, ShieldCheck, Award, Flame,
  Moon, Sun, Sparkles, BadgePercent, Users,
} from 'lucide-react';
import { fileUrl } from '../../services/api';
import { fromPriceLabel, hasPrice } from '../../utils/price.js';
import { calculateTaxPricing, taxIncludedLabel } from '../../utils/taxPricing.js';
import WishlistButton from './WishlistButton.jsx';
import useRequireLogin from '../../hooks/useRequireLogin.js';

// shortDescription may now be rich-text HTML — strip tags for the card teaser.
const stripHtml = (s) =>
  (s || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

export default function PackageCard({ pkg }) {
  const navigate = useNavigate();
  const requireLogin = useRequireLogin();
  const handleBook = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const target = `/book/package/${pkg.id}`;
    requireLogin(() => navigate(target), { redirectTo: target });
  };
  const teaser = stripHtml(pkg.shortDescription);
  const reviewsLine =
    pkg.reviewCount > 0
      ? `${Number(pkg.rating).toFixed(1)} (${pkg.reviewCount} reviews)`
      : 'New';

  const orig = Number(pkg.priceOriginal || 0);
  const now = Number(pkg.priceFrom || 0);
  const taxPricing = calculateTaxPricing(now, pkg.gstRate, pkg.tcsRate);
  const discountPct = orig > now && orig > 0 ? Math.round(((orig - now) / orig) * 100) : 0;

  const locLabel = pkg.location?.name || pkg.city?.name || pkg.locationDetail;
  const detailHref = `/retreats/${pkg.slug}`;

  return (
    <article className="relative bg-white rounded-2xl shadow-card overflow-hidden flex flex-col md:flex-row hover:shadow-lg transition group">
      {/* Ghost link covers the whole card; interactive children sit above it. */}
      <Link
        to={detailHref}
        aria-label={`View ${pkg.name}`}
        tabIndex={-1}
        className="absolute inset-0 z-10"
      />

      <div className="relative md:w-72 h-56 md:h-auto shrink-0 bg-slate-100 overflow-hidden">
        {pkg.primaryImage ? (
          <img
            src={fileUrl(pkg.primaryImage)}
            alt={pkg.name}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-muted">
            <MapPin />
          </div>
        )}

        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start z-20">
          {discountPct > 0 && (
            <span className="inline-flex items-center gap-1 bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow">
              <BadgePercent size={11} /> {discountPct}% OFF
            </span>
          )}
          {pkg.isPopular && (
            <span className="bg-fuchsia-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow">
              POPULAR
            </span>
          )}
          {pkg.isFeatured && (
            <span className="bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-1 rounded-full shadow">
              FEATURED
            </span>
          )}
        </div>

        {pkg.isGoldHost && (
          <span className="absolute top-3 right-3 bg-amber-100 text-amber-800 text-[10px] font-semibold px-2 py-1 rounded-full inline-flex items-center gap-1 border border-amber-300 z-20">
            <Award size={12} /> Gold host
          </span>
        )}

        <WishlistButton type="package" id={pkg.id} className="bottom-3 right-3" />

        {Number(pkg.rating) > 0 && (
          <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 bg-emerald-600 text-white text-xs font-bold rounded-md px-2 py-1 shadow z-20">
            <Star size={11} className="fill-white" /> {Number(pkg.rating).toFixed(1)}
            {pkg.reviewCount > 0 && (
              <span className="opacity-90 font-normal">· {pkg.reviewCount}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 p-5 flex flex-col">
        <h3 className="font-display font-semibold text-lg leading-snug group-hover:text-brand transition line-clamp-2">
          {pkg.name}
        </h3>

        {locLabel && (
          <div className="text-sm text-ink-muted mt-1 flex items-center gap-1">
            <MapPin size={14} /> {locLabel}
          </div>
        )}

        <div className="text-xs text-ink-muted mt-2 flex items-center gap-3 flex-wrap">
          {(pkg.durationDays > 0 || pkg.durationNights > 0) && (
            <span className="inline-flex items-center gap-1 bg-brand/5 text-brand px-2 py-0.5 rounded-full font-medium">
              <Sun size={11} /> {pkg.durationDays}d
              <Moon size={11} className="ml-0.5" /> {pkg.durationNights}n
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Calendar size={12} /> {pkg.timing || (pkg.availableAllYear ? 'All year' : 'On request')}
          </span>
          {(pkg.minGroupSize || pkg.maxGroupSize) && (
            <span className="inline-flex items-center gap-1">
              <Users size={12} /> {pkg.minGroupSize}–{pkg.maxGroupSize}
            </span>
          )}
        </div>

        <div className="text-xs mt-1.5 flex items-center gap-3 flex-wrap">
          {pkg.interestedCount > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-600">
              <Flame size={12} /> {pkg.interestedCount} interested
            </span>
          )}
          {pkg.freeCancellation && (
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <ShieldCheck size={12} /> FREE Cancellation
            </span>
          )}
        </div>

        {teaser && (
          <p className="text-sm text-ink-muted mt-3 line-clamp-2 italic border-l-2 border-brand-light pl-3">
            “{teaser}”
          </p>
        )}

        {(pkg.categories?.length > 0 || pkg.activities?.length > 0) && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {(pkg.categories || []).slice(0, 3).map((c) => (
              <span key={`c-${c.id}`} className="text-[11px] px-2.5 py-0.5 rounded-full bg-wellness/10 text-wellness font-medium">
                {c.name}
              </span>
            ))}
            {(pkg.activities || []).slice(0, 2).map((a) => (
              <span key={`a-${a.id}`} className="text-[11px] px-2.5 py-0.5 rounded-full bg-brand/10 text-brand font-medium inline-flex items-center gap-1">
                <Sparkles size={10} /> {a.name}
              </span>
            ))}
            {((pkg.categories?.length || 0) + (pkg.activities?.length || 0)) > 5 && (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 text-ink-muted">
                +{(pkg.categories?.length || 0) + (pkg.activities?.length || 0) - 5} more
              </span>
            )}
          </div>
        )}

        <div className="mt-auto pt-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-t border-slate-100">
          <div>
            <div className="text-[11px] text-ink-muted uppercase tracking-wide">From</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-brand">
                {hasPrice(pkg.priceFrom)
                  ? `${pkg.currency || 'INR'} ${Math.round(taxPricing.total).toLocaleString()}`
                  : fromPriceLabel(pkg.priceFrom, pkg.currency)}
              </span>
              {hasPrice(pkg.priceFrom) && pkg.priceOriginal && Number(pkg.priceOriginal) > Number(pkg.priceFrom) && (
                <span className="text-sm line-through text-ink-muted">
                  {Number(pkg.priceOriginal).toLocaleString()}
                </span>
              )}
            </div>
            <div className="text-[10px] text-ink-muted">
              {hasPrice(pkg.priceFrom) && taxPricing.hasTaxes ? `${taxIncludedLabel(taxPricing)} · ` : ''}{reviewsLine}
            </div>
          </div>

          <div className="relative z-20 flex gap-2">
            <Link
              to={detailHref}
              onClick={(e) => e.stopPropagation()}
              className="btn-outline text-sm py-2 px-4"
            >
              Details
            </Link>
            <button
              type="button"
              onClick={handleBook}
              className="btn-primary text-sm py-2 px-5"
            >
              Book Now
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
