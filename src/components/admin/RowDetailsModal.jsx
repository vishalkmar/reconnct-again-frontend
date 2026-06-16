import { useEffect } from 'react';
import { X } from 'lucide-react';
import { fileUrl } from '../../services/api';

/**
 * Generic, read-only "view details" modal. Pass any record object and it
 * renders every meaningful field in a clean two-column sheet — booleans as
 * Yes/No, image URLs as thumbnails, rich-text as rendered HTML, nested
 * objects/arrays summarised. Used by the eye button across all admin lists so
 * the whole record can be inspected without opening the edit form.
 *
 * Props:
 *   open, onClose
 *   title     — heading (e.g. record name)
 *   data      — the record object
 *   hidden    — extra keys to skip (besides the internal defaults)
 */
const DEFAULT_HIDDEN = new Set([
  'id', 'createdAt', 'updatedAt', 'deletedAt', 'password',
  'sortOrder', 'ownerId', 'auditorId', 'assignedOfficerId',
]);

const humanize = (key) =>
  key
    .replace(/Rich$/, '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .replace(/\bUrl\b/i, 'URL')
    .replace(/\bId\b/i, 'ID')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();

const looksLikeImage = (key, val) =>
  typeof val === 'string' &&
  (/image|photo|avatar|logo|thumb|primaryimage|mainimage|^url$/i.test(key) ||
    /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(val)) &&
  /^(https?:\/\/|\/)/.test(val);

const looksLikeDate = (key, val) =>
  typeof val === 'string' && /At$|Date$/.test(key) && /^\d{4}-\d{2}-\d{2}/.test(val);

const isRich = (key) => /Rich$|descriptionHtml$|contentHtml$/.test(key);
// Any string that actually carries HTML markup should render as HTML, not be
// dumped with the tags showing (e.g. a package `description` full of <div>/<b>).
const looksLikeHtml = (val) => typeof val === 'string' && /<\/?[a-z][\s\S]*>/i.test(val);

// Pull image URLs out of an array (gallery rows {url}, plain URL strings, …).
const imageUrlsFrom = (arr) =>
  arr
    .map((v) => (v && typeof v === 'object' ? (v.url || v.imageUrl || v.image || v.src) : v))
    .filter((u) => typeof u === 'string' && /^(https?:\/\/|\/)/.test(u));

const isHtmlField = (keyName, value) => isRich(keyName) || looksLikeHtml(value);

function FieldValue({ keyName, value }) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-slate-400">—</span>;
  }
  if (typeof value === 'boolean') {
    return (
      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${value ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
        {value ? 'Yes' : 'No'}
      </span>
    );
  }
  if (looksLikeImage(keyName, value)) {
    return <img src={fileUrl(value)} alt="" className="h-28 w-44 rounded-lg border object-cover" />;
  }
  if (looksLikeDate(keyName, value)) {
    return <span>{new Date(value).toLocaleString()}</span>;
  }
  // Rich-text / HTML → render as actual formatted content.
  if (isHtmlField(keyName, value)) {
    return <div className="rich-prose max-h-72 overflow-auto rounded-lg border bg-slate-50 p-3 text-sm" dangerouslySetInnerHTML={{ __html: value }} />;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-slate-400">—</span>;
    // Gallery / image arrays → show the actual pictures.
    const imgs = imageUrlsFrom(value);
    if (imgs.length) {
      return (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {imgs.map((u, i) => (
            <img key={i} src={fileUrl(u)} alt="" className="aspect-[4/3] w-full rounded-lg border object-cover" />
          ))}
        </div>
      );
    }
    const names = value
      .map((v) => (v && typeof v === 'object' ? v.name || v.title || v.label : v))
      .filter(Boolean);
    if (names.length === 0) return <span className="text-slate-400">—</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {names.slice(0, 30).map((n, i) => (
          <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{String(n)}</span>
        ))}
        {names.length > 30 && <span className="text-[11px] text-slate-400">+{names.length - 30}</span>}
      </div>
    );
  }
  if (typeof value === 'object') {
    return <span>{value.name || value.title || value.label || JSON.stringify(value)}</span>;
  }
  // Long string → wrap; short → inline.
  return <span className="break-words whitespace-pre-wrap">{String(value)}</span>;
}

export default function RowDetailsModal({ open, onClose, title, data, hidden = [] }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !data) return null;

  const skip = new Set([...DEFAULT_HIDDEN, ...hidden]);
  const entries = Object.entries(data).filter(([k, v]) => {
    if (skip.has(k)) return false;
    if (typeof v === 'function') return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between gap-3 border-b px-5 py-3.5">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-ink-muted">Details</p>
            <h3 className="font-display font-semibold truncate">{title || data.name || data.title || 'Record'}</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-ink-muted" title="Close">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {entries.map(([k, v]) => (
              <div key={k} className={isHtmlField(k, v) || Array.isArray(v) ? 'sm:col-span-2' : ''}>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{humanize(k)}</dt>
                <dd className="mt-0.5 text-sm text-ink"><FieldValue keyName={k} value={v} /></dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="border-t px-5 py-3 flex justify-end">
          <button type="button" onClick={onClose} className="btn-ghost text-sm">Close</button>
        </div>
      </div>
    </div>
  );
}
