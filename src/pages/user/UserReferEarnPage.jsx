import { useCallback, useEffect, useState } from 'react';
import {
  Gift, Copy, Check, Share2, Wallet, Users, Clock, Loader2,
  ArrowUpRight, ArrowDownRight, CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useUserAuth } from '../../context/UserAuthContext.jsx';

const fmtMoney = (n, currency = 'INR') =>
  `${currency === 'INR' ? '₹' : currency + ' '}${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const TXN_TYPE_LABEL = {
  referral_payout: 'Referral payout',
  booking_used: 'Used on booking',
  booking_refund: 'Refund — booking cancelled',
  admin_adjust: 'Manual adjustment',
  signup_bonus: 'Signup bonus',
};

export default function UserReferEarnPage() {
  const { user } = useUserAuth();
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState('wallet');
  const [config, setConfig] = useState(null);
  const [wallet, setWallet] = useState({ balance: 0, transactions: [] });
  const [referees, setReferees] = useState({ referees: [], count: 0, rewardedCount: 0, pendingCount: 0, totalEarned: 0 });
  const [loading, setLoading] = useState(true);

  const code = user?.referralCode || '';
  const inviteUrl = `${window.location.origin}/?ref=${encodeURIComponent(code)}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // v2 refer & earn is money-only — no more coupons fetched here. The
      // /refer-earn/coupons endpoint still exists for legacy data but isn't
      // surfaced on the dashboard.
      const [cfg, w, r] = await Promise.all([
        api.get('/refer-earn/config'),
        api.get('/refer-earn/wallet'),
        api.get('/refer-earn/referees'),
      ]);
      setConfig(cfg.data?.data || null);
      setWallet(w.data?.data || { balance: 0, transactions: [] });
      setReferees(r.data?.data || { referees: [], count: 0, rewardedCount: 0, pendingCount: 0, totalEarned: 0 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load refer & earn');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy');
    }
  };

  const share = async () => {
    const shareData = {
      title: 'Join me on Retreats by Traveon',
      text: `I'm loving Retreats by Traveon! Sign up with my code ${code} and we both get rewarded.`,
      url: inviteUrl,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* user cancelled */ }
    } else {
      copy(inviteUrl);
    }
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Refer & Earn</h1>
        <p className="text-sm text-ink-muted mt-1">
          {config
            ? `Invite a friend and earn ${fmtMoney(config.baseAmount)} in wallet credit the moment they join using your code.`
            : 'Invite friends, earn rewards.'}
        </p>
      </div>

      {/* Hero card — referral code + share */}
      <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-2xl p-6 md:p-8 shadow-soft">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Gift size={22} />
          </div>
          <div>
            <p className="text-sm opacity-90">Your referral code</p>
            <p className="font-bold text-2xl tracking-wider">{code || '—'}</p>
          </div>
        </div>

        {config && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5 text-sm">
            <Perk
              title="You earn (base)"
              value={`${fmtMoney(config.baseAmount)} wallet`}
              sub="per friend who joins via your code"
            />
            {config.tiers && config.tiers.length > 0 ? (
              <Perk
                title={`Bonus — ${config.tiers[0].atCount} friends`}
                value={fmtMoney(config.tiers[0].totalPayout)}
                sub={`if all complete within ${config.tiers[0].withinDays} days`}
              />
            ) : (
              <Perk
                title="Goal"
                value="Invite more, earn more"
                sub="Every paid friend adds wallet credit"
              />
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3 mt-5">
          <button
            type="button"
            onClick={() => copy(code)}
            disabled={!code}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-orange-600 font-medium hover:bg-orange-50 transition disabled:opacity-60"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied' : 'Copy code'}
          </button>
          <button
            type="button"
            onClick={share}
            disabled={!code}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white font-medium transition disabled:opacity-60"
          >
            <Share2 size={16} />
            Share invite link
          </button>
        </div>
      </div>

      {/* Stat strip — v2 refer&earn is money-only; coupons are admin/promo
          territory now, so they don't surface on this page any more. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Wallet} label="Wallet balance" value={fmtMoney(wallet.balance)} accent="bg-emerald-50 text-emerald-600" />
        <StatCard icon={Users} label="Friends invited" value={referees.count} accent="bg-blue-50 text-blue-600" />
        <StatCard icon={CheckCircle2} label="Rewarded" value={referees.rewardedCount} accent="bg-amber-50 text-amber-600" />
      </div>

      {/* Tabs — coupons tab removed in v2 rewrite. Wallet + Friends only. */}
      <div className="flex flex-wrap gap-2 border-b">
        {[
          { key: 'wallet', label: 'Wallet history' },
          { key: 'referees', label: `Friends (${referees.count})` },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 -mb-px text-sm font-semibold border-b-2 transition ${
              tab === t.key
                ? 'border-brand text-brand'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-soft p-16 text-center">
          <Loader2 className="animate-spin mx-auto text-brand" />
        </div>
      ) : tab === 'wallet' ? (
        <WalletHistory transactions={wallet.transactions} />
      ) : (
        <RefereesList referees={referees.referees} />
      )}
    </div>
  );
}

function Perk({ title, value, sub }) {
  return (
    <div className="bg-white/15 rounded-lg px-3 py-2">
      <div className="text-[11px] uppercase tracking-wider opacity-90">{title}</div>
      <div className="font-bold text-base mt-0.5">{value}</div>
      <div className="text-[11px] opacity-90">{sub}</div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-white rounded-2xl shadow-soft p-4 flex items-center gap-3">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${accent}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-ink-muted uppercase tracking-wide truncate">{label}</div>
        <div className="font-bold text-lg text-ink truncate">{value}</div>
      </div>
    </div>
  );
}

function WalletHistory({ transactions }) {
  if (!transactions.length) {
    return (
      <div className="bg-white rounded-2xl shadow-soft p-10 text-center">
        <Wallet size={28} className="mx-auto text-ink-muted mb-2" />
        <h3 className="font-semibold text-ink">No wallet activity yet</h3>
        <p className="text-sm text-ink-muted mt-1">Your credits, earnings and refunds will appear here.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
      <ul className="divide-y divide-slate-100">
        {transactions.map((t) => {
          const credit = t.amount > 0;
          return (
            <li key={t.id} className="flex items-center gap-3 px-4 sm:px-5 py-3.5">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                credit ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
              }`}>
                {credit ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-ink truncate">
                  {TXN_TYPE_LABEL[t.type] || t.type}
                </div>
                <div className="text-xs text-ink-muted truncate">{t.description || ''}</div>
                <div className="text-[10px] text-ink-muted mt-0.5">{fmtDateTime(t.createdAt)}</div>
              </div>
              <div className="text-right shrink-0">
                <div className={`font-bold text-base ${credit ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {credit ? '+' : ''}{fmtMoney(t.amount)}
                </div>
                <div className="text-[10px] text-ink-muted">Balance {fmtMoney(t.balanceAfter)}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RefereesList({ referees }) {
  if (!referees.length) {
    return (
      <div className="bg-white rounded-2xl shadow-soft p-10 text-center">
        <Users size={28} className="mx-auto text-ink-muted mb-2" />
        <h3 className="font-semibold text-ink">You haven't referred anyone yet</h3>
        <p className="text-sm text-ink-muted mt-1">Share your code with a friend to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
      <ul className="divide-y divide-slate-100">
        {referees.map((r) => {
          const done = r.status === 'rewarded';
          return (
            <li key={r.id} className="flex items-center gap-3 px-4 sm:px-5 py-3.5">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                done ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
              }`}>
                {done ? <CheckCircle2 size={16} /> : <Clock size={16} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-ink truncate">{r.name || r.emailMasked}</div>
                <div className="text-xs text-ink-muted truncate">{r.emailMasked}</div>
                <div className="text-[10px] text-ink-muted mt-0.5">Joined {fmtDate(r.joinedAt)}</div>
              </div>
              <div className="text-right shrink-0">
                {done ? (
                  <>
                    <div className="font-bold text-base text-emerald-600">+{fmtMoney(r.rewardEarned)}</div>
                    <div className="text-[10px] text-ink-muted">{fmtDate(r.rewardEarnedAt)}</div>
                  </>
                ) : (
                  <>
                    <div className="text-xs font-semibold text-amber-600">Awaiting first login</div>
                    <div className="text-[10px] text-ink-muted">{r.paidBookingCount} bookings</div>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
