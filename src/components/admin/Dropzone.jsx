import { useEffect, useRef, useState } from 'react';
import { UploadCloud, X, FileVideo, Link2, Clipboard } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';

// Global rule: every image upload on the platform must be under 5MB (videos
// keep their own, more generous limit — this check only applies to images).
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_MB = 5;

/**
 * Reusable upload dropzone — click-to-pick, drag-and-drop, paste an image
 * from the clipboard, AND paste an image URL (server-proxied so CORS can't
 * block it). New picks are **appended** in multiple mode (never replace the
 * previous selection) and each can be removed individually.
 *
 * Props:
 *   accept         — MIME pattern, default 'image/*'
 *   multiple       — allow multiple files (default false)
 *   value          — current File / File[] selection (controlled)
 *   onChange       — (file | files[]) => void
 *   existingUrl    — string URL (single) of already-saved media to preview
 *   existingUrls   — array of URLs (multiple)
 *   placeholder    — main label text
 *   subLabel       — secondary text
 *   className      — extra classes for outer wrapper
 *   onClearExisting — optional callback when user clicks "X" on existing item
 *   allowLink      — show the "paste image link" row (default true)
 */
export default function Dropzone({
  accept = 'image/*',
  multiple = false,
  value,
  onChange,
  existingUrl,
  existingUrls = [],
  placeholder,
  subLabel,
  className = '',
  onClearExisting,
  allowLink = true,
  // Instant mode: upload each pick to the server immediately and emit URL
  // string(s) instead of File objects. URLs survive a page refresh (they're
  // stored in the persisted form draft) and are already saved server-side.
  instant = false,
}) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [fetchingLink, setFetchingLink] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isVideoMode = accept.includes('video');

  // In instant mode the value is URL string(s); otherwise File object(s).
  const selectedUrls = instant
    ? (multiple ? (Array.isArray(value) ? value : []) : (value ? [value] : []))
    : [];
  const selectedFiles = instant ? [] : (multiple
    ? (Array.isArray(value) ? value : [])
    : (value ? [value] : []));

  const uploadOne = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await api.post('/uploads/inline', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data?.data?.url;
  };

  const appendUrls = (urls) => {
    const list = urls.filter(Boolean);
    if (!list.length) return;
    if (multiple) {
      const existing = Array.isArray(value) ? value : [];
      const set = new Set(existing);
      onChange?.([...existing, ...list.filter((u) => !set.has(u))]);
    } else {
      onChange?.(list[0]);
    }
  };

  // De-dupe by name+size so re-picking the same file doesn't double it.
  const appendFiles = async (incoming) => {
    let list = Array.from(incoming).filter(Boolean);
    if (!list.length) return;
    if (!isVideoMode) {
      const oversized = list.filter((f) => f.size > MAX_IMAGE_BYTES);
      if (oversized.length) {
        oversized.forEach((f) => toast.error(`"${f.name}" is ${(f.size / (1024 * 1024)).toFixed(1)}MB — images must be smaller than ${MAX_IMAGE_MB}MB.`));
        list = list.filter((f) => f.size <= MAX_IMAGE_BYTES);
      }
      if (!list.length) return;
    }
    if (instant) {
      setUploading(true);
      try {
        const urls = [];
        for (const f of list) {
          try { const u = await uploadOne(f); if (u) urls.push(u); }
          catch { toast.error(`Failed to upload ${f.name || 'image'}`); }
        }
        appendUrls(urls);
        if (urls.length) toast.success(`Uploaded ${urls.length} image${urls.length > 1 ? 's' : ''}`);
      } finally {
        setUploading(false);
      }
      return;
    }
    if (multiple) {
      const seen = new Set(selectedFiles.map((f) => `${f.name}:${f.size}`));
      const merged = [...selectedFiles];
      list.forEach((f) => {
        const key = `${f.name}:${f.size}`;
        if (!seen.has(key)) { seen.add(key); merged.push(f); }
      });
      onChange?.(merged);
    } else {
      onChange?.(list[0]);
    }
  };

  const handleFiles = (fileList) => {
    if (!fileList?.length) return;
    appendFiles(fileList);
  };

  const onDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = (e) => { e.preventDefault(); setDragOver(false); };
  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer?.files);
  };

  // Paste a copied image straight onto the dropzone (Ctrl/Cmd+V while focused).
  const onPaste = (e) => {
    const items = e.clipboardData?.items || [];
    const files = [];
    for (const it of items) {
      if (it.kind === 'file' && it.type.startsWith(isVideoMode ? 'video/' : 'image/')) {
        const f = it.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length) {
      e.preventDefault();
      appendFiles(files);
      toast.success(`Pasted ${files.length} image${files.length > 1 ? 's' : ''}`);
      return;
    }
    // If the clipboard holds a URL, treat it as a link to fetch.
    const text = e.clipboardData?.getData('text');
    if (text && /^https?:\/\/\S+$/i.test(text.trim())) {
      e.preventDefault();
      setLinkOpen(true);
      addFromUrl(text.trim());
    }
  };

  // Turn a pasted/entered image URL into a File via the same-origin proxy so
  // it rides the normal upload path (works for any host, CORS-proof).
  const addFromUrl = async (rawUrl) => {
    const url = (rawUrl ?? linkUrl).trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) { toast.error('Enter a valid http(s) link'); return; }
    // In instant mode a link is already a hosted URL — just store it.
    if (instant) {
      appendUrls([url]);
      setLinkUrl('');
      toast.success('Image added from link');
      return;
    }
    setFetchingLink(true);
    try {
      const res = await api.get('/uploads/proxy-image', {
        params: { url },
        responseType: 'blob',
      });
      const blob = res.data;
      const ext = (blob.type && blob.type.split('/')[1]) || 'jpg';
      const name = `linked-${Date.now()}.${ext.split('+')[0]}`;
      const file = new File([blob], name, { type: blob.type || 'image/jpeg' });
      appendFiles([file]);
      setLinkUrl('');
      toast.success('Image added from link');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load that image link');
    } finally {
      setFetchingLink(false);
    }
  };

  const hasSelection = instant ? selectedUrls.length > 0 : selectedFiles.length > 0;

  const Icon = isVideoMode ? FileVideo : UploadCloud;

  const removeOne = (idx) => {
    if (instant) {
      if (multiple) onChange?.(selectedUrls.filter((_, i) => i !== idx));
      else onChange?.('');
      return;
    }
    if (multiple) {
      onChange?.(selectedFiles.filter((_, i) => i !== idx));
    } else {
      onChange?.(null);
    }
  };

  return (
    <div className={className}>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onPaste={onPaste}
        className={`relative border-2 border-dashed rounded-xl p-6 cursor-pointer transition flex flex-col items-center justify-center text-center min-h-[140px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 ${
          dragOver
            ? 'border-brand bg-brand/5 ring-4 ring-brand/20 scale-[1.01]'
            : 'border-slate-300 hover:border-brand hover:bg-surface-alt/50'
        }`}
        role="button"
        tabIndex={0}
      >
        <Icon
          size={dragOver ? 36 : 30}
          className={`mb-2 transition ${dragOver ? 'text-brand' : 'text-ink-muted'}`}
        />
        <div className={`text-sm font-medium ${dragOver ? 'text-brand' : 'text-ink'}`}>
          {uploading
            ? 'Uploading…'
            : dragOver
              ? 'Drop to upload'
              : (hasSelection
                  ? `${(instant ? selectedUrls : selectedFiles).length} file${(instant ? selectedUrls : selectedFiles).length > 1 ? 's' : ''} selected${multiple ? ' · add more anytime' : ''}`
                  : (placeholder || (multiple ? 'Drag & drop files, or click to browse' : 'Drag & drop a file, or click to browse')))}
        </div>
        <p className="text-xs text-ink-muted mt-1">
          {subLabel || (isVideoMode ? 'Videos: MP4, WebM, MOV (max 50MB)' : `Images: JPG, PNG, WebP, GIF, SVG · max ${MAX_IMAGE_MB}MB`)}
          {' · '}<span className="inline-flex items-center gap-0.5"><Clipboard size={10} /> paste works too</span>
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
        />
      </div>

      {/* Paste / add an image link */}
      {allowLink && (
        <div className="mt-2">
          {!linkOpen ? (
            <button
              type="button"
              onClick={() => setLinkOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
            >
              <Link2 size={13} /> Add image from a link
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFromUrl(); } }}
                placeholder="https://…/image.jpg — paste a link"
                className="input flex-1 text-sm"
                autoFocus
              />
              <button
                type="button"
                onClick={() => addFromUrl()}
                disabled={fetchingLink || !linkUrl.trim()}
                className="btn-primary whitespace-nowrap text-sm disabled:opacity-50"
              >
                {fetchingLink ? 'Adding…' : (multiple ? 'Add' : 'Set')}
              </button>
              {multiple && (
                <button
                  type="button"
                  onClick={() => { setLinkUrl(''); }}
                  className="text-xs text-ink-muted hover:underline whitespace-nowrap"
                  title="Clear input to add another"
                >
                  Add more
                </button>
              )}
              <button
                type="button"
                onClick={() => { setLinkOpen(false); setLinkUrl(''); }}
                className="p-1 text-ink-muted hover:text-red-500"
                title="Close"
              >
                <X size={15} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Selected previews — uploaded URLs (instant) or local Files */}
      {hasSelection && instant && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
          {selectedUrls.map((u, i) => (
            <div key={`${u}:${i}`} className="relative group rounded-lg overflow-hidden border bg-slate-100 aspect-[4/3]">
              <img src={fileUrl(u)} className="w-full h-full object-cover" alt="" />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeOne(i); }}
                className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      {hasSelection && !instant && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
          {selectedFiles.map((f, i) => (
            <FilePreview key={`${f.name}:${f.size}:${i}`} file={f} onRemove={() => removeOne(i)} />
          ))}
        </div>
      )}

      {/* Existing already-uploaded preview (single) */}
      {!hasSelection && existingUrl && !multiple && (
        <div className="mt-3 relative inline-block group">
          <img src={fileUrl(existingUrl)} className="w-32 h-24 rounded-lg border object-cover" alt="" />
          {onClearExisting && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClearExisting(); }}
              className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition"
              title="Remove"
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {/* Existing multiple */}
      {!hasSelection && existingUrls.length > 0 && multiple && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">
          {existingUrls.map((u, i) => (
            <div key={i} className="rounded-lg overflow-hidden border bg-slate-100 aspect-[4/3]">
              <img src={fileUrl(u)} className="w-full h-full object-cover" alt="" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Isolated preview so each object URL is created once and revoked on unmount
// (no leaks, no flicker on re-render).
function FilePreview({ file, onRemove }) {
  const [url, setUrl] = useState('');
  const isVideo = file.type?.startsWith('video/');
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <div className="relative group rounded-lg overflow-hidden border bg-slate-100 aspect-[4/3]">
      {url && (isVideo ? (
        <video src={url} className="w-full h-full object-cover" muted />
      ) : (
        <img src={url} className="w-full h-full object-cover" alt={file.name} />
      ))}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition"
      >
        <X size={12} />
      </button>
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1.5 py-0.5 truncate">
        {file.name}
      </div>
    </div>
  );
}
