import { useRef, useState } from 'react';
import { Video, Link2, UploadCloud, X, Plus, Loader2, Youtube } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';

/**
 * "Add video" field for the experience form. Each video is stored as
 * { kind: 'youtube' | 'file', url }. You can:
 *   - paste a YouTube / Vimeo / direct video URL, or
 *   - upload (click or drag-drop) a video file (instant → Cloudinary URL).
 * Controlled via `value` (array) + `onChange(nextArray)`.
 */
const ytId = (url) => {
  const m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  return m ? m[1] : null;
};

export default function MediaVideosField({ value = [], onChange }) {
  const list = Array.isArray(value) ? value : [];
  const inputRef = useRef(null);
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const add = (item) => {
    if (!item?.url) return;
    if (list.some((v) => v.url === item.url)) { toast('Already added'); return; }
    onChange([...list, item]);
  };
  const removeAt = (i) => onChange(list.filter((_, idx) => idx !== i));

  const addUrl = () => {
    const u = url.trim();
    if (!u) return;
    if (!/^https?:\/\//i.test(u)) { toast.error('Enter a valid http(s) link'); return; }
    add({ kind: ytId(u) ? 'youtube' : 'file', url: u });
    setUrl('');
  };

  const uploadFiles = async (files) => {
    const vids = Array.from(files || []).filter((f) => f.type.startsWith('video/'));
    if (!vids.length) return;
    setUploading(true);
    try {
      for (const f of vids) {
        try {
          const fd = new FormData();
          fd.append('file', f);
          const res = await api.post('/uploads/inline', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          const u = res.data?.data?.url;
          if (u) add({ kind: 'file', url: u });
        } catch { toast.error(`Failed to upload ${f.name}`); }
      }
      toast.success('Video uploaded');
    } finally { setUploading(false); }
  };

  return (
    <div>
      {/* URL row */}
      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-1">
          <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }}
            placeholder="Paste a YouTube / video link…"
            className="input pl-8"
          />
        </div>
        <button type="button" onClick={addUrl} className="inline-flex items-center gap-1.5 px-4 rounded-lg bg-brand text-ink font-semibold">
          <Plus size={16} /> Add
        </button>
      </div>

      {/* Upload / drop box */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); uploadFiles(e.dataTransfer?.files); }}
        className={`border-2 border-dashed rounded-xl p-4 cursor-pointer transition flex items-center justify-center gap-2 text-sm ${
          dragOver ? 'border-brand bg-brand/5 text-brand' : 'border-slate-300 text-ink-muted hover:border-brand hover:bg-surface-alt/50'
        }`}
      >
        {uploading ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
        {uploading ? 'Uploading video…' : 'Or drag & drop a video file, or click to upload'}
        <input ref={inputRef} type="file" accept="video/*" multiple className="hidden"
          onChange={(e) => { uploadFiles(e.target.files); e.target.value = ''; }} />
      </div>

      {/* Previews */}
      {list.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
          {list.map((v, i) => {
            const id = v.kind === 'youtube' ? ytId(v.url) : null;
            return (
              <div key={`${v.url}:${i}`} className="relative group rounded-lg overflow-hidden border bg-slate-900 aspect-video">
                {id ? (
                  <img src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`} alt="" className="w-full h-full object-cover" />
                ) : (
                  <video src={fileUrl(v.url)} className="w-full h-full object-cover" muted />
                )}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {id ? <Youtube className="text-white/90" size={26} /> : <Video className="text-white/90" size={24} />}
                </div>
                <button type="button" onClick={() => removeAt(i)}
                  className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition">
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
