import { Calendar, Bed, User, Baby, Moon } from 'lucide-react';
import DatePicker from '../common/DatePicker.jsx';

// MMT-style stay picker — sits on the hotel detail page above the room
// list. Owns three pieces of state shared with the rest of the page:
//   checkIn / checkOut  → drive the per-night quantity and bill preview
//   adults / children   → cap which rooms can fit the party
//   rooms               → multiplies the per-night rate (rooms × nights)
//
// All inputs are visible at once — no popovers — so the user can adjust
// any field with a single click and see prices re-flow in real time. The
// picker is fully controlled: parent owns `value`, picker calls `onChange`
// with the next snapshot whenever anything changes.

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const addDaysISO = (iso, days) => {
  const [y, m, d] = (iso || todayISO()).split('-').map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};
const nightsBetween = (a, b) => {
  if (!a || !b) return 1;
  const aD = new Date(a);
  const bD = new Date(b);
  if (Number.isNaN(aD) || Number.isNaN(bD)) return 1;
  return Math.max(1, Math.round((bD - aD) / 86_400_000));
};

export default function HotelStayPicker({ value, onChange }) {
  const checkIn = value?.checkIn || todayISO();
  const checkOut = value?.checkOut || addDaysISO(checkIn, 1);
  const adults = Math.max(1, value?.adults || 2);
  const children = Math.max(0, value?.children || 0);
  const rooms = Math.max(1, value?.rooms || 1);

  const patch = (next) =>
    onChange?.({ checkIn, checkOut, adults, children, rooms, ...next });

  const setCheckIn = (iso) => {
    const next = iso || todayISO();
    // Auto-bump check-out so we never quote a zero-night stay.
    const co = new Date(checkOut) > new Date(next) ? checkOut : addDaysISO(next, 1);
    patch({ checkIn: next, checkOut: co });
  };

  const setCheckOut = (iso) => {
    if (!iso) return;
    // If the user pulls check-out behind check-in, snap it to checkIn + 1.
    if (new Date(iso) <= new Date(checkIn)) {
      patch({ checkOut: addDaysISO(checkIn, 1) });
    } else {
      patch({ checkOut: iso });
    }
  };

  const nights = nightsBetween(checkIn, checkOut);
  const totalGuests = adults + children;

  // Direct "number of nights" control — keeps check-out in sync so dates stay
  // the single source of truth and the room prices below re-flow instantly.
  const setNights = (n) => {
    const safe = Math.max(1, Math.min(30, n));
    patch({ checkOut: addDaysISO(checkIn, safe) });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-soft overflow-hidden">
      {/* Top row — dates */}
      <div className="grid grid-cols-1 md:grid-cols-2">
        <PickerCell label="Check-in" icon={Calendar}>
          <DatePicker
            value={checkIn}
            min={todayISO()}
            onChange={setCheckIn}
            compact
            hideToday={false}
            placeholder="Pick date"
          />
        </PickerCell>

        <PickerCell
          label={`Check-out · ${nights} night${nights > 1 ? 's' : ''}`}
          icon={Calendar}
          divider
        >
          <DatePicker
            value={checkOut}
            min={addDaysISO(checkIn, 1)}
            onChange={setCheckOut}
            compact
            hideToday
            placeholder="Pick date"
          />
        </PickerCell>
      </div>

      {/* Bottom row — counters always visible */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-slate-100 bg-slate-50/60">
        <CounterCell
          icon={Moon}
          label="Nights"
          value={nights}
          onChange={(v) => setNights(v)}
          min={1}
          max={30}
        />
        <CounterCell
          icon={Bed}
          label="Rooms"
          value={rooms}
          onChange={(v) => patch({ rooms: Math.max(1, v) })}
          min={1}
          max={10}
          divider
        />
        <CounterCell
          icon={User}
          label="Adults"
          hint="12+"
          value={adults}
          onChange={(v) => patch({ adults: Math.max(1, v) })}
          min={1}
          max={20}
          divider
        />
        <CounterCell
          icon={Baby}
          label="Children"
          hint="0–11"
          value={children}
          onChange={(v) => patch({ children: Math.max(0, v) })}
          min={0}
          max={10}
          divider
        />
      </div>

      {/* Summary strip */}
      <div className="border-t border-slate-100 bg-white px-4 py-2 text-[11px] text-ink-muted flex items-center justify-between gap-3">
        <span>
          <strong className="text-ink">{nights}</strong> night{nights > 1 ? 's' : ''} ·{' '}
          <strong className="text-ink">{rooms}</strong> room{rooms > 1 ? 's' : ''} ·{' '}
          <strong className="text-ink">{totalGuests}</strong> guest{totalGuests > 1 ? 's' : ''}
        </span>
        <span className="text-ink-muted">
          Room prices below update for this selection
        </span>
      </div>
    </div>
  );
}

function PickerCell({ label, icon: Icon, divider, children }) {
  return (
    <div className={`p-3 ${divider ? 'md:border-l border-slate-100' : ''}`}>
      <div className="text-[10px] uppercase tracking-wider text-ink-muted flex items-center gap-1 mb-1">
        {Icon && <Icon size={11} />} {label}
      </div>
      {children}
    </div>
  );
}

function CounterCell({ icon: Icon, label, hint, value, onChange, min, max, divider }) {
  return (
    <div className={`p-3 ${divider ? 'border-l border-slate-100' : ''}`}>
      <div className="text-[10px] uppercase tracking-wider text-ink-muted flex items-center gap-1 mb-1.5">
        {Icon && <Icon size={11} />} {label}{hint && <span className="text-[9px] text-slate-400">· {hint}</span>}
      </div>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') { onChange(min); return; }
          const n = parseInt(raw, 10);
          if (!Number.isFinite(n)) return;
          onChange(Math.max(min, Math.min(max, n)));
        }}
        aria-label={label}
        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-center text-base font-bold text-ink focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
      />
    </div>
  );
}

export { todayISO, addDaysISO, nightsBetween };
