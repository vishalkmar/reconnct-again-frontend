import { useMemo, useState } from 'react';
import {
  CalendarDays, Clock, Plus, Trash2, X, Check, Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Availability & scheduling.
 *
 *   schedule = {
 *     dates: [ { date: 'YYYY-MM-DD', slots: [ { start:'HH:MM', end:'HH:MM' } ] } ],
 *     slotMode: 'manual' | 'dynamic',
 *   }
 *
 * Flow:
 *   1. "Manage dates & slots" → calendar modal: a rolling 12-month window
 *      starting at the current month (never past months/years), past dates
 *      disabled. Picking at least one date also requires picking a mode:
 *        - Manual   : each date gets its own "Manage slots" link (as before).
 *        - Dynamic  : ONE "Manage Slots" button builds a slot set once and
 *                     (when "Apply to all dates" is checked) applies it to
 *                     every selected date at once. Per-date "Manage slots"
 *                     links still stay available underneath for one-off edits.
 *   2. Slots are always built manually (no auto-generate) — one start/end
 *      pair at a time.
 *
 * Controlled via `value` (schedule) + `onChange(nextSchedule)`.
 * `durationMinutes` comes from the pricing duration (used only to prefill a
 * sensible end time when adding a slot).
 */

const pad = (n) => String(n).padStart(2, '0');
const dateStr = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const todayStr = () => { const t = new Date(); return dateStr(t.getFullYear(), t.getMonth(), t.getDate()); };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const toMin = (hhmm) => { const [h, m] = String(hhmm).split(':').map(Number); return h * 60 + m; };
const toHHMM = (min) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;

const fmtDate = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};
const fmtTime = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  const ap = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 || 12;
  return `${h12}:${pad(m)} ${ap}`;
};

// Current month + next 11 (crosses a year boundary naturally) — never a
// past month, never bound to "this calendar year" (which would go stale
// every December).
const rollingMonths = () => {
  const t = new Date();
  const out = [];
  for (let i = 0; i < 12; i++) {
    const y = t.getFullYear();
    const m = t.getMonth() + i;
    out.push({ year: y + Math.floor(m / 12), month: ((m % 12) + 12) % 12 });
  }
  return out;
};

export default function ExperienceScheduling({ value = {}, onChange, durationMinutes = 60 }) {
  const dates = Array.isArray(value?.dates) ? value.dates : [];
  const slotMode = value?.slotMode || 'manual';
  const [calOpen, setCalOpen] = useState(false);
  const [slotDate, setSlotDate] = useState(null); // date string currently editing slots for
  const [bulkOpen, setBulkOpen] = useState(false);

  const setDates = (next) => onChange({ ...value, dates: next });

  // Group by YYYY-MM for the month-wise tables.
  const byMonth = useMemo(() => {
    const map = new Map();
    [...dates].sort((a, b) => a.date.localeCompare(b.date)).forEach((d) => {
      const key = d.date.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(d);
    });
    return Array.from(map.entries());
  }, [dates]);

  const totalSlots = dates.reduce((n, d) => n + (d.slots?.length || 0), 0);

  // Merge calendar selection: keep slots for surviving dates, drop removed ones.
  const saveCalendar = (selected, mode) => {
    const existing = new Map(dates.map((d) => [d.date, d.slots || []]));
    const next = selected.sort().map((dt) => ({ date: dt, slots: existing.get(dt) || [] }));
    onChange({ ...value, dates: next, slotMode: mode });
    setCalOpen(false);
  };

  const removeDate = (dt) => setDates(dates.filter((d) => d.date !== dt));
  const saveSlots = (dt, slots) => {
    setDates(dates.map((d) => (d.date === dt ? { ...d, slots } : d)));
    setSlotDate(null);
  };
  const applyToAll = (slots) => {
    setDates(dates.map((d) => ({ ...d, slots })));
    setBulkOpen(false);
  };

  const editing = slotDate ? dates.find((d) => d.date === slotDate) : null;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={() => setCalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand text-ink font-semibold hover:brightness-105">
            <CalendarDays size={17} /> Manage dates &amp; slots
          </button>
          {dates.length > 0 && slotMode === 'dynamic' && (
            <button type="button" onClick={() => setBulkOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-brand text-brand-dark font-semibold hover:bg-brand/10">
              <Layers size={17} /> Manage Slots
            </button>
          )}
        </div>
        {dates.length > 0 && (
          <span className="text-sm text-ink-muted">{dates.length} date{dates.length > 1 ? 's' : ''} · {totalSlots} slot{totalSlots !== 1 ? 's' : ''}</span>
        )}
      </div>

      {dates.length === 0 ? (
        <p className="text-sm text-ink-muted italic">No dates yet. Click “Manage dates &amp; slots” to pick available dates.</p>
      ) : (
        <div className="space-y-4">
          {slotMode === 'dynamic' && (
            <p className="text-xs text-ink-muted italic">Dynamic mode — use “Manage Slots” above to apply a slot set to every date at once, or edit a single date below.</p>
          )}
          {byMonth.map(([key, rows]) => {
            const [y, m] = key.split('-').map(Number);
            return (
              <div key={key} className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-surface-alt px-4 py-2 font-semibold text-sm">{MONTHS[m - 1]} {y}</div>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((d) => (
                      <tr key={d.date}>
                        <td className="px-4 py-2.5 font-medium text-ink whitespace-nowrap">{fmtDate(d.date)}</td>
                        <td className="px-4 py-2.5 text-ink-muted">
                          {d.slots?.length
                            ? d.slots.map((s) => `${fmtTime(s.start)}–${fmtTime(s.end)}`).join(', ')
                            : <span className="italic text-amber-600">No slots yet</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          <button type="button" onClick={() => setSlotDate(d.date)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline mr-3">
                            <Clock size={13} /> Manage slots{d.slots?.length ? ` (${d.slots.length})` : ''}
                          </button>
                          <button type="button" onClick={() => removeDate(d.date)} className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {calOpen && (
        <CalendarModal
          initial={dates.map((d) => d.date)}
          initialMode={dates.length ? slotMode : null}
          onSave={saveCalendar}
          onClose={() => setCalOpen(false)}
        />
      )}
      {editing && (
        <SlotModal
          title={`Slots · ${fmtDate(editing.date)}`}
          slots={editing.slots || []}
          durationMinutes={durationMinutes}
          onSave={(slots) => saveSlots(editing.date, slots)}
          onClose={() => setSlotDate(null)}
        />
      )}
      {bulkOpen && (
        <SlotModal
          title="Manage Slots · applies to every date"
          slots={[]}
          durationMinutes={durationMinutes}
          requireApplyAll
          onSave={applyToAll}
          onClose={() => setBulkOpen(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────── Calendar (multi-date) ─────────────────────────
function CalendarModal({ initial, initialMode, onSave, onClose }) {
  const [sel, setSel] = useState(new Set(initial));
  const [mode, setMode] = useState(initialMode);
  const today = todayStr();
  const months = useMemo(() => rollingMonths(), []);

  const toggle = (ds) => {
    if (ds < today) return; // no past dates
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(ds)) next.delete(ds); else next.add(ds);
      return next;
    });
  };

  const modeRequired = sel.size > 0;
  const canSave = !modeRequired || !!mode;

  return (
    <Modal onClose={onClose} wide title="Select available dates"
      footer={(
        <>
          <span className="text-sm text-ink-muted mr-auto">{sel.size} date{sel.size !== 1 ? 's' : ''} selected</span>
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 font-medium">Cancel</button>
          <button onClick={() => onSave(Array.from(sel), mode)} disabled={!canSave}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-brand text-ink font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
            <Check size={16} /> Save dates
          </button>
        </>
      )}
    >
      {modeRequired && (
        <div className="mb-4 bg-surface-alt rounded-xl p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">
            How will slots be managed for these dates? <span className="text-rose-500">*</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <ModeOption
              active={mode === 'manual'}
              title="Manual slots for each date"
              sub="Set slots one date at a time."
              onClick={() => setMode('manual')}
            />
            <ModeOption
              active={mode === 'dynamic'}
              title="Dynamic management"
              sub="Build one slot set, apply it to every date at once."
              onClick={() => setMode('dynamic')}
            />
          </div>
          {!mode && <p className="text-xs text-rose-500 mt-2">Pick one to continue.</p>}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {months.map(({ year, month }) => (
          <MiniMonth key={`${year}-${month}`} year={year} month={month} sel={sel} today={today} onToggle={toggle} name={MONTHS[month]} />
        ))}
      </div>
    </Modal>
  );
}

function ModeOption({ active, title, sub, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 min-w-[220px] text-left rounded-xl border-2 p-3 transition ${active ? 'border-brand bg-brand/10' : 'border-gray-200 bg-white hover:border-brand/40'}`}
    >
      <div className="flex items-center gap-2 font-semibold text-sm text-ink">
        {active && <Check size={15} className="text-brand" />} {title}
      </div>
      <p className="text-xs text-ink-muted mt-1">{sub}</p>
    </button>
  );
}

function MiniMonth({ year, month, sel, today, onToggle, name }) {
  const firstWd = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWd; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  return (
    <div className="border border-gray-100 rounded-xl p-3">
      <div className="text-center font-semibold text-sm mb-2">{name} {year}</div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-ink-muted mb-1">
        {WD.map((w, i) => <span key={i}>{w}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const ds = dateStr(year, month, d);
          const selected = sel.has(ds);
          const past = ds < today;
          return (
            <button
              key={i}
              type="button"
              disabled={past}
              onClick={() => onToggle(ds)}
              className={`h-7 w-7 mx-auto rounded-full text-xs transition ${
                selected ? 'bg-brand text-ink font-bold' : past ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-brand/15 text-ink'
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────── Slot manager (manual only) ────────────────────
// Used both for a single date's slots and, with requireApplyAll, for the
// dynamic-mode bulk editor that applies its result to every date.
function SlotModal({ title, slots, durationMinutes, requireApplyAll = false, onSave, onClose }) {
  const dur = durationMinutes > 0 ? durationMinutes : 60;
  const [list, setList] = useState(slots.map((s) => ({ ...s })));
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState(toHHMM(toMin('09:00') + dur));
  const [applyAll, setApplyAll] = useState(false);

  const add = (s, e) => {
    if (toMin(e) <= toMin(s)) { toast.error('End time must be after start'); return; }
    if (list.some((x) => x.start === s && x.end === e)) { toast.error('That slot is already added'); return; }
    setList((prev) => [...prev, { start: s, end: e }].sort((a, b) => toMin(a.start) - toMin(b.start)));
    // Advance the pickers to the NEXT slot so repeated clicks build a
    // back-to-back sequence (9-10, 10-11, ...) without retyping times.
    setStart(e);
    setEnd(toHHMM(toMin(e) + dur));
  };

  const remove = (i) => setList(list.filter((_, idx) => idx !== i));

  const canSave = requireApplyAll ? (list.length > 0 && applyAll) : true;

  return (
    <Modal onClose={onClose} title={title}
      footer={(
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 font-medium">Cancel</button>
          <button onClick={() => onSave(list)} disabled={!canSave}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-brand text-ink font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
            <Check size={16} /> Save slots
          </button>
        </>
      )}
    >
      <div className="text-xs text-ink-muted mb-3">Activity duration: <strong>{Math.floor(dur / 60)}h {dur % 60}m</strong> — used as the default slot length.</div>

      {/* Manual single slot */}
      <div className="flex flex-wrap items-end gap-2 mb-4">
        <label className="text-xs">Start<input type="time" value={start} onChange={(e) => { setStart(e.target.value); setEnd(toHHMM(toMin(e.target.value) + dur)); }} className="input block mt-1 w-32" /></label>
        <label className="text-xs">End<input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="input block mt-1 w-32" /></label>
        <button type="button" onClick={() => add(start, end)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-ink text-sm font-semibold">
          <Plus size={15} /> Add slot
        </button>
      </div>

      {/* Slot list */}
      {list.length === 0 ? (
        <p className="text-sm text-ink-muted italic">No slots yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {list.map((s, i) => (
            <span key={`${s.start}-${s.end}-${i}`} className="inline-flex items-center gap-2 pl-3 pr-1 py-1.5 rounded-full border border-gray-200 bg-white text-sm">
              {fmtTime(s.start)} – {fmtTime(s.end)}
              <button type="button" onClick={() => remove(i)} className="p-1 text-rose-500 hover:bg-rose-50 rounded-full"><X size={13} /></button>
            </span>
          ))}
        </div>
      )}

      {requireApplyAll && (
        <label className="flex items-center gap-2 mt-4 text-sm text-ink cursor-pointer">
          <input type="checkbox" checked={applyAll} onChange={(e) => setApplyAll(e.target.checked)} className="w-4 h-4" />
          Apply to all dates
        </label>
      )}
    </Modal>
  );
}

// ─────────────────────────── shared modal shell ────────────────────────────
function Modal({ title, children, footer, onClose, wide }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="font-display font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
        <div className="flex items-center gap-2 px-5 py-3 border-t">{footer}</div>
      </div>
    </div>
  );
}
