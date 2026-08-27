import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarHeart, Loader2, Plus, X, Save, Trash2, Power, Send, Play, Sparkles,
  AlertTriangle, CheckCircle2, Mail, Smartphone, Bell, CalendarDays, BarChart3, Gift, Merge,
  Timer, FlaskConical,
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/campaigns');
      setCampaigns(res.data?.data?.campaigns || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const unverified = campaigns.filter((c) => c.needsDateCheck && c.isActive);

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

  /*
    Puts existing occasions onto the seven-day run-up.

    The seeder ships it, but seeding never overwrites a stored row (an admin
    may have fixed its dates), so a calendar loaded before the countdown
    existed needs this one-time upgrade. Passing `ids` upgrades exactly one
    occasion regardless of whether it emails.
  */
  const applyCountdown = async ({ scope = 'emailing', ids = null, label } = {}) => {
    if (!ids && !window.confirm(
      scope === 'all'
        ? 'Put EVERY festival, holiday and sale on the 7-day countdown? Occasions that email will send 5 emails per occasion instead of 2.'
        : 'Put the big occasions (the ones that already email) on the 7-day countdown — a week before, then 3, 2, 1 days before, then the day itself?'
    )) return;
    setBusy(true);
    try {
      const res = await api.post('/admin/campaigns/apply-countdown', ids ? { ids } : { scope });
      toast.success(label ? `${label} is on the countdown` : (res.data?.message || 'Countdown applied'));
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not apply the countdown');
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
          email, app push and the in-app bell. Big occasions run a{' '}
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
              onClick={() => applyCountdown({ scope: 'emailing' })}
              disabled={busy}
              title="Send a week before, then 3, 2 and 1 days before, then on the day"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-ink hover:border-brand/50 disabled:opacity-50"
            >
              <Timer size={15} /> Apply 7-day countdown
            </button>
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
          <div className="grid gap-3">
            {campaigns.map((c) => (
              <CampaignRow
                key={c.id}
                c={c}
                onEdit={() => setEditing(c)}
                onToggle={() => toggle(c)}
                onVerify={() => verifyDates(c)}
                onDelete={() => remove(c)}
                onRun={() => runNow(c.id)}
                onCountdown={() => applyCountdown({ ids: [c.id], label: c.name })}
                defaultEmail={admin?.email || ''}
              />
            ))}
          </div>
        )
      )}

      {tab === 'schedule' && <ScheduleTab />}
      {tab === 'analytics' && <AnalyticsTab />}
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

function CampaignRow({ c, onEdit, onToggle, onVerify, onDelete, onRun, onCountdown, defaultEmail }) {
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
          {c.canCountdown && !c.onCountdown && (
            <button onClick={onCountdown} title="Send a week before, then 3, 2 and 1 days before, then on the day"
              className="p-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
              <Timer size={15} />
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

function AnalyticsTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.get('/admin/campaigns/analytics?days=90')
      .then((res) => { if (alive) setData(res.data?.data || null); })
      .catch((err) => toast.error(err.response?.data?.message || 'Could not load analytics'))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  if (loading) return <div className="py-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>;
  if (!data) return null;

  const a = data.audience || {};

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Stat label="Reachable customers" value={a.optedIn ?? 0} tone="bg-emerald-50 text-emerald-700" />
        <Stat label="Opted out" value={a.optedOut ?? 0} tone="bg-gray-100 text-gray-600" />
        <Stat label="With a birthday on file" value={a.withDob ?? 0} tone="bg-pink-50 text-pink-700" />
        <Stat label="With an anniversary" value={a.withAnniversary ?? 0} tone="bg-rose-50 text-rose-700" />
        <Stat label="App push enabled" value={a.withPush ?? 0} tone="bg-blue-50 text-blue-700" />
      </div>

      <div className="bg-white rounded-2xl shadow-soft p-5">
        <h2 className="font-display font-bold text-lg mb-1">Last {data.days} days</h2>
        <p className="text-xs text-ink-muted mb-4">
          “Sent” means handed to the mail server / FCM — not opened. Opens and
          clicks would need tracking pixels, which this does not add.
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          {CHANNELS.map((ch) => {
            const s = (data.channels || {})[ch.value] || { sent: 0, failed: 0 };
            return (
              <div key={ch.value} className="rounded-xl border border-gray-100 p-4">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                  <ch.icon size={15} className="text-brand" /> {ch.label}
                </div>
                <div className="text-2xl font-bold text-ink mt-2">{s.sent}</div>
                <div className="text-[11px] text-ink-muted">{s.failed} failed</div>
              </div>
            );
          })}
        </div>
      </div>

      {(data.campaigns || []).length > 0 && (
        <div className="bg-white rounded-2xl shadow-soft p-5">
          <h2 className="font-display font-bold text-lg mb-3">By campaign</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-ink-muted">
                  <th className="py-2">Occasion</th><th>Messages</th><th>People reached</th>
                </tr>
              </thead>
              <tbody>
                {data.campaigns.map((c) => (
                  <tr key={c.campaignEventId} className="border-t border-gray-100">
                    <td className="py-2 font-semibold text-ink">{c.name}</td>
                    <td>{c.messages}</td>
                    <td>{c.people}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(data.recent || []).length > 0 && (
        <div className="bg-white rounded-2xl shadow-soft p-5">
          <h2 className="font-display font-bold text-lg mb-3">Recent activity</h2>
          <div className="space-y-1.5">
            {data.recent.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-2 text-xs border-b border-gray-50 pb-1.5">
                <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                  r.status === 'failed' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
                }`}>{r.status}</span>
                <span className="font-semibold text-ink">{r.campaign}</span>
                <span className="text-ink-muted">{r.channel}</span>
                <span className="text-ink-muted">· {r.occurrenceDate}{r.offsetDay ? ` (${r.offsetDay}d)` : ''}</span>
                {r.error && <span className="text-red-500">· {r.error}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
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
