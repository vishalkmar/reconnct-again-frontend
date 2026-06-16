/**
 * Turn whatever an admin pastes into a Google Maps "map field" into a working
 * embeddable iframe `src`. Accepts:
 *   • a full <iframe …src="…"></iframe> embed tag (Google's "Embed a map"),
 *   • a bare embed URL,
 *   • any Google Maps share/place link,
 *   • a plain address or "lat,lng".
 * Returns '' when there's nothing usable.
 *
 * Rendering the extracted `src` in our own <iframe> (instead of dumping raw
 * HTML) guarantees consistent sizing and avoids the "map doesn't show" bug
 * where a pasted plain link never rendered as a map at all.
 */
export function mapEmbedSrc(raw) {
  if (!raw) return '';
  const s = String(raw).trim();
  if (!s) return '';

  // 1) Full iframe embed → pull the src out.
  const iframeSrc = s.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  if (iframeSrc) return iframeSrc[1];

  // 2) Already an embeddable URL (Google's /maps/embed or any ?output=embed).
  if (/\/maps\/embed/i.test(s) || /[?&]output=embed/i.test(s)) return s;

  // 3) Any other Google Maps URL, plain address, or "lat,lng" → keyless
  //    q-embed, which renders a map without a Maps API key.
  return `https://maps.google.com/maps?q=${encodeURIComponent(s)}&output=embed`;
}

export default mapEmbedSrc;
