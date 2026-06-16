import { useEffect, useLayoutEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Pad single-digit month/day to two chars.
const pad = (n) => String(n).padStart(2, '0');

// Date <-> ISO string (YYYY-MM-DD, no timezone) conversion. We deliberately
// avoid `Date.prototype.toISOString()` because it shifts to UTC and flips the
// day for users east of GMT.
const toISO = (d) => (d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : '');
const fromISO = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split('-').map((x) => parseInt(x, 10));
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

const formatDisplay = (s, placeholder) => {
  const d = fromISO(s);
  if (!d) return placeholder;
  return d.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};

const isSameDay = (a, b) =>
  a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * Premium date picker — replaces the native <input type="date"> across the
 * admin panel and public site. Drop-in API: `value` (ISO `YYYY-MM-DD`) and
 * `onChange(iso)`. Renders a styled trigger button + popover with three views:
 *
 *   1. Days  — month grid, current view
 *   2. Months — quick-pick the month
 *   3. Years — 12-year window, navigate to any year
 *
 * Closes on outside click and Esc. Designed to feel cohesive with the rest
 * of the brand UI (`text-brand`, `card`, rounded corners, soft shadow).
 */
export default function DatePicker({
  value = '',
  onChange,
  min,
  max,
  placeholder = 'Select date',
  disabled = false,
  className = '',
  // Hides "Today" quick-action — useful on filters where "today" can be
  // misleading (e.g. an event must be in the future).
  hideToday = false,
  // Controls whether dates outside [min, max] are merely disabled (`false`,
  // default) or rendered as if they don't exist (`true`).
  hideOutOfRange = false,
  // Compact trigger style — used inside table cells / narrow filter rows.
  size = 'md',
  // `id`/`name` get forwarded to the hidden input so labels & form serializers
  // still pick it up.
  id,
  name,
  // Optional aria-label for accessibility when the trigger has no visible label
  ariaLabel,
}) {
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const [open, setOpen] = useState(false);
  // Fixed-position coords for the portalled popover so it can never be
  // clipped by an ancestor's `overflow-hidden`, and flips above the trigger
  // when there isn't enough room below.
  const [coords, setCoords] = useState({ top: 0, left: 0, placement: 'bottom' });
  const [view, setView] = useState('days'); // 'days' | 'months' | 'years'
  const today = useMemo(() => new Date(), []);
  const selectedDate = useMemo(() => fromISO(value), [value]);
  const minDate = useMemo(() => fromISO(min), [min]);
  const maxDate = useMemo(() => fromISO(max), [max]);

  // The month currently visible in the days grid. Defaults to the selected
  // date's month, else today.
  const [viewMonth, setViewMonth] = useState(() => {
    const base = fromISO(value) || new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  // Reset view-month each time the picker opens so it lands on the selected
  // date (or today) rather than wherever the user last navigated.
  useEffect(() => {
    if (open) {
      const base = selectedDate || new Date();
      setViewMonth(new Date(base.getFullYear(), base.getMonth(), 1));
      setView('days');
    }
  }, [open, selectedDate]);

  // Close on outside click + Esc.
  useEffect(() => {
    if (!open) return undefined;
    const handlePointer = (e) => {
      if (
        triggerRef.current?.contains(e.target) ||
        popoverRef.current?.contains(e.target)
      ) return;
      setOpen(false);
    };
    const handleKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  // Position the portalled popover relative to the trigger. Recomputes on
  // open, scroll and resize. Flips above the field when there is more room
  // up top (so it never gets cut off at the bottom of the viewport).
  const POPOVER_W = 320;
  const POPOVER_H = 430; // header + grid + footer, generous estimate
  const computePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 8;
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const placeAbove = spaceBelow < POPOVER_H + gap && spaceAbove > spaceBelow;
    let left = r.left;
    // Keep within the viewport horizontally.
    left = Math.max(8, Math.min(left, window.innerWidth - POPOVER_W - 8));
    const top = placeAbove
      ? Math.max(8, r.top - gap) // bottom edge sits here (translateY -100%)
      : r.bottom + gap;
    setCoords({ top, left, placement: placeAbove ? 'top' : 'bottom' });
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
    computePosition();
    const onScroll = () => computePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, view, computePosition]);

  const isDisabledDay = useCallback((d) => {
    if (minDate && d < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) return true;
    if (maxDate && d > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())) return true;
    return false;
  }, [minDate, maxDate]);

  const select = (d) => {
    if (isDisabledDay(d)) return;
    onChange?.(toISO(d));
    setOpen(false);
  };

  // Generate the 42-cell day grid for `viewMonth`. Pads with previous/next
  // month days to fill 6 rows × 7 columns — calendars look terrible at 5-row
  // months because the height jumps when you change views.
  const dayCells = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const dayNumber = i - firstWeekday + 1;
      const date = new Date(year, month, dayNumber);
      cells.push({
        date,
        inCurrentMonth: date.getMonth() === month,
        isToday: isSameDay(date, today),
        isSelected: isSameDay(date, selectedDate),
        isDisabled: isDisabledDay(date),
      });
    }
    return cells;
  }, [viewMonth, today, selectedDate, isDisabledDay]);

  const yearGridStart = useMemo(() => {
    const y = viewMonth.getFullYear();
    return Math.floor(y / 12) * 12;
  }, [viewMonth]);

  const triggerSize = size === 'sm'
    ? 'px-3 py-1.5 text-xs'
    : size === 'lg'
      ? 'px-4 py-3 text-base'
      : 'px-3.5 py-2.5 text-sm';

  return (
    <div className={`relative ${className}`}>
      {/* Hidden input so form serializers & labels still work */}
      <input type="hidden" id={id} name={name} value={value || ''} readOnly />

      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        aria-label={ariaLabel || placeholder}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`input w-full ${triggerSize} flex items-center gap-2 text-left ${value ? 'text-ink' : 'text-ink-muted'} ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'} ${open ? 'ring-2 ring-brand/30 border-brand' : ''}`}
      >
        <Calendar size={size === 'sm' ? 14 : 16} className="text-brand shrink-0" />
        <span className="flex-1 truncate">
          {formatDisplay(value, placeholder)}
        </span>
        {value && !disabled && (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Clear date"
            onClick={(e) => {
              e.stopPropagation();
              onChange?.('');
            }}
            className="text-ink-muted hover:text-red-500 transition shrink-0"
          >
            <X size={size === 'sm' ? 12 : 14} />
          </span>
        )}
      </button>

      {open && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          className="fixed z-[1000] w-[320px] rounded-2xl bg-white border border-slate-200 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.25)] overflow-hidden animate-[fadeIn_0.15s_ease-out]"
          style={{
            top: coords.top,
            left: coords.left,
            transform: coords.placement === 'top' ? 'translateY(-100%)' : 'none',
            animationFillMode: 'both',
          }}
        >
          {/* Header — month/year navigation */}
          <div className="flex items-center justify-between gap-2 px-3 py-3 border-b bg-gradient-to-r from-brand/5 to-transparent">
            <button
              type="button"
              onClick={() => {
                if (view === 'days') setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
                else if (view === 'years') setViewMonth((m) => new Date(m.getFullYear() - 12, m.getMonth(), 1));
                else setViewMonth((m) => new Date(m.getFullYear() - 1, m.getMonth(), 1));
              }}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 text-ink-muted flex items-center justify-center transition"
              aria-label="Previous"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="flex items-center gap-1 text-sm font-semibold">
              <button
                type="button"
                onClick={() => setView(view === 'months' ? 'days' : 'months')}
                className={`px-2 py-1 rounded-md hover:bg-slate-100 transition ${view === 'months' ? 'text-brand' : 'text-ink'}`}
              >
                {MONTH_NAMES[viewMonth.getMonth()]}
              </button>
              <button
                type="button"
                onClick={() => setView(view === 'years' ? 'days' : 'years')}
                className={`px-2 py-1 rounded-md hover:bg-slate-100 transition ${view === 'years' ? 'text-brand' : 'text-ink'}`}
              >
                {viewMonth.getFullYear()}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (view === 'days') setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
                else if (view === 'years') setViewMonth((m) => new Date(m.getFullYear() + 12, m.getMonth(), 1));
                else setViewMonth((m) => new Date(m.getFullYear() + 1, m.getMonth(), 1));
              }}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 text-ink-muted flex items-center justify-center transition"
              aria-label="Next"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Body */}
          {view === 'days' && (
            <div className="px-3 py-3">
              <div className="grid grid-cols-7 mb-1.5 text-[11px] font-semibold text-ink-muted uppercase tracking-widest">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="text-center">{w}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1">
                {dayCells.map(({ date, inCurrentMonth, isToday, isSelected, isDisabled }, idx) => {
                  if (hideOutOfRange && isDisabled) {
                    return <div key={idx} className="aspect-square" />;
                  }
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => select(date)}
                      className={`aspect-square text-sm rounded-lg transition relative font-medium
                        ${isSelected
                          ? 'bg-brand text-white shadow-md hover:bg-brand-dark'
                          : isToday
                            ? 'bg-brand/10 text-brand'
                            : inCurrentMonth ? 'text-ink hover:bg-slate-100' : 'text-slate-300 hover:bg-slate-50'}
                        ${isDisabled ? 'opacity-30 cursor-not-allowed hover:bg-transparent' : ''}
                      `}
                    >
                      {date.getDate()}
                      {isToday && !isSelected && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {view === 'months' && (
            <div className="px-3 py-4 grid grid-cols-3 gap-2">
              {MONTH_NAMES.map((name, idx) => {
                const active = viewMonth.getMonth() === idx;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setViewMonth((m) => new Date(m.getFullYear(), idx, 1));
                      setView('days');
                    }}
                    className={`py-2.5 rounded-lg text-sm font-medium transition ${
                      active
                        ? 'bg-brand text-white shadow-md'
                        : 'text-ink hover:bg-slate-100'
                    }`}
                  >
                    {name.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          )}

          {view === 'years' && (
            <div className="px-3 py-4 grid grid-cols-3 gap-2">
              {Array.from({ length: 12 }).map((_, i) => {
                const year = yearGridStart + i;
                const active = viewMonth.getFullYear() === year;
                return (
                  <button
                    key={year}
                    type="button"
                    onClick={() => {
                      setViewMonth((m) => new Date(year, m.getMonth(), 1));
                      setView('months');
                    }}
                    className={`py-2.5 rounded-lg text-sm font-medium transition ${
                      active
                        ? 'bg-brand text-white shadow-md'
                        : 'text-ink hover:bg-slate-100'
                    }`}
                  >
                    {year}
                  </button>
                );
              })}
            </div>
          )}

          {/* Footer — quick actions */}
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-t bg-slate-50/60">
            {!hideToday ? (
              <button
                type="button"
                onClick={() => {
                  if (!isDisabledDay(today)) select(today);
                }}
                className="text-xs font-semibold text-brand hover:bg-brand/5 px-2.5 py-1.5 rounded-md transition"
              >
                Today
              </button>
            ) : <span />}
            <div className="flex items-center gap-1">
              {value && (
                <button
                  type="button"
                  onClick={() => { onChange?.(''); setOpen(false); }}
                  className="text-xs font-semibold text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-md transition"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs font-semibold text-ink-muted hover:bg-slate-100 px-2.5 py-1.5 rounded-md transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
