import { useMemo, useState } from 'react';
import {
  CalendarDays, Clock, Plus, Trash2, X, ChevronLeft, ChevronRight, Check, Wand2,
} from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Availability & scheduling (the "intelligent" task).
 *
 *   schedule = { dates: [ { date: 'YYYY-MM-DD', slots: [ { start:'HH:MM', end:'HH:MM' } ] } ] }
 *
 * Flow:
 *   1. "Manage dates & slots" → calendar modal: year-wise, all 12 months,
 *      pick many dates across months. Save → dates appear as month-wise tables.
 *   2. Each date row has "Manage slots" → slot modal: build from→to slots.
 *      The activity duration (from pricing) seeds slot length + a one-click
 *      auto-generate across a time window.
 *
 * Controlled via `value` (schedule) + `onChange(nextSchedule)`.
 * `durationMinutes` comes from the pricing duration (falls back to 60).
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

export default function ExperienceScheduling({ value = {}, onChange, durationMinutes = 60 }) {
  const dates = Array.isArray(value?.dates) ? value.dates : [];
  const [calOpen, setCalOpen] = useState(false);
  const [slotDate, setSlotDate] = useState(null); // date string currently editing slots for

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
  const saveCalendar = (selected) => {
    const existing = new Map(dates.map((d) => [d.date, d.slots || []]));
    const next = selected.sort().map((dt) => ({ date: dt, slots: existing.get(dt) || [] }));
    setDates(next);
    setCalOpen(false);
  };

  const removeDate = (dt) => setDates(dates.filter((d) => d.date !== dt));
  const saveSlots = (dt, slots) => {
    setDates(dates.map((d) => (d.date === dt ? { ...d, slots } : d)));
    setSlotDate(null);
  };

  const editing = slotDate ? dates.find((d) => d.date === slotDate) : null;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <button type="button" onClick={() => setCalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand text-ink font-semibold hover:brightness-105">
          <CalendarDays size={17} /> Manage dates &amp; slots
        </button>
        {dates.length > 0 && (
          <span className="text-sm text-ink-muted">{dates.length} date{dates.length > 1 ? 's' : ''} · {totalSlots} slot{totalSlots !== 1 ? 's' : ''}</span>
        )}
      </div>

      {dates.length === 0 ? (
        <p className="text-sm text-ink-muted italic">No dates yet. Click “Manage dates &amp; slots” to pick available dates.</p>
      ) : (
        <div className="space-y-4">
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
          onSave={saveCalendar}
          onClose={() => setCalOpen(false)}
        />
      )}
      {editing && (
        <SlotModal
          date={editing.date}
          slots={editing.slots || []}
          durationMinutes={durationMinutes}
          onSave={(slots) => saveSlots(editing.date, slots)}
          onClose={() => setSlotDate(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────── Calendar (multi-date) ─────────────────────────
function CalendarModal({ initial, onSave, onClose }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [sel, setSel] = useState(new Set(initial));
  const today = todayStr();

  const toggle = (ds) => {
    if (ds < today) return; // no past dates
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(ds)) next.delete(ds); else next.add(ds);
      return next;
    });
  };

  return (
    <Modal onClose={onClose} wide title="Select available dates"
      footer={(
        <>
          <span className="text-sm text-ink-muted mr-auto">{sel.size} date{sel.size !== 1 ? 's' : ''} selected</span>
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 font-medium">Cancel</button>
          <button onClick={() => onSave(Array.from(sel))} className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-brand text-ink font-semibold">
            <Check size={16} /> Save dates
          </button>
        </>
      )}
    >
      <div className="flex items-center justify-center gap-4 mb-4">
        <button onClick={() => setYear((y) => y - 1)} className="p-2 rounded-lg hover:bg-surface-alt"><ChevronLeft size={18} /></button>
        <span className="font-display font-bold text-lg w-20 text-center">{year}</span>
        <button onClick={() => setYear((y) => y + 1)} className="p-2 rounded-lg hover:bg-surface-alt"><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {MONTHS.map((mName, m) => (
          <MiniMonth key={m} year={year} month={m} sel={sel} today={today} onToggle={toggle} name={mName} />
        ))}
      </div>
    </Modal>
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
      <div className="text-center font-semibold text-sm mb-2">{name}</div>
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

// ─────────────────────────── Slot manager ──────────────────────────────────
function SlotModal({ date, slots, durationMinutes, onSave, onClose }) {
  const dur = durationMinutes > 0 ? durationMinutes : 60;
  const [list, setList] = useState(slots.map((s) => ({ ...s })));
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState(toHHMM(toMin('09:00') + dur));
  const [winStart, setWinStart] = useState('09:00');
  const [winEnd, setWinEnd] = useState('17:00');

  const add = (s, e) => {
    if (toMin(e) <= toMin(s)) { toast.error('End time must be after start'); return false; }
    if (list.some((x) => x.start === s && x.end === e)) return false;
    setList((prev) => [...prev, { start: s, end: e }].sort((a, b) => toMin(a.start) - toMin(b.start)));
    return true;
  };

  const generate = () => {
    const ws = toMin(winStart); const we = toMin(winEnd);
    if (we <= ws) { toast.error('Window end must be after start'); return; }
    const made = [];
    for (let t = ws; t + dur <= we; t += dur) made.push({ start: toHHMM(t), end: toHHMM(t + dur) });
    if (!made.length) { toast.error('Window too small for one slot'); return; }
    const merged = [...list];
    made.forEach((s) => { if (!merged.some((x) => x.start === s.start && x.end === s.end)) merged.push(s); });
    merged.sort((a, b) => toMin(a.start) - toMin(b.start));
    setList(merged);
    toast.success(`Generated ${made.length} slot${made.length > 1 ? 's' : ''}`);
  };

  const remove = (i) => setList(list.filter((_, idx) => idx !== i));

  return (
    <Modal onClose={onClose} title={`Slots · ${fmtDate(date)}`}
      footer={(
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 font-medium">Cancel</button>
          <button onClick={() => onSave(list)} className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-brand text-ink font-semibold">
            <Check size={16} /> Save slots
          </button>
        </>
      )}
    >
      <div className="text-xs text-ink-muted mb-3">Activity duration: <strong>{Math.floor(dur / 60)}h {dur % 60}m</strong> — used as the default slot length.</div>

      {/* Auto-generate across a window */}
      <div className="bg-surface-alt rounded-xl p-3 mb-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2 inline-flex items-center gap-1.5"><Wand2 size={13} /> Auto-generate</div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs">From<input type="time" value={winStart} onChange={(e) => setWinStart(e.target.value)} className="input block mt-1 w-32" /></label>
          <label className="text-xs">To<input type="time" value={winEnd} onChange={(e) => setWinEnd(e.target.value)} className="input block mt-1 w-32" /></label>
          <button type="button" onClick={generate} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-ink text-white text-sm font-semibold">
            <Wand2 size={14} /> Generate {Math.floor(dur / 60)}h{dur % 60 ? ` ${dur % 60}m` : ''} slots
          </button>
        </div>
      </div>

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
        <p className="text-sm text-ink-muted italic">No slots yet for this date.</p>
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
