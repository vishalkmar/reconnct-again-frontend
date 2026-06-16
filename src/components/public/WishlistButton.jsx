import { Heart } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext.jsx';

/**
 * Reusable wishlist heart. Drop in anywhere we surface a bookable item.
 *
 *   <WishlistButton type="package" id={pkg.id} />
 *
 * The component handles the anonymous case (opens the login modal via
 * useUserAuth), the optimistic toggle, the rollback on error, and the toast.
 *
 *   variant
 *     'floating' (default) — small circular button overlaid on a card image
 *     'inline'             — bare icon with no surface, useful inside CTA rows
 *     'pill'               — text + heart, used on detail pages
 */
export default function WishlistButton({
  type,
  id,
  variant = 'floating',
  size = 16,
  className = '',
  ariaLabel = 'Save to wishlist',
  stopPropagation = true,
}) {
  const { isWished, toggle } = useWishlist();
  const wished = isWished(type, id);

  const onClick = (e) => {
    if (stopPropagation) {
      e.preventDefault();
      e.stopPropagation();
    }
    toggle(type, id);
  };

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        aria-pressed={wished}
        className={`inline-flex items-center justify-center transition ${
          wished ? 'text-rose-500' : 'text-ink-muted hover:text-rose-500'
        } ${className}`}
      >
        <Heart size={size} className={wished ? 'fill-rose-500' : ''} />
      </button>
    );
  }

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        aria-pressed={wished}
        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full border transition text-sm font-medium ${
          wished
            ? 'border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100'
            : 'border-gray-200 hover:border-rose-300 hover:text-rose-500'
        } ${className}`}
      >
        <Heart size={size} className={wished ? 'fill-rose-500 text-rose-500' : ''} />
        {wished ? 'Wishlisted' : 'Wishlist'}
      </button>
    );
  }

  // floating (default)
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={wished}
      className={`absolute z-20 w-9 h-9 rounded-full flex items-center justify-center shadow transition ${
        wished
          ? 'bg-rose-500 text-white hover:bg-rose-600'
          : 'bg-white/90 hover:bg-white text-ink'
      } ${className}`}
    >
      <Heart size={size} className={wished ? 'fill-white' : ''} />
    </button>
  );
}
