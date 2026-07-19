import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2, IndianRupee, CalendarCheck, Star, ListChecks, PlusCircle, Clock, FileEdit, CheckCircle2,
} from 'lucide-react';
import api from '../../services/api';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// basePath lets the Supplier Portal (Phase 4) reuse this exact page.
export default function HostDashboardPage({ basePath = '/host', title = 'Host Dashboard' }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const isSupplier = basePath === '/supplier';
  // Suppliers can self-add listings only once they already have a live one.
  const [canAdd, setCanAdd] = useState(!isSupplier);

  useEffect(() => {
    let alive = true;
    api.get(`${basePath}/summary`)
      .then(({ data }) => {
        const body = data.data || data;
        if (!alive) return;
        setStats(body.stats);
        setCanAdd(isSupplier ? !!body.canAddListing : true);
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [basePath, isSupplier]);

  if (loading) {
    return <div className="flex justify-center py-20 text-slate-400"><Loader2 className="animate-spin" size={24} /></div>;
  }

  const s = stats || {};
  return (
    <div className="max-w-6xl">
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-[#0f1830] via-[#16213e] to-[#1c2a4a] text-white p-6 flex items-center justify-between flex-wrap gap-4 shadow-soft">
        <div className="min-w-0">
          <h1 className="text-2xl font-display font-bold">{title}</h1>
          <p className="text-sm text-white/60 mt-1">Manage your experiences, track bookings and earnings.</p>
        </div>
        {canAdd ? (
          <Link to={`${basePath}/listings/new`} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand text-ink font-semibold hover:brightness-105 transition">
            <PlusCircle size={18} /> Create Listing
          </Link>
        ) : (
          <button disabled title="Available once your first experience is live" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 text-white/40 font-semibold cursor-not-allowed">
            <PlusCircle size={18} /> Create Listing
          </button>
        )}
      </div>

      {isSupplier && !canAdd && (
        <div className="mb-6 flex items-start gap-2.5 bg-amber-50 text-amber-800 rounded-xl px-4 py-3 text-sm">
          <PlusCircle size={16} className="mt-0.5 shrink-0" />
          You can add your own listings once your first experience is <strong>live</strong> on the platform. Your account manager onboards the first one — after that, this unlocks.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={IndianRupee} tint="text-brand-dark" bg="bg-amber-100" value={money(s.earnedMonth)} label="This Month" />
        <StatCard icon={CalendarCheck} tint="text-blue-600" bg="bg-blue-100" value={String(s.bookings || 0)} label="Bookings" />
        <StatCard icon={ListChecks} tint="text-emerald-600" bg="bg-emerald-100" value={String(s.listingCount || 0)} label="Listings" />
        <StatCard icon={Star} tint="text-amber-500" bg="bg-yellow-100" value={String(s.rating || 0)} label="Rating" />
      </div>

      {/* Listing status breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatusCard icon={CheckCircle2} tint="text-emerald-600" value={s.activeCount || 0} label="Active (published)" />
        <StatusCard icon={Clock} tint="text-amber-600" value={s.pendingCount || 0} label="Pending review" />
        <StatusCard icon={FileEdit} tint="text-slate-500" value={s.draftCount || 0} label="Drafts" />
      </div>

      <div className="bg-white rounded-2xl shadow-soft p-6">
        <h2 className="font-semibold text-ink mb-4">Quick actions</h2>
        <div className="flex flex-wrap gap-3">
          {canAdd ? (
            <Link to={`${basePath}/listings/new`} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand text-ink font-semibold hover:brightness-105 transition">
              <PlusCircle size={18} /> New experience
            </Link>
          ) : (
            <button disabled title="Available once your first experience is live" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-200 text-slate-400 font-semibold cursor-not-allowed">
              <PlusCircle size={18} /> New experience
            </button>
          )}
          <Link to={`${basePath}/listings`} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border font-medium hover:bg-surface-alt transition">
            <ListChecks size={18} /> Manage listings
          </Link>
        </div>
        {(s.earnedTotal === 0 && (s.bookings || 0) === 0) && (
          <p className="text-xs text-ink-muted mt-4">
            Earnings and bookings will appear here once guests start booking your live listings.
          </p>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, tint, bg, value, label }) {
  return (
    <div className="bg-white rounded-2xl shadow-soft p-5">
      <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center mb-3`}>
        <Icon size={20} className={tint} />
      </div>
      <div className="text-2xl font-bold text-ink">{value}</div>
      <div className="text-sm text-ink-muted">{label}</div>
    </div>
  );
}

function StatusCard({ icon: Icon, tint, value, label }) {
  return (
    <div className="bg-white rounded-2xl shadow-soft p-5 flex items-center gap-4">
      <Icon size={26} className={tint} />
      <div>
        <div className="text-xl font-bold text-ink">{value}</div>
        <div className="text-sm text-ink-muted">{label}</div>
      </div>
    </div>
  );
}
