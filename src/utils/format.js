import { fileUrl } from '../services/api';

/*
  Display helpers for the public landing site — same output as the mobile
  app's utils/format.js + api/client.js so prices and images read identically
  on both platforms.
*/

// ₹12,500 — Indian digit grouping.
export function formatMoney(value, currency = 'INR') {
  const n = Math.round(Number(value) || 0);
  const sign = n < 0 ? '-' : '';
  const s = String(Math.abs(n));
  let out;
  if (s.length <= 3) {
    out = s;
  } else {
    const last3 = s.slice(-3);
    const rest = s.slice(0, -3);
    out = `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}`;
  }
  const symbol = currency === 'INR' ? '₹' : (currency ? `${currency} ` : '');
  return `${sign}${symbol}${out}`;
}

// The app's decorative "was" price on deal cards: price × 1.48, rounded to 50.
export const strikePrice = (price) => (price ? Math.round((price * 1.48) / 50) * 50 : 0);

export const DUMMY_IMAGE = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&q=70&auto=format&fit=crop';

// Ask the image CDNs for WebP/AVIF at a sensible width — a big win on phones:
//   Unsplash   → auto=format
//   Cloudinary → /upload/f_auto,q_auto,c_limit,w_<width>/ (only when the URL
//                carries no transformation of its own yet)
export const optimizeImg = (url, width = 800) => {
  if (!url) return url;
  if (/images\.unsplash\.com/.test(url) && !/[?&]auto=/.test(url)) {
    return `${url}${url.includes('?') ? '&' : '?'}auto=format&fit=crop`;
  }
  const m = url.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/);
  if (m && !/^[a-z]{1,3}_[^/]*\//.test(m[2])) return `${m[1]}f_auto,q_auto,c_limit,w_${width}/${m[2]}`;
  return url;
};

/** Relative /uploads/... path → absolute URL (null when empty). */
export const resolveImage = (url, width) => (url ? optimizeImg(fileUrl(url), width) : null);

// srcset for a CDN image at several widths (Cloudinary / Unsplash only) so
// phones download a phone-sized file. Returns undefined for other hosts.
export const srcSetFor = (url, widths = [640, 1000, 1400]) => {
  const abs = url ? fileUrl(url) : null;
  if (!abs) return undefined;
  if (/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(abs)) {
    return widths.map((w) => `${optimizeImg(abs, w)} ${w}w`).join(', ');
  }
  if (/images\.unsplash\.com/.test(abs)) {
    return widths.map((w) => `${optimizeImg(abs.replace(/([?&])w=\d+/, `$1w=${w}`))} ${w}w`).join(', ');
  }
  return undefined;
};

export const imageOf = (item) => resolveImage(item && item.mainImage) || DUMMY_IMAGE;

// A listing carries EVERY category it was tagged with — `category` alone is
// just the first one (app rule).
export const categoriesOf = (e) => (Array.isArray(e?.categories) && e.categories.length
  ? e.categories
  : (e?.category ? [e.category] : []));

export const categoryLabel = (e) => (e?.category && e.category.name) || 'Cultural';

export const expHref = (e) => `/experiences/${e.slug || e.id}`;

export const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};
