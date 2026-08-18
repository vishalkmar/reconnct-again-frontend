import DOMPurify from 'dompurify';

/*
  One sanitizer for every place we render stored HTML via
  dangerouslySetInnerHTML. Rich-text fields (an experience's About, inclusions,
  policies, blog bodies, …) are authored by hosts / suppliers / BD staff, so
  their HTML is UNTRUSTED — a malicious `<img onerror=…>` or `<script>` stored
  in one of those fields would otherwise run in an admin's browser (stored XSS).

  DOMPurify strips exactly those dangerous vectors — scripts, event-handler
  attributes, javascript:/data: URLs — while leaving ordinary formatting
  (headings, lists, links, images, line breaks, basic styling) completely
  intact, so nothing that legitimately renders today changes.

  `target="_blank"` links get rel="noopener" added so a sanitized link can't
  reach back into our window via window.opener.
*/

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

// Returns a safe HTML string. Null/'' pass straight through so callers that do
// `sanitizeHtml(value || '')` behave exactly as before.
export function sanitizeHtml(dirty) {
  if (dirty == null || dirty === '') return '';
  return DOMPurify.sanitize(String(dirty), { USE_PROFILES: { html: true } });
}

export default sanitizeHtml;
