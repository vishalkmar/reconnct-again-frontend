import { Plus, Trash2 } from 'lucide-react';
import RichTextEditor from './RichTextEditor.jsx';

/**
 * Editor for an array of strings (highlights, includes, excludes).
 */
export function StringListEditor({ value = [], onChange, placeholder = 'Add an item' }) {
  const update = (i, v) => {
    const next = [...value];
    next[i] = v;
    onChange(next);
  };
  const add = () => onChange([...(value || []), '']);
  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      {(value || []).map((v, i) => (
        <div key={i} className="flex gap-2">
          <input
            className="input flex-1"
            value={v}
            placeholder={placeholder}
            onChange={(e) => update(i, e.target.value)}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="px-3 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1 text-sm text-brand font-semibold hover:underline"
      >
        <Plus size={14} /> Add
      </button>
    </div>
  );
}

/**
 * Editor for itinerary: array of { day, title, description }
 */
export function ItineraryEditor({ value = [], onChange }) {
  const update = (i, key, v) => {
    const next = [...value];
    next[i] = { ...next[i], [key]: v };
    onChange(next);
  };
  const add = () => onChange([...(value || []), { day: (value?.length || 0) + 1, title: '', description: '' }]);
  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      {(value || []).map((item, i) => (
        <div key={i} className="bg-surface-alt p-3 rounded-xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-ink-muted w-12">Day</span>
            <input
              type="number"
              min={1}
              className="input w-20"
              value={item.day ?? i + 1}
              onChange={(e) => update(i, 'day', parseInt(e.target.value || 1, 10))}
            />
            <input
              className="input flex-1"
              value={item.title || ''}
              placeholder="Day title"
              onChange={(e) => update(i, 'title', e.target.value)}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
            >
              <Trash2 size={16} />
            </button>
          </div>
          <div>
            <span className="text-xs font-semibold text-ink-muted block mb-1">Description</span>
            <RichTextEditor
              value={item.description || ''}
              onChange={(v) => update(i, 'description', v)}
              placeholder="What happens this day? — formatting, lists, icons supported"
              minHeight={140}
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1 text-sm text-brand font-semibold hover:underline"
      >
        <Plus size={14} /> Add day
      </button>
    </div>
  );
}

/**
 * Editor for FAQs: array of { question, answer }
 */
export function FaqEditor({ value = [], onChange }) {
  const update = (i, key, v) => {
    const next = [...value];
    next[i] = { ...next[i], [key]: v };
    onChange(next);
  };
  const add = () => onChange([...(value || []), { question: '', answer: '' }]);
  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      {(value || []).map((item, i) => (
        <div key={i} className="bg-surface-alt p-3 rounded-xl space-y-2">
          <div className="flex gap-2">
            <input
              className="input flex-1"
              value={item.question || ''}
              placeholder="Question"
              onChange={(e) => update(i, 'question', e.target.value)}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="px-3 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
            >
              <Trash2 size={16} />
            </button>
          </div>
          <textarea
            className="input"
            rows={2}
            value={item.answer || ''}
            placeholder="Answer"
            onChange={(e) => update(i, 'answer', e.target.value)}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1 text-sm text-brand font-semibold hover:underline"
      >
        <Plus size={14} /> Add FAQ
      </button>
    </div>
  );
}
