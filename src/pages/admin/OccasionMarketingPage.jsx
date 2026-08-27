import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, Line, BarChart, Bar,
  CartesianGrid, XAxis, YAxis, Tooltip, Legend,
} from 'recharts';
import {
  CalendarHeart, Loader2, Plus, X, Save, Trash2, Power, Send, Play, Sparkles,
  AlertTriangle, CheckCircle2, Mail, Smartphone, Bell, CalendarDays, BarChart3, Gift, Merge,
  Timer, FlaskConical, Users, MousePointerClick, IndianRupee, Search, SlidersHorizontal,
  ChevronDown, ChevronUp, Clock, MapPin,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext.jsx';
import Dropzone from '../../components/admin/Dropzone.jsx';

/*
  Admin → Occasion Marketing.

  The whole festival/weekend/birthday greeting engine in one screen. Three
  tabs, each answering a different question:

    Campaigns — what greetings exist, and are their dates right?
    Schedule  — what will actually go out, day by day (the resolver's own
                output, so the preview cannot drift from the sweep).
    Analytics — what went out, on which channel, and to how many people.

  Channels are email, app push and the in-app bell. All three are free, which
  is the whole reason the engine can greet the entire customer base.
*/

const TYPES = [
  { value: 'festival', label: 'Festival' },
  { value: 'holiday', label: 'National holiday' },
  { value: 'awareness', label: 'Awareness / special day' },
  { value: 'weekend', label: 'Weekend' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'sale', label: 'Sale' },
];

const RECURRENCES = [
  { value: 'dates', label: 'Specific dates', hint: 'Lunar festivals — Diwali, Holi, Rakhi. One line per date.' },
  { value: 'yearly_fixed', label: 'Same date every year', hint: '26 Jan, 14 Feb, 25 Dec…' },
  { value: 'nth_weekday', label: 'Nth weekday of a month', hint: "Mother's Day = 2nd Sunday of May. Computed forever." },
  { value: 'weekly', label: 'Every week', hint: 'The weekend nudge.' },
  { value: 'user_field', label: "Each user's own date", hint: 'Birthday / anniversary, from their profile.' },
];

const OFFSET_CHOICES = [
  { value: 0, label: 'On the day' },
  { value: -1, label: '1 day before' },
  { value: -2, label: '2 days before' },
  { value: -3, label: '3 days before' },
  { value: -7, label: '1 week before' },
];

const CHANNELS = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'push', label: 'App push', icon: Smartphone },
  { value: 'inapp', label: 'In-app bell', icon: Bell },
];

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const NTH_LABEL = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', '-1': 'Last' };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const TYPE_CHIP = {
  festival: 'bg-amber-50 text-amber-700 border-amber-200',
  holiday: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  awareness: 'bg-blue-50 text-blue-700 border-blue-200',
  weekend: 'bg-violet-50 text-violet-700 border-violet-200',
  birthday: 'bg-pink-50 text-pink-700 border-pink-200',
  anniversary: 'bg-rose-50 text-rose-700 border-rose-200',
  sale: 'bg-slate-100 text-slate-700 border-slate-200',
};

const blank = () => ({
  name: '',
  type: 'festival',
  recurrence: 'dates',
  occurrences: [],
  month: 1,
  day: 1,
  weekday: 6,
  nthWeek: 2,
  userField: 'dob',
  sendOffsets: [-1, 0],
  sendHourIst: 9,
  sendMinuteIst: 30,
  channels: ['email', 'push', 'inapp'],
  title: 'Happy {{occasion}}, {{name}}!',
  message: '',
  offsetCopy: {},
  imageUrl: '',
  ctaLabel: 'Explore experiences',
  ctaPath: '/experiences',
  couponCode: '',
  targetCities: [],
  targetAudienceIds: [],
  promoteExperienceIds: [],
  suggestKeywords: [],
  isActive: true,
});

const describeSchedule = (c) => {
  if (c.recurrence === 'weekly') return `Every ${WEEKDAYS[c.weekday] || '—'}`;
  if (c.recurrence === 'yearly_fixed') return `${c.day} ${MONTHS[(c.month || 1) - 1]} every year`;
  if (c.recurrence === 'nth_weekday') {
    return `${NTH_LABEL[c.nthWeek] || '?'} ${WEEKDAYS[c.weekday] || '?'} of ${MONTHS[(c.month || 1) - 1]}`;
  }
  if (c.recurrence === 'user_field') return c.userField === 'anniversary' ? "Each user's anniversary" : "Each user's birthday";
  const list = c.occurrences || [];
  return list.length ? `${list.length} date${list.length === 1 ? '' : 's'} on file` : 'No dates set';
};

// How many of this day's sends are merges of 2+ occasions. Rows sharing a
// groupKey reach the same people at the same minute, so the engine delivers
// them as a single greeting that wishes every occasion in the group.
const mergedCount = (rows = []) => {
  const sizes = rows.reduce((acc, r) => {
    acc[r.groupKey] = (acc[r.groupKey] || 0) + 1;
    return acc;
  }, {});
  return Object.values(sizes).filter((n) => n > 1).length;
};

// Names of the other occasions this row will be delivered alongside.
const mergedWith = (row, rows = []) =>
  rows.filter((r) => r.groupKey === row.groupKey && r.campaignId !== row.campaignId)
    .map((r) => r.name);

/*
  The run-up beats. A big occasion no longer sends once: it sends a week out,
  then at 3, 2 and 1 days, then the wish itself — so the admin needs to be
  able to see, and test, each beat separately.
*/
const COUNTDOWN_OFFSETS = [-7, -3, -2, -1, 0];

const STAGE_LABEL = {
  '-7': '1 week to go',
  '-3': '3 days to go',
  '-2': '2 days to go',
  '-1': 'Tomorrow',
  0: 'On the day',
};

const stageLabel = (o) => STAGE_LABEL[String(Number(o))]
  || (Number(o) < 0 ? `${Math.abs(Number(o))} days to go` : 'On the day');

const describeOffsets = (offsets = []) =>
  offsets
    .slice()
    .sort((a, b) => a - b)
    .map((o) => (o === 0 ? 'on the day' : `${Math.abs(o)}d before`))
    .join(' + ') || 'on the day';

export default function OccasionMarketingPage() {
  // The admin's own address is the sensible default for a test send — it is
  // the inbox they are sitting in front of.
  const { admin } = useAuth();
  const [tab, setTab] = useState('campaigns');
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // campaign object or 'new'
  const [busy, setBusy] = useState(false);
  const [today, setToday] = useState('');
  const [q, setQ] = useState({
    text: '', type: '', recurrence: '', window: '', flag: '', sort: 'next',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/campaigns');
      setCampaigns(res.data?.data?.campaigns || []);
      setToday(res.data?.data?.today || '');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const unverified = campaigns.filter((c) => c.needsDateCheck && c.isActive);

  /*
    One derivation for the whole list: filter, then sort. Kept in a useMemo
    because it runs over every campaign on each keystroke of the search box.
  */
  const visible = useMemo(() => {
    const text = q.text.trim().toLowerCase();
    const out = campaigns.filter((c) => {
      if (text && !`${c.name} ${c.slug || ''}`.toLowerCase().includes(text)) return false;
      if (q.type && c.type !== q.type) return false;
      if (q.recurrence && c.recurrence !== q.recurrence) return false;
      if (q.window !== '' && daysUntil(c.nextOccurrence, today) > q.window) return false;
      if (q.flag === 'needsCheck' && !(c.needsDateCheck && c.isActive)) return false;
      if (q.flag === 'paused' && c.isActive) return false;
      if (q.flag === 'active' && !c.isActive) return false;
      return true;
    });

    const byName = (a, b) => a.name.localeCompare(b.name);
    if (q.sort === 'name') return out.sort(byName);
    if (q.sort === 'sent') return out.sort((a, b) => (b.stats?.sent || 0) - (a.stats?.sent || 0));
    if (q.sort === 'type') return out.sort((a, b) => (a.type || '').localeCompare(b.type || '') || byName(a, b));
    // 'next' — soonest first, and occasions with no next date sink rather than
    // sorting as "very far away" at the top of a reversed list.
    return out.sort((a, b) => daysUntil(a.nextOccurrence, today) - daysUntil(b.nextOccurrence, today) || byName(a, b));
  }, [campaigns, q, today]);

  const seedCalendar = async () => {
    setBusy(true);
    try {
      const res = await api.post('/admin/campaigns/seed');
      toast.success(res.data?.message || 'Calendar seeded');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Seeding failed');
    } finally {
      setBusy(false);
    }
  };

  const runNow = async (id) => {
    if (!window.confirm('Send every greeting that is due today, right now? People already greeted for this occasion are skipped.')) return;
    setBusy(true);
    try {
      const res = await api.post('/admin/campaigns/run-now', id ? { id } : {});
      const sent = (res.data?.data?.report || []).reduce((n, r) => n + (r.sent || 0), 0);
      toast.success(sent ? `${sent} message(s) dispatched` : 'Nothing was due right now');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Run failed');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (c) => {
    try {
      await api.patch(`/admin/campaigns/${c.id}/toggle`);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not toggle');
    }
  };

  const verifyDates = async (c) => {
    try {
      await api.patch(`/admin/campaigns/${c.id}/verify-dates`);
      toast.success(`${c.name} dates marked verified`);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update');
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete "${c.name}"? Its send history goes with it.`)) return;
    try {
      await api.delete(`/admin/campaigns/${c.id}`);
      toast.success('Deleted');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete');
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="mb-5">
        <h1 className="text-2xl font-display font-bold mb-1 inline-flex items-center gap-2">
          <CalendarHeart size={22} className="text-brand" /> Occasion Marketing
        </h1>
        <p className="text-ink-muted text-sm max-w-3xl">
          Festival, weekend and birthday greetings — sent automatically over
          email, app push and the in-app bell. Every festival, holiday, sale,
          birthday and anniversary <strong>automatically</strong> runs a{' '}
          <strong>7-day countdown</strong>: a week before, then 3, 2 and 1 days
          before, then the day itself — each beat with its own copy. The day-of
          mail is the odd one out on purpose: the wish stands alone, and only
          below a divider does it point at what is still bookable today.
          Nobody is ever greeted
          twice for the same occasion, and two occasions on one morning arrive
          as a single message.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {[
          { key: 'campaigns', label: 'Campaigns', icon: Sparkles },
          { key: 'schedule', label: 'Schedule', icon: CalendarDays },
          { key: 'analytics', label: 'Analytics', icon: BarChart3 },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border ${
              tab === t.key
                ? 'bg-brand text-ink border-brand shadow-soft'
                : 'bg-white text-ink border-gray-200 hover:border-brand/50'
            }`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
        <div className="flex-1" />
        {tab === 'campaigns' && (
          <>
            <button
              onClick={() => runNow(null)}
              disabled={busy}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-ink hover:border-brand/50 disabled:opacity-50"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />} Run today's sends
            </button>
            <button
              onClick={() => setEditing('new')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-ink text-sm font-bold shadow-soft hover:brightness-105"
            >
              <Plus size={15} /> Add occasion
            </button>
          </>
        )}
      </div>

      {unverified.length > 0 && tab === 'campaigns' && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800 mb-5">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <div>
            <strong>{unverified.length} campaign(s) have unverified dates.</strong>{' '}
            Lunar festivals (Diwali, Holi, Rakhi…) shift every year and these were
            seeded from a published calendar, not an authority. Open each one,
            check the dates against this year's panchang, then hit “Dates are
            correct”. Greeting people on the wrong day is worse than not greeting them.
          </div>
        </div>
      )}

      {editing && (
        <CampaignForm
          initial={editing === 'new' ? blank() : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await load(); }}
        />
      )}

      {tab === 'campaigns' && (
        loading ? (
          <div className="py-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
        ) : campaigns.length === 0 ? (
          <EmptyCalendar onSeed={seedCalendar} busy={busy} />
        ) : (
          <>
            <CalendarSummary
              campaigns={campaigns}
              today={today}
              onPick={(patch) => setQ((p) => ({
                ...p, text: '', type: '', recurrence: '', window: '', flag: '', ...patch,
              }))}
            />
            <CampaignFilters q={q} setQ={setQ} count={visible.length} total={campaigns.length} />
            {visible.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-soft p-10 text-center">
                <Search size={26} className="mx-auto text-ink-muted mb-2" />
                <p className="text-sm text-ink-muted">No occasion matches these filters.</p>
              </div>
            ) : (
          <div className="grid gap-3">
            {visible.map((c) => (
              <CampaignRow
                key={c.id}
                c={c}
                onEdit={() => setEditing(c)}
                onToggle={() => toggle(c)}
                onVerify={() => verifyDates(c)}
                onDelete={() => remove(c)}
                onRun={() => runNow(c.id)}
                defaultEmail={admin?.email || ''}
              />
            ))}
          </div>
            )}
          </>
        )
      )}

      {tab === 'schedule' && <ScheduleTab />}
      {tab === 'analytics' && <AnalyticsTab campaigns={campaigns} />}
    </div>
  );
}

/*
  The calendar is sixty occasions long, which is past the point where a flat
  list is a list — it is a place to lose things. These are the four questions
  an admin actually arrives with, and each one is a control:

    "which Diwali row is it"      → search
    "show me the fixed ones"      → how it repeats (fixed date / lunar / rule)
    "what is coming up"           → a window on the next occurrence
    "what still needs me"         → needs dates verified / paused / no countdown

  All four narrow the same list, and the counter says how much of it is left,
  so a filter can never silently hide everything.
*/
const RECURRENCE_FILTERS = [
  { value: '', label: 'Any schedule' },
  { value: 'yearly_fixed', label: 'Fixed date (26 Jan, 25 Dec)' },
  { value: 'dates', label: 'Lunar / moves each year' },
  { value: 'nth_weekday', label: 'Rule-based (2nd Sunday…)' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'user_field', label: "Each customer's own date" },
];

const WINDOWS = [
  { value: '', label: 'Any time' },
  { value: 30, label: 'Next 30 days' },
  { value: 60, label: 'Next 60 days' },
  { value: 90, label: 'Next 90 days' },
];

const FLAGS = [
  { value: '', label: 'Everything' },
  { value: 'needsCheck', label: 'Dates need verifying' },
  { value: 'paused', label: 'Paused' },
  { value: 'active', label: 'Active only' },
];

const SORTS = [
  { value: 'next', label: 'Next to send' },
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'sent', label: 'Most sent' },
  { value: 'type', label: 'Grouped by type' },
];

const daysUntil = (isoDate, today) => {
  if (!isoDate) return Infinity;
  const [ay, am, ad] = String(today).split('-').map(Number);
  const [by, bm, bd] = String(isoDate).split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
};

function CampaignFilters({ q, setQ, count, total }) {
  const [open, setOpen] = useState(false);
  const set = (k, v) => setQ((p) => ({ ...p, [k]: v }));
  const dirty = q.text || q.type || q.recurrence || q.window !== '' || q.flag;

  const activeCount = [q.type, q.recurrence, q.window, q.flag].filter((v) => v !== '' && v != null).length;

  /*
    Search stays OUT of the fold and always visible — it is the control people
    reach for, and burying the one you use every time behind a toggle is how a
    collapsed bar becomes an obstacle rather than a tidy-up.
  */
  return (
    <div className="mb-4">
      <div className="bg-white rounded-2xl shadow-soft p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[190px] relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              className="input pl-9"
              placeholder="Find an occasion — Diwali, birthday, Republic Day…"
              value={q.text}
              onChange={(e) => set('text', e.target.value)}
            />
          </div>
          <button
            onClick={() => setOpen((v) => !v)}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold ${
              activeCount ? 'border-brand bg-brand/10 text-ink' : 'border-gray-200 text-ink-muted hover:border-brand/50'
            }`}
          >
            <SlidersHorizontal size={14} /> Filters
            {activeCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-ink text-[10px] font-bold grid place-items-center">
                {activeCount}
              </span>
            )}
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <label className="block">
            <select className="input w-auto" value={q.sort} onChange={(e) => set('sort', e.target.value)}>
              {SORTS.map((x) => <option key={x.value} value={x.value}>Sort: {x.label}</option>)}
            </select>
          </label>
        </div>

        {open && (
        <div className="flex flex-wrap items-end gap-2 mt-3 pt-3 border-t border-gray-50">
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">Type</span>
          <select className="input w-auto mt-1" value={q.type} onChange={(e) => set('type', e.target.value)}>
            <option value="">All types</option>
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">How it repeats</span>
          <select className="input w-auto mt-1" value={q.recurrence} onChange={(e) => set('recurrence', e.target.value)}>
            {RECURRENCE_FILTERS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">Coming up</span>
          <select className="input w-auto mt-1" value={q.window} onChange={(e) => set('window', e.target.value === '' ? '' : Number(e.target.value))}>
            {WINDOWS.map((w) => <option key={String(w.value)} value={w.value}>{w.label}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">Needs attention</span>
          <select className="input w-auto mt-1" value={q.flag} onChange={(e) => set('flag', e.target.value)}>
            {FLAGS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
          </select>
        </label>

        </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-2 px-1">
        <SlidersHorizontal size={13} className="text-ink-muted" />
        <span className="text-xs text-ink-muted">
          Showing <strong className="text-ink">{count}</strong> of {total} occasions
        </span>
        {dirty && (
          <button
            onClick={() => setQ({ text: '', type: '', recurrence: '', window: '', flag: '', sort: q.sort })}
            className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink"
          >
            <X size={13} /> Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

/* The five things worth knowing before scrolling — each one a filter, so a
   number that looks wrong is one click from the rows behind it. */
function CalendarSummary({ campaigns, today, onPick }) {
  const stats = useMemo(() => {
    const active = campaigns.filter((c) => c.isActive);
    const soon = active
      .filter((c) => daysUntil(c.nextOccurrence, today) <= 30)
      .sort((a, b) => daysUntil(a.nextOccurrence, today) - daysUntil(b.nextOccurrence, today));
    return {
      total: campaigns.length,
      active: active.length,
      onCountdown: campaigns.filter((c) => c.onCountdown).length,
      // Only festivals/holidays/sales/personal dates can run a countdown at
      // all, so "12 on the countdown" alone is meaningless — it needs the
      // denominator of what could be.
      eligible: campaigns.filter((c) => c.canCountdown).length,
      needsCheck: campaigns.filter((c) => c.needsDateCheck && c.isActive).length,
      soon,
    };
  }, [campaigns, today]);

  const next = stats.soon[0];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      <button onClick={() => onPick({ flag: 'active' })}
        className="bg-white rounded-2xl shadow-soft p-4 text-left hover:shadow-md transition">
        <div className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">Live occasions</div>
        <div className="text-2xl font-bold text-ink mt-1">{stats.active}</div>
        <div className="text-[11px] text-ink-muted">of {stats.total} in the calendar</div>
      </button>

      <button onClick={() => onPick({ window: 30 })}
        className="bg-white rounded-2xl shadow-soft p-4 text-left hover:shadow-md transition">
        <div className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">Coming in 30 days</div>
        <div className="text-2xl font-bold text-ink mt-1">{stats.soon.length}</div>
        <div className="text-[11px] text-ink-muted truncate">
          {next ? `next: ${next.name}, ${next.nextOccurrenceLabel}` : 'nothing scheduled'}
        </div>
      </button>

      <div className="bg-white rounded-2xl shadow-soft p-4">
        <div className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">On the 7-day countdown</div>
        <div className="text-2xl font-bold text-indigo-700 mt-1">{stats.eligible}</div>
        <div className="text-[11px] text-ink-muted">
          every festival, holiday, sale, birthday &amp; anniversary — automatic
        </div>
      </div>

      <button onClick={() => onPick({ flag: 'needsCheck' })}
        className={`rounded-2xl shadow-soft p-4 text-left hover:shadow-md transition ${
          stats.needsCheck ? 'bg-amber-50 border border-amber-200' : 'bg-white'
        }`}>
        <div className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">Dates to verify</div>
        <div className={`text-2xl font-bold mt-1 ${stats.needsCheck ? 'text-amber-700' : 'text-ink'}`}>
          {stats.needsCheck}
        </div>
        <div className="text-[11px] text-ink-muted">
          {stats.needsCheck ? 'lunar dates nobody has confirmed' : 'all confirmed'}
        </div>
      </button>
    </div>
  );
}

function EmptyCalendar({ onSeed, busy }) {
  return (
    <div className="bg-white rounded-2xl shadow-soft p-10 text-center">
      <Gift size={30} className="mx-auto text-brand mb-3" />
      <h2 className="font-display font-bold text-lg mb-1">No occasions yet</h2>
      <p className="text-sm text-ink-muted max-w-lg mx-auto mb-5">
        Load the ready-made Indian calendar — Diwali, Holi, Rakhi, Christmas,
        Republic Day, Valentine's week, the weekend nudge and birthday/anniversary
        wishes. Everything stays editable, and lunar dates arrive flagged for
        you to verify.
      </p>
      <button
        onClick={onSeed}
        disabled={busy}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand text-ink text-sm font-bold shadow-soft hover:brightness-105 disabled:opacity-50"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Load Indian calendar
      </button>
    </div>
  );
}

function CampaignRow({ c, onEdit, onToggle, onVerify, onDelete, onRun, defaultEmail }) {
  const [testing, setTesting] = useState(false);
  const [email, setEmail] = useState(defaultEmail || '');
  const [offset, setOffset] = useState(0);
  const [userId, setUserId] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  /*
    The test button fires BOTH channels at once, on purpose.

    Email and push fail in completely unrelated ways — SMTP on one side, FCM
    credentials / a stale device token on the other — so a test that only
    proves the email works tells you nothing about whether the phone will
    buzz. Both go out, and both outcomes come back separately: the push
    result carries the server's actual reason ("no device token registered")
    rather than a generic failure, because that reason is the only thing that
    makes an absent notification debuggable.

    The push targets the app account signed in with this same email address —
    i.e. the phone in the admin's hand — which the backend resolves.
  */
  const sendTest = async () => {
    const to = email.trim();
    if (!to) { toast.error('Enter an email address'); return; }
    setSending(true);
    setResult(null);
    try {
      const res = await api.post(`/admin/campaigns/${c.id}/test`, {
        email: to,
        offsetDay: Number(offset),
        push: true,
        // Only when the admin's inbox and the test phone are different
        // accounts — otherwise the backend finds the app account itself.
        userId: userId.trim() ? Number(userId.trim()) : undefined,
      });
      const r = res.data?.data?.result || {};
      setResult(r);
      if (r.email?.ok && r.push?.ok) toast.success(`Email + notification sent to ${to}`);
      else if (r.email?.ok) toast.success(`Email sent — notification did not go (see below)`);
      else if (r.push?.ok) toast.success('Notification sent — email failed (see below)');
      else toast.error('Neither the email nor the notification went out');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Test failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`bg-white rounded-2xl shadow-soft p-4 border ${c.isActive ? 'border-transparent' : 'border-dashed border-gray-300 opacity-70'}`}>
      <div className="flex flex-wrap items-start gap-3">
        {c.imageUrl ? (
          <img src={c.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-surface-alt shrink-0 flex items-center justify-center text-ink-muted">
            <CalendarHeart size={20} />
          </div>
        )}

        <div className="flex-1 min-w-[240px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-ink">{c.name}</span>
            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${TYPE_CHIP[c.type] || TYPE_CHIP.sale}`}>
              {c.type}
            </span>
            {c.needsDateCheck && c.isActive && (
              <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                verify dates
              </span>
            )}
            {c.onCountdown && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Timer size={10} /> 7-day countdown
              </span>
            )}
            {!c.isActive && (
              <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                paused
              </span>
            )}
          </div>

          <div className="text-xs text-ink-muted mt-1">
            {describeSchedule(c)} · sends {describeOffsets(c.sendOffsets)} at{' '}
            {String(c.sendHourIst).padStart(2, '0')}:{String(c.sendMinuteIst).padStart(2, '0')} IST
            {c.nextOccurrenceLabel ? ` · next: ${c.nextOccurrenceLabel}` : ''}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            {(c.channels || []).map((ch) => {
              const meta = CHANNELS.find((x) => x.value === ch);
              if (!meta) return null;
              return (
                <span key={ch} className="inline-flex items-center gap-1 text-[11px] text-ink-muted bg-surface-alt px-2 py-0.5 rounded-md">
                  <meta.icon size={11} /> {meta.label}
                </span>
              );
            })}
            <span className="text-[11px] text-ink-muted">
              · {c.stats?.sent || 0} sent{c.stats?.failed ? `, ${c.stats.failed} failed` : ''}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {c.needsDateCheck && (
            <button onClick={onVerify} title="Mark dates as verified"
              className="p-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
              <CheckCircle2 size={15} />
            </button>
          )}
          <button onClick={() => setTesting((v) => !v)} title="Send a test email + phone notification to yourself"
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold ${
              testing ? 'border-brand bg-brand/10 text-ink' : 'border-gray-200 text-ink-muted hover:border-brand/50'
            }`}>
            <FlaskConical size={15} /> Test
          </button>
          <button onClick={onRun} title="Run this campaign now"
            className="p-2 rounded-lg border border-gray-200 hover:border-brand/50 text-ink-muted">
            <Play size={15} />
          </button>
          <button onClick={onToggle} title={c.isActive ? 'Pause' : 'Activate'}
            className={`p-2 rounded-lg border ${c.isActive ? 'border-gray-200 text-ink-muted' : 'border-emerald-200 bg-emerald-50 text-emerald-700'} hover:border-brand/50`}>
            <Power size={15} />
          </button>
          <button onClick={onEdit}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-ink hover:border-brand/50">
            Edit
          </button>
          <button onClick={onDelete} title="Delete"
            className="p-2 rounded-lg border border-gray-200 text-red-500 hover:border-red-300 hover:bg-red-50">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {testing && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[220px]">
              <label className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Send a real test to</label>
              <input className="input mt-1" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="w-28">
              <label className="text-[11px] font-bold uppercase tracking-wide text-ink-muted" title="Leave blank to use the app account with the email above">
                App user ID
              </label>
              <input className="input mt-1" placeholder="auto" value={userId} onChange={(e) => setUserId(e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Which beat</label>
              <select className="input mt-1" value={offset} onChange={(e) => setOffset(e.target.value)}>
                {(c.sendOffsets || [0]).slice().sort((a, b) => a - b).map((o) => (
                  <option key={o} value={o}>{stageLabel(o)}</option>
                ))}
              </select>
            </div>
            <button onClick={sendTest} disabled={sending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-ink text-sm font-bold disabled:opacity-50">
              {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              Send email + notification
            </button>
          </div>

          {/*
            Both outcomes, separately. A push that did not go out reports the
            server's own reason — "no device token", "FCM not configured" —
            because that sentence is the difference between a five-minute fix
            and an afternoon of guessing.
          */}
          {result && (
            <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {[
                { key: 'email', icon: Mail, label: 'Email' },
                { key: 'push', icon: Smartphone, label: 'Phone notification' },
              ].map(({ key, icon: Icon, label }) => {
                const r = result[key];
                if (!r) return null;
                return (
                  <div key={key} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
                    r.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                    <Icon size={14} className="mt-0.5 shrink-0" />
                    <div>
                      <strong>{label}: {r.ok ? 'sent' : 'not sent'}</strong>
                      {r.ok && r.to ? <div className="opacity-80">to {r.to}</div> : null}
                      {!r.ok && r.reason ? <div className="opacity-90">{r.reason}</div> : null}
                      {/* Whether this mail's links can actually be measured —
                          an untracked test looks identical to a tracked one. */}
                      {r.ok && r.note ? (
                        <div className={`mt-1 text-[11px] ${r.tracked === false ? 'text-amber-700' : 'opacity-80'}`}>
                          {r.tracked === false ? '⚠ ' : '✓ '}{r.note}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-[11px] text-ink-muted mt-2">
            Sends the real thing — the “{stageLabel(offset)}” version — to that inbox and to the
            phone signed into the app with the same address. A test never counts as
            a real greeting: the recipient still gets theirs on the day.
          </p>
        </div>
      )}
    </div>
  );
}

function CampaignForm({ initial, onClose, onSaved }) {
  const [d, setD] = useState(() => ({ ...blank(), ...initial, offsetCopy: initial.offsetCopy || {} }));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setD((p) => ({ ...p, [k]: v }));

  const datesText = useMemo(() => (d.occurrences || []).join('\n'), [d.occurrences]);

  const toggleIn = (key, value) => {
    const list = d[key] || [];
    set(key, list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  };

  const setOffsetCopy = (offset, field, value) => {
    const next = { ...(d.offsetCopy || {}) };
    next[String(offset)] = { ...(next[String(offset)] || {}), [field]: value };
    set('offsetCopy', next);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...d,
        month: Number(d.month),
        day: Number(d.day),
        weekday: Number(d.weekday),
        nthWeek: Number(d.nthWeek),
        sendHourIst: Number(d.sendHourIst),
        sendMinuteIst: Number(d.sendMinuteIst),
        sendOffsets: (d.sendOffsets || []).map(Number),
        targetCities: (d.targetCities || []).filter(Boolean),
        targetAudienceIds: (d.targetAudienceIds || []).map(Number).filter(Boolean),
        promoteExperienceIds: (d.promoteExperienceIds || []).map(Number).filter(Boolean),
        suggestKeywords: (d.suggestKeywords || []).filter(Boolean),
      };
      if (d.id) await api.put(`/admin/campaigns/${d.id}`, payload);
      else await api.post('/admin/campaigns', payload);
      toast.success(d.id ? 'Campaign updated' : 'Campaign created');
      await onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const rec = RECURRENCES.find((r) => r.value === d.recurrence);

  return (
    <div className="bg-white rounded-2xl shadow-soft p-5 mb-6 border border-brand/20">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-display font-bold text-lg">{d.id ? `Edit ${d.name}` : 'Add occasion'}</h2>
          <p className="text-xs text-ink-muted">Saved changes apply to the very next sweep — no restart needed.</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-alt text-ink-muted"><X size={18} /></button>
      </div>

      {/* 1 — identity */}
      <Section n="1" title="What is the occasion?">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Name">
            <input className="input" value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="Diwali" />
          </Field>
          <Field label="Type">
            <select className="input" value={d.type} onChange={(e) => set('type', e.target.value)}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      {/* 2 — when */}
      <Section n="2" title="When does it happen?" hint={rec?.hint}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
          {RECURRENCES.map((r) => (
            <button
              key={r.value}
              onClick={() => set('recurrence', r.value)}
              className={`text-left px-3 py-2.5 rounded-xl border ${
                d.recurrence === r.value ? 'border-brand bg-brand/5' : 'border-gray-200 hover:border-brand/40'
              }`}
            >
              <span className="font-semibold text-sm text-ink">{r.label}</span>
              <p className="text-[11px] text-ink-muted mt-1 leading-snug">{r.hint}</p>
            </button>
          ))}
        </div>

        {d.recurrence === 'dates' && (
          <Field label="Dates (one per line, YYYY-MM-DD)">
            <textarea
              className="input font-mono text-sm"
              rows={4}
              value={datesText}
              onChange={(e) => set('occurrences', e.target.value.split(/[\n,]/).map((s) => s.trim()).filter(Boolean))}
              placeholder={'2026-11-08\n2027-10-29'}
            />
            <p className="text-[11px] text-ink-muted mt-1">
              Add a few years at once — lunar dates are published well in advance,
              so this list is the only maintenance this campaign ever needs.
            </p>
          </Field>
        )}

        {d.recurrence === 'yearly_fixed' && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Month">
              <select className="input" value={d.month} onChange={(e) => set('month', e.target.value)}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </Field>
            <Field label="Day">
              <input type="number" min={1} max={31} className="input" value={d.day} onChange={(e) => set('day', e.target.value)} />
            </Field>
          </div>
        )}

        {d.recurrence === 'nth_weekday' && (
          <>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Which one">
                <select className="input" value={d.nthWeek} onChange={(e) => set('nthWeek', e.target.value)}>
                  {[1, 2, 3, 4, -1].map((n) => <option key={n} value={n}>{NTH_LABEL[n]}</option>)}
                </select>
              </Field>
              <Field label="Weekday">
                <select className="input" value={d.weekday} onChange={(e) => set('weekday', e.target.value)}>
                  {WEEKDAYS.map((w, i) => <option key={w} value={i}>{w}</option>)}
                </select>
              </Field>
              <Field label="Month">
                <select className="input" value={d.month} onChange={(e) => set('month', e.target.value)}>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </Field>
            </div>
            <p className="text-[11px] text-ink-muted mt-1">
              Mother's Day = 2nd Sunday of May, Father's Day = 3rd Sunday of June,
              Friendship Day = 1st Sunday of August. The rule never changes, so
              this is computed for every future year — nothing to re-enter.
            </p>
          </>
        )}

        {d.recurrence === 'weekly' && (
          <Field label="Which day">
            <select className="input" value={d.weekday} onChange={(e) => set('weekday', e.target.value)}>
              {WEEKDAYS.map((w, i) => <option key={w} value={i}>{w}</option>)}
            </select>
          </Field>
        )}

        {d.recurrence === 'user_field' && (
          <Field label="Which personal date">
            <select className="input" value={d.userField} onChange={(e) => set('userField', e.target.value)}>
              <option value="dob">Date of birth</option>
              <option value="anniversary">Anniversary</option>
            </select>
            <p className="text-[11px] text-ink-muted mt-1">
              Only users who filled this in on their profile are greeted — the rest are simply skipped.
            </p>
          </Field>
        )}

        {d.needsDateCheck && (
          <label className="flex items-center gap-2 mt-3 text-xs text-amber-800">
            <input type="checkbox" checked={!d.needsDateCheck} onChange={() => set('needsDateCheck', false)} />
            These dates are correct (removes the warning chip)
          </label>
        )}
      </Section>

      {/* 3 — timing */}
      <Section n="3" title="When should the message go out?">
        <div className="flex flex-wrap gap-2 mb-3">
          {OFFSET_CHOICES.map((o) => (
            <button
              key={o.value}
              onClick={() => toggleIn('sendOffsets', o.value)}
              className={`px-3 py-1.5 rounded-lg border text-sm font-semibold ${
                (d.sendOffsets || []).includes(o.value)
                  ? 'border-brand bg-brand/10 text-ink'
                  : 'border-gray-200 text-ink-muted hover:border-brand/40'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Send time (IST)">
            <div className="flex items-center gap-2">
              <input type="number" min={0} max={23} className="input" value={d.sendHourIst} onChange={(e) => set('sendHourIst', e.target.value)} />
              <span className="text-ink-muted">:</span>
              <input type="number" min={0} max={59} className="input" value={d.sendMinuteIst} onChange={(e) => set('sendMinuteIst', e.target.value)} />
            </div>
          </Field>
          <Field label="Channels">
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map((ch) => (
                <button
                  key={ch.value}
                  onClick={() => toggleIn('channels', ch.value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold ${
                    (d.channels || []).includes(ch.value)
                      ? 'border-brand bg-brand/10 text-ink'
                      : 'border-gray-200 text-ink-muted hover:border-brand/40'
                  }`}
                >
                  <ch.icon size={14} /> {ch.label}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </Section>

      {/* 4 — content */}
      <Section n="4" title="What does it say?" hint="Use {{name}} for the person's first name and {{occasion}} for the occasion.">
        <div className="grid gap-3">
          <Field label="Title (email subject + push heading)">
            <input className="input" value={d.title} onChange={(e) => set('title', e.target.value)} />
          </Field>
          <Field label="Message">
            <textarea className="input" rows={3} value={d.message || ''} onChange={(e) => set('message', e.target.value)} />
          </Field>

          {(d.sendOffsets || []).filter((o) => o < 0).map((offset) => {
            const key = String(offset);
            const perOffset = d.offsetCopy?.[key] || {};
            const active = Array.isArray(perOffset.channels) && perOffset.channels.length
              ? perOffset.channels
              : (d.channels || []);
            return (
              <div key={key} className="rounded-xl border border-gray-200 p-3">
                <div className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-2">
                  {Math.abs(offset)} day{Math.abs(offset) === 1 ? '' : 's'} before — version (optional)
                </div>
                <p className="text-[11px] text-ink-muted mb-2">
                  “Happy Diwali” a day early reads wrong. Write the eve version
                  here; leave it blank to reuse the message above.
                </p>
                <input
                  className="input mb-2"
                  placeholder="Diwali is tomorrow, {{name}}"
                  value={perOffset.title || ''}
                  onChange={(e) => setOffsetCopy(offset, 'title', e.target.value)}
                />
                <textarea
                  className="input mb-3"
                  rows={2}
                  placeholder="Last-minute plans that still have slots for tomorrow."
                  value={perOffset.message || ''}
                  onChange={(e) => setOffsetCopy(offset, 'message', e.target.value)}
                />
                {/* The day-before wave usually should NOT email — two festival
                    mails in two days is what gets a sender filtered. */}
                <div className="text-[11px] font-bold uppercase tracking-wide text-ink-muted mb-1.5">
                  Channels for this wave
                </div>
                <div className="flex flex-wrap gap-2">
                  {CHANNELS.map((ch) => (
                    <button
                      key={ch.value}
                      onClick={() => {
                        const next = active.includes(ch.value)
                          ? active.filter((x) => x !== ch.value)
                          : [...active, ch.value];
                        setOffsetCopy(offset, 'channels', next);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                        active.includes(ch.value)
                          ? 'border-brand bg-brand/10 text-ink'
                          : 'border-gray-200 text-ink-muted hover:border-brand/40'
                      }`}
                    >
                      <ch.icon size={13} /> {ch.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          <Field label="Banner image (shown at the top of the email)">
            <Dropzone
              instant
              value={d.imageUrl || ''}
              onChange={(url) => set('imageUrl', url || '')}
              existingUrl={d.imageUrl || ''}
              onClearExisting={() => set('imageUrl', '')}
              placeholder="Drop the festival creative here"
              subLabel="Wide image, ~1200×600. Under 5MB."
            />
          </Field>

          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Button label">
              <input className="input" value={d.ctaLabel || ''} onChange={(e) => set('ctaLabel', e.target.value)} />
            </Field>
            <Field label="Button link (site path)">
              <input className="input" value={d.ctaPath || ''} onChange={(e) => set('ctaPath', e.target.value)} placeholder="/experiences?occasion=diwali" />
            </Field>
            <Field label="Coupon code (optional)">
              <input className="input" value={d.couponCode || ''} onChange={(e) => set('couponCode', e.target.value)} placeholder="DIWALI10" />
            </Field>
          </div>
        </div>
      </Section>

      {/* 5 — targeting */}
      <Section n="5" title="Who gets it?" hint="Leave blank to greet every opted-in customer.">
        <Field label="Only these cities (comma separated)">
          <input
            className="input"
            value={(d.targetCities || []).join(', ')}
            onChange={(e) => set('targetCities', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
            placeholder="Delhi, Rishikesh"
          />
        </Field>
      </Section>

      {/* 6 — what to suggest */}
      <Section
        n="6"
        title="Which experiences should it suggest?"
        hint="This is the half that turns a wish into a booking. Yoga Day should show wellness retreats, not random listings."
      >
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Suggestion keywords (comma separated)">
            <input
              className="input"
              value={(d.suggestKeywords || []).join(', ')}
              onChange={(e) => set('suggestKeywords', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
              placeholder="yoga, wellness, retreat"
            />
            <p className="text-[11px] text-ink-muted mt-1">
              Matched against each experience's name, description and location —
              so it works without tagging the catalogue first. Max 8, at least 3
              letters each.
            </p>
          </Field>
          <Field label="Audience IDs from the taxonomy (optional)">
            <input
              className="input"
              value={(d.targetAudienceIds || []).join(', ')}
              onChange={(e) => set('targetAudienceIds', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
              placeholder="2, 5"
            />
            <p className="text-[11px] text-ink-muted mt-1">
              The precise match (couple / family / friends) once listings are
              tagged. Takes priority over keywords when it finds anything.
            </p>
          </Field>
          <Field label="Or hand-pick exact experience IDs">
            <input
              className="input"
              value={(d.promoteExperienceIds || []).join(', ')}
              onChange={(e) => set('promoteExperienceIds', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
              placeholder="12, 34, 56"
            />
            <p className="text-[11px] text-ink-muted mt-1">
              Overrides everything above. With all three blank, the email falls
              back to recent published experiences — from the reader's own city
              when we know it.
            </p>
          </Field>
        </div>
      </Section>

      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand text-ink text-sm font-bold shadow-soft hover:brightness-105 disabled:opacity-50"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save campaign
        </button>
        <button onClick={onClose} className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-ink hover:border-brand/50">
          Cancel
        </button>
      </div>
    </div>
  );
}

function ScheduleTab() {
  const [days, setDays] = useState(60);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPerUser, setShowPerUser] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.get(`/admin/campaigns/upcoming?days=${days}`)
      .then((res) => { if (alive) setRows(res.data?.data?.sends || []); })
      .catch((err) => toast.error(err.response?.data?.message || 'Could not load schedule'))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [days]);

  // Birthday/anniversary campaigns are due EVERY day (they only fire for the
  // users whose date matches), so they'd bury the festivals in this timeline.
  const visible = showPerUser ? rows : rows.filter((r) => !r.perUser);
  const grouped = visible.reduce((acc, r) => {
    (acc[r.sendDate] = acc[r.sendDate] || []).push(r);
    return acc;
  }, {});

  return (
    <div className="bg-white rounded-2xl shadow-soft p-5">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h2 className="font-display font-bold text-lg">What goes out next</h2>
        <div className="flex-1" />
        <label className="flex items-center gap-2 text-xs text-ink-muted">
          <input type="checkbox" checked={showPerUser} onChange={(e) => setShowPerUser(e.target.checked)} />
          include birthday / anniversary
        </label>
        <select className="input w-auto" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={30}>Next 30 days</option>
          <option value={60}>Next 60 days</option>
          <option value={120}>Next 120 days</option>
          <option value={365}>Next year</option>
        </select>
      </div>

      {loading ? (
        <div className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
      ) : Object.keys(grouped).length === 0 ? (
        <p className="text-sm text-ink-muted py-8 text-center">Nothing scheduled in this window.</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, list]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wide text-ink-muted">
                  {list[0].sendDateLabel}
                </span>
                {/* Occasions sharing a groupKey reach the same people at the
                    same minute, so they go out as ONE merged message. */}
                {mergedCount(list) > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Merge size={10} /> merged into {mergedCount(list) === 1 ? 'one message' : `${mergedCount(list)} messages`}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {list.map((r, i) => (
                  <div key={`${r.campaignId}-${r.offsetDay}-${i}`} className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 px-3 py-2">
                    <span className="font-semibold text-sm text-ink">{r.name}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${TYPE_CHIP[r.type] || TYPE_CHIP.sale}`}>
                      {r.type}
                    </span>
                    {/* Which beat of the run-up — "1 week to go" reads far
                        better in a timeline than "7 day(s) before". */}
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                      r.isRamp ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-surface-alt text-ink-muted border-gray-200'
                    }`}>
                      {r.stage || r.when}
                    </span>
                    {r.offsetDay !== 0 && (
                      <span className="text-xs text-ink-muted">· occasion {r.occurrenceLabel}</span>
                    )}
                    <span className="text-xs text-ink-muted">· {r.sendAt}</span>
                    {mergedWith(r, list).length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700">
                        <Merge size={11} /> one message with {mergedWith(r, list).join(', ')}
                      </span>
                    )}
                    {/* The Valentine-week chain: today's wish also previews
                        tomorrow's occasion, with its own suggestions. */}
                    {(r.previews || []).length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-indigo-700">
                        <Timer size={11} /> previews {r.previews.join(', ')} for tomorrow
                      </span>
                    )}
                    <div className="flex-1" />
                    {r.needsDateCheck && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                        verify date
                      </span>
                    )}
                    <span className="text-[11px] text-ink-muted">{(r.channels || []).join(' · ')}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/*
  ── Occasion Marketing → Analytics ────────────────────────────────────────

  One question, asked five ways: did the wave do anything?

      sent → opened → clicked → explored an experience → booked

  The five steps are not equally trustworthy, and the page says so instead of
  lining them up as peers. "Sent" is a row in a table. "Opened" is a tracking
  pixel, which Gmail proxies and Apple Mail pre-fetches — it over-counts, and
  it is drawn muted and captioned for that reason. "Clicked" and "Explored"
  are real actions. "Influenced revenue" is last-touch attribution over a
  7-day window: a claim, not a fact, labelled as such everywhere.

  Everything on this page describes ONE slice — the filter row feeds a single
  backend query, so no card can disagree with the table under it.
*/

// Four categorical hues, fixed order, never cycled. Validated for the light
// admin surface: lightness band, chroma floor, CVD separation (worst adjacent
// pair ΔE 10.2 deutan), normal-vision floor and 3:1 contrast all pass. The
// admin panel has no dark mode, so there is no second set to keep in step.
const SERIES = {
  sent: '#4f46e5', // indigo
  opened: '#d97706', // amber
  clicked: '#0d9488', // teal
  explored: '#e11d48', // rose
};

// The funnel is one measure across ordered stages, so it gets ONE hue getting
// lighter as it narrows — not four categorical colours, which would imply the
// stages are unrelated things.
const FUNNEL_HUE = ['#312e81', '#3730a3', '#4f46e5', '#6366f1', '#818cf8', '#a5b4fc'];

const INK = '#101828';
const MUTED = '#667085';
const GRID = '#eef1f5';

const rupees = (paise) => {
  const n = Math.round((paise || 0) / 100);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
};

const pct = (part, whole) => (whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : '—');

const WINDOW_LABEL = {
  7: 'Last 7 days', 30: 'Last 30 days', 90: 'Last 90 days', 365: 'Last year', 730: 'Everything',
};

const BEAT_LABEL = {
  '-7': '1 week before',
  '-3': '3 days before',
  '-2': '2 days before',
  '-1': 'Day before',
  0: 'On the day',
};
const beatLabel = (o) => BEAT_LABEL[String(o)] || `${Math.abs(o)} days before`;

/* Shared tooltip — same shell for every chart on the page, so a hover means
   the same thing wherever it happens. */
function ChartTip({ active, payload, label, suffix = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-lg px-3 py-2 text-xs">
      <div className="font-bold text-ink mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm" style={{ background: p.color }} />
          <span className="text-ink-muted">{p.name}</span>
          <span className="font-semibold text-ink ml-auto">{p.value}{suffix}</span>
        </div>
      ))}
    </div>
  );
}

function Kpi({ label, value, sub, icon: Icon, tone = 'text-ink', soft }) {
  return (
    <div className="bg-white rounded-2xl shadow-soft p-4">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
        {Icon && <Icon size={13} />} {label}
        {soft && (
          <span
            title="Estimated — mail clients pre-fetch and proxy images, so opens over-count."
            className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200"
          >
            est.
          </span>
        )}
      </div>
      <div className={`text-2xl font-bold mt-2 ${tone}`}>{value}</div>
      {sub && <div className="text-[11px] text-ink-muted mt-0.5">{sub}</div>}
    </div>
  );
}

function AnalyticsTab({ campaigns }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState({
    days: 90, type: '', campaignId: '', channel: '', offsetDay: '', includeTests: '',
  });

  const setFilter = (k, v) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const q = new URLSearchParams(
      Object.entries(f).filter(([, v]) => v !== '' && v !== null)
    ).toString();
    api.get(`/admin/campaigns/analytics?${q}`)
      .then((res) => { if (alive) setData(res.data?.data || null); })
      .catch((err) => toast.error(err.response?.data?.message || 'Could not load analytics'))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [f]);

  const fn = data?.funnel || {};
  const a = data?.audience || {};

  // The funnel, as one ordered list. Rendered as bars rather than a tapered
  // polygon: a polygon encodes the drop-off in an area nobody can compare,
  // while a bar's length is the number.
  const funnelSteps = useMemo(() => ([
    { key: 'sent', label: 'Delivered', value: fn.sent || 0, hard: true },
    { key: 'opened', label: 'Opened (email)', value: fn.opened || 0, hard: false },
    { key: 'clicked', label: 'Clicked through', value: fn.clicked || 0, hard: true },
    { key: 'landed', label: 'Reached the page', value: fn.landed || 0, hard: true },
    { key: 'explored', label: 'Explored an experience', value: fn.explored || 0, hard: true },
    { key: 'booked', label: 'Booked within 7 days', value: fn.bookings || 0, hard: false },
  ]), [fn]);

  const timeline = (data?.timeline || []).map((t) => ({
    date: t.date?.slice(5) || '',
    Delivered: t.sent,
    Clicked: t.clicked,
    Explored: t.explored,
  }));

  const beats = (data?.beats || []).map((b) => ({
    beat: beatLabel(b.offsetDay),
    offsetDay: b.offsetDay,
    sent: b.sent,
    clicked: b.clicked,
    rate: b.sent ? Number(((b.clicked / b.sent) * 100).toFixed(1)) : 0,
  }));

  const top = fn.sent || 0;

  return (
    <div className="space-y-5">
      {/* ── Filters, folded by default with a count of what is applied. ─── */}
      <FilterShell
        activeCount={[f.type, f.campaignId, f.channel, f.offsetDay].filter((v) => v !== '' && v != null).length}
        summary={`${WINDOW_LABEL[f.days] || `${f.days} days`}${
          f.type ? ` · ${f.type}` : ''}${f.channel ? ` · ${f.channel}` : ''}${
          f.offsetDay !== '' ? ` · ${beatLabel(Number(f.offsetDay))}` : ''}`}
        right={(
          <>
            {/* Kept out of the collapsed fold on purpose: it changes every
                number on the page, so it must be visible while they are. */}
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted cursor-pointer mr-2">
              <input
                type="checkbox"
                checked={f.includeTests === '1'}
                onChange={(e) => setFilter('includeTests', e.target.checked ? '1' : '')}
              />
              Include test sends
            </label>
            {loading ? <Loader2 size={16} className="animate-spin text-brand" /> : (
          [f.type, f.campaignId, f.channel, f.offsetDay].some((v) => v !== '' && v != null) && (
            <button
              onClick={() => setF({
                days: f.days, type: '', campaignId: '', channel: '', offsetDay: '', includeTests: f.includeTests,
              })}
              className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink"
            >
              <X size={13} /> Clear
            </button>
          ))}
          </>
        )}
      >
        <Filter label="Window">
          <select className="input w-auto" value={f.days} onChange={(e) => setFilter('days', Number(e.target.value))}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
            <option value={730}>Everything</option>
          </select>
        </Filter>
        <Filter label="Occasion type">
          <select className="input w-auto" value={f.type} onChange={(e) => setFilter('type', e.target.value)}>
            <option value="">All types</option>
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Filter>
        <Filter label="Occasion">
          <select className="input w-auto max-w-[190px]" value={f.campaignId} onChange={(e) => setFilter('campaignId', e.target.value)}>
            <option value="">All occasions</option>
            {(campaigns || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Filter>
        <Filter label="Channel">
          <select className="input w-auto" value={f.channel} onChange={(e) => setFilter('channel', e.target.value)}>
            <option value="">All channels</option>
            {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Filter>
        <Filter label="Beat">
          <select className="input w-auto" value={f.offsetDay} onChange={(e) => setFilter('offsetDay', e.target.value)}>
            <option value="">All beats</option>
            {COUNTDOWN_OFFSETS.map((o) => <option key={o} value={o}>{beatLabel(o)}</option>)}
          </select>
        </Filter>
      </FilterShell>

      {!data ? (
        <div className="py-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
      ) : (
        <>
          <TrackingNotice tracking={data.tracking} funnel={fn} />

          {/* ── The numbers worth knowing ────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            <Kpi label="People reached" value={(fn.people || 0).toLocaleString('en-IN')}
              sub={`${(fn.sent || 0).toLocaleString('en-IN')} messages`} icon={Users} />
            <Kpi label="Opened" value={pct(fn.opened, top)} sub={`${fn.opened || 0} of ${top}`} icon={Mail} soft />
            <Kpi label="Click-through" value={pct(fn.clicked, top)} sub={`${fn.clicked || 0} clicked`}
              icon={MousePointerClick} tone="text-teal-700" />
            <Kpi label="Explored an experience" value={pct(fn.explored, top)} sub={`${fn.explored || 0} opened a listing`}
              icon={Sparkles} tone="text-rose-700" />
            <Kpi label="Reached the page" value={(fn.landed || 0).toLocaleString('en-IN')}
              sub={fn.clicked ? `${pct(fn.landed, fn.clicked)} of clicks arrived` : 'no clicks yet'}
              icon={MapPin} />
            <Kpi label="Avg time on page" value={mmss(fn.avgDwellSeconds)}
              sub={`from ${fn.dwellCount || 0} measured visits`} icon={Clock} />
            <Kpi label="Influenced revenue" value={rupees(fn.revenuePaise)}
              sub={`${fn.bookings || 0} bookings within ${data.attributionDays} days`}
              icon={IndianRupee} tone="text-emerald-700" soft />
          </div>

          <div className="grid lg:grid-cols-5 gap-4">
            {/* ── Funnel ────────────────────────────────────────────────── */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-soft p-5">
              <h2 className="font-display font-bold text-base">From inbox to booking</h2>
              <p className="text-[11px] text-ink-muted mb-4">
                Each step as a share of everything delivered in this slice.
              </p>
              <div className="space-y-2.5">
                {funnelSteps.map((s, i) => {
                  const width = top ? Math.max((s.value / top) * 100, s.value ? 2 : 0) : 0;
                  return (
                    <div key={s.key}>
                      <div className="flex items-baseline gap-2 text-xs mb-1">
                        <span className="font-semibold text-ink">{s.label}</span>
                        {!s.hard && (
                          <span className="text-[9px] px-1 py-px rounded bg-amber-50 text-amber-700 border border-amber-200">est.</span>
                        )}
                        <span className="ml-auto font-bold text-ink">{s.value.toLocaleString('en-IN')}</span>
                        <span className="text-ink-muted w-12 text-right">{pct(s.value, top)}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${width}%`, background: FUNNEL_HUE[i] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-ink-muted mt-4 leading-relaxed">
                <strong>Opened</strong> comes from a tracking pixel — mail clients
                pre-fetch and proxy images, so it over-counts. <strong>Influenced
                revenue</strong> is last-touch: a confirmed booking by someone who
                clicked this campaign within {data.attributionDays} days. Useful for
                comparing occasions, not as a claim that the wave caused the sale.
              </p>
            </div>

            {/* ── Over time ─────────────────────────────────────────────── */}
            <div className="lg:col-span-3 bg-white rounded-2xl shadow-soft p-5">
              <h2 className="font-display font-bold text-base">Delivery and response over time</h2>
              <p className="text-[11px] text-ink-muted mb-3">By the occasion&rsquo;s own date.</p>
              {timeline.length === 0 ? (
                <Empty>Nothing has gone out in this window yet.</Empty>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={timeline} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={SERIES.sent} stopOpacity={0.22} />
                        <stop offset="100%" stopColor={SERIES.sent} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={{ stroke: GRID }} />
                    <YAxis tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={false} width={44} />
                    <Tooltip content={<ChartTip />} cursor={{ stroke: MUTED, strokeDasharray: '3 3' }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: MUTED }} />
                    <Area type="monotone" dataKey="Delivered" stroke={SERIES.sent} strokeWidth={2}
                      fill="url(#gSent)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
                    <Line type="monotone" dataKey="Clicked" stroke={SERIES.clicked} strokeWidth={2}
                      dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
                    <Line type="monotone" dataKey="Explored" stroke={SERIES.explored} strokeWidth={2}
                      dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {/* ── Which beat of the countdown actually converts ──────────── */}
            <div className="bg-white rounded-2xl shadow-soft p-5">
              <h2 className="font-display font-bold text-base">Which beat converts</h2>
              <p className="text-[11px] text-ink-muted mb-3">
                Click-through by position in the run-up. This is the number that
                tells you whether a week out is too early.
              </p>
              {beats.length === 0 ? <Empty>No beats have run yet.</Empty> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={beats} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="beat" tick={{ fontSize: 10, fill: MUTED }} tickLine={false} axisLine={{ stroke: GRID }} />
                    <YAxis tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={false} width={44}
                      tickFormatter={(v) => `${v}%`} />
                    <Tooltip content={<ChartTip suffix="%" />} cursor={{ fill: 'rgba(13,148,136,.06)' }} />
                    <Bar dataKey="rate" name="Click-through" fill={SERIES.clicked} radius={[4, 4, 0, 0]} maxBarSize={46} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* ── Channels ──────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-soft p-5">
              <h2 className="font-display font-bold text-base mb-3">By channel</h2>
              <div className="space-y-2">
                {CHANNELS.map((ch) => {
                  const s = (data.channels || {})[ch.value];
                  if (!s) return null;
                  return (
                    <div key={ch.value} className="rounded-xl border border-gray-100 p-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                        <ch.icon size={15} className="text-brand" /> {ch.label}
                        <span className="ml-auto text-xs text-ink-muted">{s.people} people</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 mt-2 text-center">
                        <Mini label="Sent" value={s.sent} />
                        <Mini label="Opened" value={ch.value === 'email' ? s.opened : '—'} />
                        <Mini label="Clicked" value={s.clicked} />
                        <Mini label="Failed" value={s.failed} tone={s.failed ? 'text-red-600' : ''} />
                      </div>
                      {s.clicked > 0 && (
                        <div className="text-[11px] text-ink-muted mt-2">
                          {s.viaApp} opened in the app · {s.viaBrowser} in the browser
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Per-occasion table ──────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-soft p-5">
            <h2 className="font-display font-bold text-base mb-3">Every occasion in this window</h2>
            {(data.campaigns || []).length === 0 ? <Empty>Nothing matches these filters.</Empty> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[720px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-ink-muted border-b border-gray-100">
                      <th className="py-2">Occasion</th>
                      <th className="text-right">Sent</th>
                      <th className="text-right">People</th>
                      <th className="text-right">Opened</th>
                      <th className="text-right">Clicked</th>
                      <th className="text-right">Explored</th>
                      <th className="text-right">CTR</th>
                      <th className="text-right">Influenced</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.campaigns.map((c) => (
                      <tr key={c.id} className="border-b border-gray-50 hover:bg-surface-alt/50">
                        <td className="py-2">
                          <div className="font-semibold text-ink">{c.name}</div>
                          {c.type && (
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${TYPE_CHIP[c.type] || TYPE_CHIP.sale}`}>
                              {c.type}
                            </span>
                          )}
                        </td>
                        <td className="text-right tabular-nums">{c.sent}</td>
                        <td className="text-right tabular-nums">{c.people}</td>
                        <td className="text-right tabular-nums text-ink-muted">{c.opened || '—'}</td>
                        <td className="text-right tabular-nums font-semibold" style={{ color: SERIES.clicked }}>{c.clicked || '—'}</td>
                        <td className="text-right tabular-nums" style={{ color: c.explored ? SERIES.explored : undefined }}>{c.explored || '—'}</td>
                        <td className="text-right tabular-nums">{pct(c.clicked, c.sent)}</td>
                        <td className="text-right tabular-nums font-semibold text-emerald-700">
                          {c.revenuePaise ? rupees(c.revenuePaise) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <RecipientsTable filters={{
            days: f.days, campaignId: f.campaignId, channel: f.channel,
            offsetDay: f.offsetDay, includeTests: f.includeTests,
          }} />

          <TestSendsPanel days={f.days} />

          {/* ── Audience health ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Stat label="Reachable" value={a.optedIn ?? 0} tone="bg-emerald-50 text-emerald-700" />
            <Stat label="Opted out" value={a.optedOut ?? 0} tone="bg-gray-100 text-gray-600" />
            <Stat label="Birthday on file" value={a.withDob ?? 0} tone="bg-pink-50 text-pink-700" />
            <Stat label="Anniversary on file" value={a.withAnniversary ?? 0} tone="bg-rose-50 text-rose-700" />
            <Stat label="App push enabled" value={a.withPush ?? 0} tone="bg-blue-50 text-blue-700" />
          </div>

          {/* ── Recent activity ─────────────────────────────────────────── */}
          {(data.recent || []).length > 0 && (
            <div className="bg-white rounded-2xl shadow-soft p-5">
              <h2 className="font-display font-bold text-base mb-3">Latest messages</h2>
              <div className="space-y-1.5">
                {data.recent.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center gap-2 text-xs border-b border-gray-50 pb-1.5">
                    <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                      r.status === 'failed' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
                    }`}>{r.status}</span>
                    <span className="font-semibold text-ink">{r.campaign}</span>
                    <span className="text-ink-muted">{r.channel} · {beatLabel(r.offsetDay)} · {r.occurrenceDate}</span>
                    <div className="flex-1" />
                    {r.openedAt && <span className="text-amber-700">opened</span>}
                    {r.clickedAt && (
                      <span style={{ color: SERIES.clicked }} className="font-semibold">
                        clicked{r.clickKind === 'experience' ? ' an experience' : ''}
                        {r.clickVia ? ` · ${r.clickVia}` : ''}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/*
  A filter bar that starts folded.

  Six dropdowns permanently open push the actual data below the fold, and most
  visits change nothing — so the row collapses to a single button that carries
  a count of what is currently applied. The count is the important half: a
  folded bar must never be able to hide the reason a number looks wrong.
*/
function FilterShell({ activeCount, summary, children, right }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl shadow-soft">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
        <button
          onClick={() => setOpen((v) => !v)}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold ${
            activeCount ? 'border-brand bg-brand/10 text-ink' : 'border-gray-200 text-ink-muted hover:border-brand/50'
          }`}
        >
          <SlidersHorizontal size={14} />
          Filters
          {activeCount > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-ink text-[10px] font-bold grid place-items-center">
              {activeCount}
            </span>
          )}
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <span className="text-xs text-ink-muted truncate">{summary}</span>
        <div className="flex-1" />
        {right}
      </div>
      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-50 flex flex-wrap items-end gap-2">
          {children}
        </div>
      )}
    </div>
  );
}

/*
  Why the engagement numbers are zero.

  Zeroes here have three causes and only one is worth acting on, so the other
  two are stated instead of left to be discovered:

    - APP_URL is unset on the server, so no pixel URL can be built and every
      send goes out unmeasured however many there are,
    - the messages predate tracking and were never instrumented,
    - people really did not engage.

  Silence on the first two is how an admin concludes the feature is broken.
*/
function TrackingNotice({ tracking, funnel }) {
  if (!tracking) return null;

  if (!tracking.enabled) {
    return (
      <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-800">
        <AlertTriangle size={15} className="mt-0.5 shrink-0" />
        <div>
          <strong>Tracking is off on this server.</strong> Opens and clicks cannot be
          recorded because <code className="font-mono">APP_URL</code> is not set in its
          environment — greeting emails go out without a tracking pixel or click link.
          Set <code className="font-mono">APP_URL</code> to this backend&rsquo;s public URL
          and redeploy; messages sent before that stay unmeasured.
        </div>
      </div>
    );
  }

  if (!tracking.firstEngagementAt && (funnel?.sent || 0) > 0) {
    return (
      <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
        <AlertTriangle size={15} className="mt-0.5 shrink-0" />
        <div>
          <strong>Nothing has been measured yet.</strong> Tracking is configured, but
          every message in this window was sent before it existed — those emails carry
          no pixel and no tracked links, so their opens and clicks can never appear
          here. The next wave (or a fresh <em>Run today&rsquo;s sends</em>) will report
          properly.
        </div>
      </div>
    );
  }
  return null;
}

const mmss = (s) => {
  if (!s) return '—';
  const m = Math.floor(s / 60);
  return m ? `${m}m ${s % 60}s` : `${s}s`;
};

const timeAgo = (iso) => {
  if (!iso) return null;
  const mins = Math.round((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

/*
  The named list behind the percentages.

  A rate says whether it worked; it never says who. Sorted most-engaged first
  by the API, because the people a wave actually moved are the point of the
  list and would otherwise sit behind a thousand "delivered, nothing" rows.
*/
function RecipientsTable({ filters }) {
  const [data, setData] = useState(null);
  const [state, setState] = useState('clicked');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setPage(1); }, [state, filters]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const q = new URLSearchParams(
      Object.entries({ ...filters, state, page }).filter(([, v]) => v !== '' && v != null)
    ).toString();
    api.get(`/admin/campaigns/recipients?${q}`)
      .then((res) => { if (alive) setData(res.data?.data || null); })
      .catch(() => { if (alive) setData(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [filters, state, page]);

  const STATES = [
    { value: 'clicked', label: 'Clicked' },
    { value: 'explored', label: 'Explored an experience' },
    { value: 'landed', label: 'Reached the page' },
    { value: 'opened', label: 'Opened the email' },
    { value: 'nothing', label: 'No response' },
    { value: '', label: 'Everyone' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-soft p-5">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h2 className="font-display font-bold text-base">Who did what</h2>
        <div className="flex-1" />
        <div className="flex flex-wrap gap-1">
          {STATES.map((s) => (
            <button
              key={s.value || 'all'}
              onClick={() => setState(s.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                state === s.value
                  ? 'bg-brand/10 border-brand text-ink'
                  : 'border-gray-200 text-ink-muted hover:border-brand/50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        {loading && <Loader2 size={15} className="animate-spin text-brand" />}
      </div>

      {!data || data.items.length === 0 ? (
        <p className="text-sm text-ink-muted py-10 text-center">
          Nobody in this window matches “{STATES.find((s) => s.value === state)?.label}”.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[820px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-ink-muted border-b border-gray-100">
                  <th className="py-2">Person</th>
                  <th>Occasion</th>
                  <th>Opened</th>
                  <th>Clicked</th>
                  <th>Where</th>
                  <th className="text-right">Time on page</th>
                  <th className="text-right">Booked</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-surface-alt/50 align-top">
                    <td className="py-2">
                      <div className="font-semibold text-ink">
                        {r.user.name}
                        {r.isTest && (
                          <span className="ml-1.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200">
                            test
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-ink-muted">{r.user.email}</div>
                    </td>
                    <td className="text-xs">
                      <div className="text-ink">{r.campaign}</div>
                      <div className="text-[11px] text-ink-muted">
                        {r.channel} · {beatLabel(r.offsetDay)}
                      </div>
                    </td>
                    <td className="text-xs text-ink-muted">{r.openedAt ? timeAgo(r.openedAt) : '—'}</td>
                    <td className="text-xs">
                      {r.clickedAt ? (
                        <>
                          <span className="font-semibold" style={{ color: SERIES.clicked }}>
                            {timeAgo(r.clickedAt)}
                          </span>
                          {r.clickCount > 1 && <span className="text-ink-muted"> ×{r.clickCount}</span>}
                          {r.clickKind === 'experience' && (
                            <div className="text-[10px] font-bold uppercase" style={{ color: SERIES.explored }}>
                              experience
                            </div>
                          )}
                        </>
                      ) : <span className="text-ink-muted">—</span>}
                    </td>
                    <td className="text-xs text-ink-muted">
                      {r.clickVia ? (r.clickVia === 'app' ? '📱 app' : '🌐 browser') : '—'}
                    </td>
                    <td className="text-right text-xs tabular-nums">
                      {r.dwellSeconds ? mmss(r.dwellSeconds)
                        : r.landedAt ? <span className="text-ink-muted">arrived</span>
                        : <span className="text-ink-muted">—</span>}
                    </td>
                    <td className="text-right text-xs">
                      {r.booking ? (
                        <>
                          <div className="font-bold text-emerald-700">{rupees(r.booking.paise)}</div>
                          <div className="text-[10px] text-ink-muted">{r.booking.code}</div>
                        </>
                      ) : <span className="text-ink-muted">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2 mt-3 text-xs text-ink-muted">
            <span>{data.total.toLocaleString('en-IN')} people</span>
            <div className="flex-1" />
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 font-semibold disabled:opacity-40">
              Previous
            </button>
            <span>Page {data.page} of {data.pages}</span>
            <button disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 font-semibold disabled:opacity-40">
              Next
            </button>
          </div>
          <p className="text-[10px] text-ink-muted mt-2">
            “Booked” is a confirmed booking by this person within {data.attributionDays} days
            of their click — influence, not proof.
          </p>
        </>
      )}
    </div>
  );
}

/*
  Test sends, kept in their own room.

  Tests carry real tracking — that is the only way a test can prove tracking
  works — which creates an obvious hazard: those opens and clicks would flatter
  every rate on the page, and on a small base a few admin tests would dominate
  them outright. So the live numbers exclude tests entirely, and everything an
  admin fired lives here instead: when it went, which occasion and which beat,
  to whom, and exactly what came back.

  Both sides handled, and neither has to be traded for the other.
*/
function TestSendsPanel({ days }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/campaigns/recipients?tests=only&days=${days}&state=`)
      .then((res) => setData(res.data?.data || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [days]);

  useEffect(() => { if (open) load(); }, [open, load]);

  return (
    <div className="bg-white rounded-2xl shadow-soft">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-5 py-3.5 text-left"
      >
        <FlaskConical size={16} className="text-violet-600" />
        <span className="font-display font-bold text-base">Test sends</span>
        <span className="text-[11px] text-ink-muted">
          your own tests — tracked, and deliberately excluded from every number above
        </span>
        <div className="flex-1" />
        {loading && <Loader2 size={15} className="animate-spin text-brand" />}
        {open ? <ChevronUp size={16} className="text-ink-muted" /> : <ChevronDown size={16} className="text-ink-muted" />}
      </button>

      {open && (
        <div className="px-5 pb-5">
          {!data || data.items.length === 0 ? (
            <p className="text-sm text-ink-muted py-8 text-center">
              No test sends in the last {days} days. Hit <strong>Test</strong> on any
              occasion in the Campaigns tab — the mail it sends is fully tracked, and
              it will show up here.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[860px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-ink-muted border-b border-gray-100">
                      <th className="py-2">Sent</th>
                      <th>Occasion</th>
                      <th>Beat</th>
                      <th>To</th>
                      <th>Opened</th>
                      <th>Clicked</th>
                      <th className="text-right">Time on page</th>
                      <th className="text-right">Booked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((r) => (
                      <tr key={r.id} className="border-b border-gray-50 align-top">
                        <td className="py-2 text-xs">
                          <div className="text-ink font-semibold">
                            {r.sentAt ? new Date(r.sentAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                          </div>
                          <div className="text-[11px] text-ink-muted">
                            {r.sentAt ? new Date(r.sentAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </td>
                        <td className="text-xs text-ink">{r.campaign}</td>
                        <td className="text-xs">
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {beatLabel(r.offsetDay)}
                          </span>
                          <div className="text-[11px] text-ink-muted mt-0.5">{r.channel}</div>
                        </td>
                        <td className="text-xs">
                          <div className="text-ink">{r.user.name}</div>
                          <div className="text-[11px] text-ink-muted">{r.user.email}</div>
                        </td>
                        <td className="text-xs">
                          {r.openedAt
                            ? <span className="text-amber-700 font-semibold">{timeAgo(r.openedAt)}</span>
                            : <span className="text-ink-muted">not yet</span>}
                        </td>
                        <td className="text-xs">
                          {r.clickedAt ? (
                            <>
                              <span className="font-semibold" style={{ color: SERIES.clicked }}>
                                {timeAgo(r.clickedAt)}
                              </span>
                              {r.clickCount > 1 && <span className="text-ink-muted"> ×{r.clickCount}</span>}
                              <div className="text-[10px] text-ink-muted">
                                {r.clickKind === 'experience' ? 'an experience' : 'browse'}
                                {r.clickVia ? ` · ${r.clickVia}` : ''}
                              </div>
                            </>
                          ) : <span className="text-ink-muted">not yet</span>}
                        </td>
                        <td className="text-right text-xs tabular-nums">
                          {r.dwellSeconds ? mmss(r.dwellSeconds)
                            : r.landedAt ? <span className="text-ink-muted">arrived</span>
                            : <span className="text-ink-muted">—</span>}
                        </td>
                        <td className="text-right text-xs">
                          {r.booking
                            ? <span className="font-bold text-emerald-700">{rupees(r.booking.paise)}</span>
                            : <span className="text-ink-muted">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-ink-muted mt-3">
                {data.total} test send{data.total === 1 ? '' : 's'} in this window. These
                rows never appear in the funnel, the charts or the per-occasion table —
                tick <strong>Include test sends</strong> above if you want them counted
                there too.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Filter({ label, children }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Mini({ label, value, tone = '' }) {
  return (
    <div>
      <div className={`text-base font-bold ${tone || 'text-ink'}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-ink-muted">{label}</div>
    </div>
  );
}

function Empty({ children }) {
  return <p className="text-sm text-ink-muted py-10 text-center">{children}</p>;
}

function Section({ n, title, hint, children }) {
  return (
    <div className="mb-5">
      <div className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-2">{n} · {title}</div>
      {hint && <p className="text-[11px] text-ink-muted mb-2">{hint}</p>}
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="bg-white rounded-2xl shadow-soft p-4">
      <div className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${tone}`}>
        {label}
      </div>
      <div className="text-2xl font-bold text-ink mt-2">{value}</div>
    </div>
  );
}
