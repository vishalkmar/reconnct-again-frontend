/*
  One source of truth for "is this experience complete enough to submit?".
  Every field is mandatory EXCEPT the video URL. Returns the FIRST missing
  field's friendly message (so the form can toast exactly what's left), or null
  when everything's filled. Used by the BD/admin form, the host & supplier web
  forms, and (mirrored) the mobile app.
*/
const has = (v) => v !== null && v !== undefined && String(v).trim() !== '';
const hasArr = (v) => Array.isArray(v) && v.length > 0;
// A rich-text block counts as filled only if it has real text, not just tags.
const richHas = (html) => has(String(html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim());

// `a` is the nested activity shape (categoryIds/pricing/b2cPricing/…).
// forReview → also enforce the 6-photos rule; photoCount lets callers pass a
// combined (cover + gallery) count.
export function validateExperience(a = {}, { forReview = true, photoCount = null } = {}) {
  if (!has(a.name)) return 'Please add the experience title';
  if (!hasArr(a.categoryIds)) return 'Please pick at least one broad category';
  if (!hasArr(a.typeIds)) return 'Please pick at least one type of activity / event';
  if (!has(a.location)) return 'Please add the location';
  if (!has(a.city)) return 'Please add the city';
  if (!has(a.pincode)) return 'Please add the pincode';
  if (!has(a.nearbyLocation)) return 'Please add the nearby location';
  if (!richHas(a.about)) return 'Please add the “About this experience” description';

  if (!(Number(a.pricing?.adultPrice) > 0)) return 'Please set the B2B adult price';
  if (!(Number(a.b2cPricing?.adultPrice) > 0)) return 'Please set the B2C adult price';
  if (!has(a.sourceName)) return 'Please add the Source name';

  const dur = a.pricing?.duration || {};
  if (!(Number(dur.hours) > 0 || Number(dur.minutes) > 0)) return 'Please set the session duration';

  if (!hasArr((a.inclusions || []).filter((x) => (typeof x === 'string' ? x.trim() : x)))) return 'Please add at least one inclusion';
  if (!hasArr(a.facilities)) return 'Please add at least one facility';
  if (!hasArr((a.nearbyPlaces || []).filter((p) => p && p.name && String(p.name).trim()))) return 'Please add at least one nearby place';
  if (!(a.schedule && hasArr(a.schedule.dates))) return 'Please add availability — pick dates and time slots';
  if (!hasArr((a.faqs || []).filter((f) => f && (f.question || f.answer)))) return 'Please add at least one FAQ';

  if (!richHas(a.termsConditions)) return 'Please add the Terms & Conditions';
  if (!richHas(a.privacyPolicy)) return 'Please add the Privacy Policy';
  if (!richHas(a.refundCancellationPolicy)) return 'Please add the Refund & Cancellation Policy';

  const pc = photoCount != null
    ? photoCount
    : ((a.mainImage ? 1 : 0) + (Array.isArray(a.gallery) ? a.gallery.filter(Boolean).length : 0));
  if (forReview) {
    if (pc < 6) return `Please add at least 6 photos — you have ${pc}`;
  } else if (pc < 1) {
    return 'Please add a cover photo';
  }
  return null;
}

export default validateExperience;
