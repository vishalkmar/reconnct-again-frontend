import { Plus, Trash2, Type, ImagePlus } from 'lucide-react';
import RichTextEditor from './RichTextEditor.jsx';
import Dropzone from './Dropzone.jsx';

/**
 * Inclusions editor. Each item is EITHER a text block OR a title+image — never
 * both. A per-item toggle switches the kind; only the chosen kind's fields are
 * active (the other is hidden/disabled).
 * Stored as [{ kind:'text'|'title_image', text, title, image }].
 */
export default function ExperienceInclusions({ value = [], onChange }) {
  const list = Array.isArray(value) ? value : [];
  const update = (i, patch) => onChange(list.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const remove = (i) => onChange(list.filter((_, idx) => idx !== i));
  const add = () => onChange([...list, { kind: 'text', text: '', title: '', image: '' }]);

  return (
    <div className="space-y-3">
      {list.map((it, i) => {
        const isImage = it.kind === 'title_image';
        return (
          <div key={i} className="bg-surface-alt rounded-xl p-3">
            <div className="flex items-center justify-between mb-3">
              {/* Mutually-exclusive kind toggle */}
              <div className="inline-flex rounded-lg border border-gray-200 bg-white overflow-hidden text-sm">
                <button type="button" onClick={() => update(i, { kind: 'text' })}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 transition ${!isImage ? 'bg-brand text-ink font-semibold' : 'text-ink-muted hover:bg-surface-alt'}`}>
                  <Type size={13} /> Text
                </button>
                <button type="button" onClick={() => update(i, { kind: 'title_image' })}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 transition ${isImage ? 'bg-brand text-ink font-semibold' : 'text-ink-muted hover:bg-surface-alt'}`}>
                  <ImagePlus size={13} /> Title + image
                </button>
              </div>
              <button type="button" onClick={() => remove(i)} className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg"><Trash2 size={15} /></button>
            </div>

            {isImage ? (
              <div className="space-y-2">
                <input className="input" value={it.title || ''} placeholder="Inclusion title (e.g. All meals included)"
                  onChange={(e) => update(i, { title: e.target.value })} />
                <Dropzone
                  instant
                  value={it.image || ''}
                  onChange={(url) => update(i, { image: url })}
                  existingUrl={it.image || ''}
                  onClearExisting={() => update(i, { image: '' })}
                  placeholder="Add an image — drag & drop, click, or paste a link"
                />
              </div>
            ) : (
              <RichTextEditor value={it.text || ''} onChange={(v) => update(i, { text: v })} placeholder="Describe what's included…" minHeight={140} />
            )}
          </div>
        );
      })}

      <button type="button" onClick={add} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <Plus size={14} /> Add inclusion
      </button>
    </div>
  );
}
