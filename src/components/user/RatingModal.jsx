import { useEffect, useState } from 'react';
import { X, Star, Loader2, PartyPopper } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';

/**
 * Shared rate-and-review popup — used both as the manual "Rate Experience"
 * action on a completed booking, and as the Home page's automatic prompt.
 * Mirrors the app's RatingModal exactly (App/reconnct/src/components/RatingModal.jsx)
 * so the behaviour and copy stay identical across platforms.
 *
 * `variant="auto"` adds the "Stop showing" + top-right X (closes for this
 * browser session only, no server call) chrome the auto-popup needs;
 * `variant="manual"` keeps it to stars + comment + Submit/Cancel.
 */
export default function RatingModal({ open, variant = 'manual', booking, onClose, onDismissForever, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) { setRating(0); setHover(0); setComment(''); setDone(false); }
  }, [open, booking && booking.bookingCode]);

  if (!open || !booking) return null;
  const name = booking.itemName || (booking.item && booking.item.name) || 'this experience';
  const img = booking.itemImage || (booking.item && (booking.item.image || booking.item.mainImage));

  const submit = async () => {
    if (!rating) { toast.error('Please pick a star rating.'); return; }
    setSubmitting(true);
    try {
      const res = await api.post(`/bookings/${booking.bookingCode}/review`, { rating, comment: comment.trim() || undefined });
      setDone(true);
      onSubmitted?.(res.data?.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit your review.');
    } finally {
      setSubmitting(false);
    }
  };

  const stopShowing = async () => {
    setDismissing(true);
    try { await api.post(`/bookings/${booking.bookingCode}/review/dismiss`); } catch { /* ignore */ }
    setDismissing(false);
    onDismissForever?.();
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        {variant === 'auto' && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-surface-alt hover:bg-slate-200 flex items-center justify-center text-ink-muted"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        )}

        {done ? (
          <div className="text-center py-3">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <PartyPopper size={30} />
            </div>
            <h3 className="font-display font-bold text-lg text-ink">Thanks for rating!</h3>
            <p className="text-sm text-ink-muted mt-1">Congrats — your review for {name} has been posted.</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full py-2.5 rounded-lg bg-brand text-white font-semibold hover:brightness-110"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {img && <img src={fileUrl(img)} alt="" className="w-full h-28 object-cover rounded-xl mb-4" />}
            <h3 className="font-display font-bold text-lg text-ink text-center">Rate your experience</h3>
            <p className="text-sm text-ink-muted text-center mt-0.5 mb-4">{name}</p>

            <div className="flex items-center justify-center gap-1.5 mb-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  className="p-0.5"
                  aria-label={`${n} star`}
                >
                  <Star size={30} className={(hover || rating) >= n ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} />
                </button>
              ))}
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Share a few words about your experience (optional)"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none text-sm resize-none"
            />

            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="mt-4 w-full py-2.5 rounded-lg bg-brand text-white font-semibold hover:brightness-110 disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />} Submit
            </button>

            {variant === 'auto' ? (
              <button
                type="button"
                onClick={stopShowing}
                disabled={dismissing}
                className="mt-2.5 w-full text-center text-xs font-semibold text-ink-muted hover:text-brand py-1"
              >
                {dismissing ? 'Please wait…' : 'Stop showing this'}
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="mt-2.5 w-full text-center text-xs font-semibold text-ink-muted hover:text-brand py-1"
              >
                Cancel
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
