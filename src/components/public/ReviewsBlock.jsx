import { useState } from 'react';
import { Star, Send, Quote } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

/**
 * Reusable review block for public detail pages.
 *
 * Renders a list of approved reviews followed by a submission form. Works for
 * any reviewable entity (`package` | `event` | `hotel`) — see the unified
 * Review controller on the backend for the contract.
 *
 * Props:
 *   entityType  — 'package' | 'event' | 'hotel'
 *   entityId    — numeric primary key of the entity
 *   reviews     — array of approved reviews (already loaded by the parent)
 *   reviewCount — total reviews count (rendered in heading)
 *   averageRating — optional average to render alongside the heading
 */
export default function ReviewsBlock({
  entityType,
  entityId,
  reviews = [],
  reviewCount,
  averageRating,
}) {
  const safeReviews = Array.isArray(reviews) ? reviews : [];
  const total = typeof reviewCount === 'number' ? reviewCount : safeReviews.length;
  const showAvg = Number(averageRating) > 0;

  return (
    <section className="card p-6">
      <header className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h3 className="font-display font-bold text-2xl flex items-center gap-2">
            Guest Reviews
            <span className="text-sm font-semibold text-ink-muted">
              ({total})
            </span>
          </h3>
          {showAvg && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="inline-flex items-center gap-1 text-amber-500">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    size={15}
                    className={n <= Math.round(Number(averageRating)) ? 'fill-current' : 'opacity-30'}
                  />
                ))}
              </span>
              <span className="text-sm font-semibold text-ink">
                {Number(averageRating).toFixed(2)}
              </span>
              <span className="text-xs text-ink-muted">/ 5</span>
            </div>
          )}
        </div>
      </header>

      {safeReviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-surface-alt p-8 text-center">
          <Quote size={28} className="mx-auto text-brand/40 mb-2" />
          <p className="text-sm text-ink-muted">
            Be the first to share your experience. Your story helps other travellers.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {safeReviews.slice(0, 6).map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      )}

      <ReviewForm entityType={entityType} entityId={entityId} />
    </section>
  );
}

function ReviewCard({ review }) {
  const initial = (review.name || '?').charAt(0).toUpperCase();
  return (
    <article className="rounded-xl border bg-white p-4 hover:shadow-sm transition">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand to-emerald-500 text-white flex items-center justify-center font-bold text-sm">
          {initial}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-sm leading-tight truncate">
            {review.name}
          </div>
          <div className="flex items-center gap-0.5 text-amber-500 mt-0.5">
            {Array.from({ length: review.rating }).map((_, i) => (
              <Star key={i} size={11} className="fill-current" />
            ))}
          </div>
        </div>
      </div>
      {review.title && (
        <h4 className="font-semibold text-sm mb-0.5 line-clamp-1">{review.title}</h4>
      )}
      {review.comment && (
        <p className="text-sm text-ink-muted leading-relaxed line-clamp-4">
          {review.comment}
        </p>
      )}
    </article>
  );
}

function ReviewForm({ entityType, entityId }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hoverStar, setHoverStar] = useState(0);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !comment.trim()) return toast.error('Name and comment are required');
    setSubmitting(true);
    try {
      await api.post('/reviews', {
        entityType,
        entityId,
        name: name.trim(),
        email: email.trim() || undefined,
        rating,
        title: title.trim() || undefined,
        comment: comment.trim(),
      });
      toast.success('Thanks! Your review will appear once approved.');
      setName(''); setEmail(''); setRating(5); setTitle(''); setComment('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submit failed — please retry');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-6 pt-6 border-t">
      <h4 className="font-display font-bold text-lg mb-1">Leave a review</h4>
      <p className="text-sm text-ink-muted mb-4">
        Reviews are moderated for authenticity. Yours will go live after a quick check.
      </p>
      <form onSubmit={submit} className="space-y-3 bg-surface-alt rounded-2xl p-5">
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            className="input"
            placeholder="Your name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
          />
          <input
            className="input"
            type="email"
            placeholder="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={160}
          />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-ink-muted">Your rating</span>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => {
              const active = (hoverStar || rating) >= n;
              return (
                <button
                  key={n}
                  type="button"
                  onMouseEnter={() => setHoverStar(n)}
                  onMouseLeave={() => setHoverStar(0)}
                  onClick={() => setRating(n)}
                  className={`p-1 transition ${active ? 'text-amber-500' : 'text-slate-300 hover:text-amber-300'}`}
                  aria-label={`${n} star${n === 1 ? '' : 's'}`}
                >
                  <Star size={22} className={active ? 'fill-current' : ''} />
                </button>
              );
            })}
          </div>
        </div>
        <input
          className="input"
          placeholder="Headline (optional, e.g. 'Best wellness break I've had')"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={160}
        />
        <textarea
          className="input"
          rows={4}
          placeholder="Share your experience… what stood out, what you'd recommend?"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          required
        />
        <button disabled={submitting} className="btn-primary text-sm">
          <Send size={14} /> {submitting ? 'Submitting…' : 'Submit review'}
        </button>
      </form>
    </div>
  );
}
