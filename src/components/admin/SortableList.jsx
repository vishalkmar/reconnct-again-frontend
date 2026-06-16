import { useRef, useState } from 'react';
import { GripVertical } from 'lucide-react';

/**
 * SortableList — drag-and-drop reordering for any list of admin items.
 *
 * Built on the HTML5 drag-and-drop API so it has no external dependencies.
 * Visual cues:
 *   - hover row → grip handle goes brand-coloured
 *   - while dragging → row dims
 *   - drop target → blue accent line above the target row
 *
 * Usage:
 *   <SortableList
 *     items={items}                // array with `.id`
 *     onReorder={(newItems) => …}  // called with the reordered array
 *     renderItem={(item, helpers) => <YourRow item={item} {...helpers} />}
 *     className="card divide-y"
 *   />
 *
 * The `helpers` argument exposes a `dragHandleProps` you spread onto the
 * grip element so only that element starts a drag (not the whole row).
 * Or use the simpler API: pass `wholeRowDraggable` and the row itself
 * becomes the drag source.
 */
export default function SortableList({
  items,
  onReorder,
  renderItem,
  className = '',
  rowClassName = '',
  emptyState = null,
  showHandle = true,
  wholeRowDraggable = false,
}) {
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const [overPos, setOverPos] = useState('above'); // 'above' | 'below'

  // Track a stable id list so we can compute the new order on drop without
  // depending on the latest closure of `items`.
  const idsRef = useRef([]);
  idsRef.current = items.map((it) => it.id);

  const reorderTo = (sourceId, targetId, position) => {
    if (sourceId === targetId) return;
    const ids = idsRef.current.slice();
    const from = ids.indexOf(sourceId);
    if (from < 0) return;
    ids.splice(from, 1);
    let to = ids.indexOf(targetId);
    if (to < 0) to = ids.length;
    if (position === 'below') to += 1;
    ids.splice(to, 0, sourceId);

    const byId = new Map(items.map((it) => [it.id, it]));
    onReorder?.(ids.map((id) => byId.get(id)).filter(Boolean));
  };

  const handleProps = (id) => ({
    draggable: true,
    onDragStart: (e) => {
      setDragId(id);
      // Some browsers require dataTransfer to be set or no drag begins.
      try { e.dataTransfer.setData('text/plain', String(id)); } catch { /* ignore */ }
      e.dataTransfer.effectAllowed = 'move';
    },
    onDragEnd: () => {
      setDragId(null);
      setOverId(null);
    },
  });

  const rowDropProps = (id) => ({
    onDragOver: (e) => {
      if (dragId === null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const rect = e.currentTarget.getBoundingClientRect();
      const isAbove = e.clientY - rect.top < rect.height / 2;
      setOverId(id);
      setOverPos(isAbove ? 'above' : 'below');
    },
    onDragLeave: (e) => {
      // Only clear if we left the row entirely (not a child)
      if (e.currentTarget === e.target) {
        setOverId((curr) => (curr === id ? null : curr));
      }
    },
    onDrop: (e) => {
      e.preventDefault();
      if (dragId == null) return;
      reorderTo(dragId, id, overPos);
      setDragId(null);
      setOverId(null);
    },
  });

  if (!items?.length) return emptyState;

  return (
    <div className={className} role="list">
      {items.map((item, index) => {
        const isDragging = dragId === item.id;
        const showLine = overId === item.id && dragId !== null && dragId !== item.id;

        const rowProps = wholeRowDraggable
          ? { ...handleProps(item.id), ...rowDropProps(item.id) }
          : rowDropProps(item.id);

        const helpers = {
          index,
          isDragging,
          dragHandleProps: !wholeRowDraggable && showHandle ? handleProps(item.id) : null,
          DragHandle: showHandle && !wholeRowDraggable ? () => (
            <DragHandle dragHandleProps={handleProps(item.id)} />
          ) : null,
        };

        return (
          <div
            key={item.id}
            role="listitem"
            {...rowProps}
            className={`relative ${rowClassName} ${isDragging ? 'opacity-40' : ''}`}
          >
            {showLine && overPos === 'above' && (
              <div className="absolute -top-px left-0 right-0 h-0.5 bg-brand z-10 rounded" />
            )}
            {renderItem(item, helpers)}
            {showLine && overPos === 'below' && (
              <div className="absolute -bottom-px left-0 right-0 h-0.5 bg-brand z-10 rounded" />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Standalone grip handle component for renderers that prefer a dedicated import. */
export function DragHandle({ dragHandleProps, className = '' }) {
  return (
    <button
      type="button"
      title="Drag to reorder"
      aria-label="Drag to reorder"
      {...dragHandleProps}
      className={`cursor-grab active:cursor-grabbing text-slate-400 hover:text-brand transition p-1 -m-1 rounded ${className}`}
    >
      <GripVertical size={18} />
    </button>
  );
}
