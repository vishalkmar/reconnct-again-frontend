import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2, IndianRupee, CalendarCheck, Star, ListChecks, PlusCircle, Clock, FileEdit, CheckCircle2, ArrowRight,
} from 'lucide-react';
import HostPageHero from '../../components/host/HostPageHero.jsx';
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
    return <div className="flex justify-center py-20 text-rc-brand"><Loader2 className="animate-spin" size={26} /></div>;
  }

  const s = stats || {};
  const createBtn = canAdd ? (
    <Link to={`${basePath}/listings/new`} className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-rc-brand text-rc-navy font-bold hover:brightness-105 shadow-[0_10px_22px_-12px_rgba(255,185,0,0.95)] transition">
      <PlusCircle size={19} /> Create Listing
    </Link>
  ) : (
    <button disabled title="Available once your first experience is live" className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-[#EDEAE4] text-rc-ink-faint font-bold cursor-not-allowed">
      <PlusCircle size={19} /> Create Listing
    </button>
  );

  return (
    <div className="max-w-[1400px]">
      <HostPageHero
        photo="coast"
        title={title}
        subtitle="Manage your experiences, track bookings and earnings."
        actions={createBtn}
      />

      {isSupplier && !canAdd && (
        <div className="mb-5 flex items-start gap-2.5 bg-[#FFF8E6] border border-[#FBE3A8] text-[#8A5A00] rounded-2xl px-4 py-3.5 text-sm">
          <PlusCircle size={16} className="mt-0.5 shrink-0" />
          <span>You can add your own listings once your first experience is <strong>live</strong> on the platform. Your account manager onboards the first one — after that, this unlocks.</span>
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 mb-5">
        <StatCard icon={IndianRupee} tone="amber" art="💰" value={money(s.earnedMonth)} label="This Month" />
        <StatCard icon={CalendarCheck} tone="sky" art="📅" value={String(s.bookings || 0)} label="Bookings" />
        <StatCard icon={ListChecks} tone="mint" art="🗂️" value={String(s.listingCount || 0)} label="Listings" />
        <StatCard icon={Star} tone="rose" art="⭐" value={String(s.rating || 0)} label="Rating" />
      </div>

      {/* Listing status breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5 mb-5">
        <StatusCard icon={CheckCircle2} tint="bg-[#E9F8F1] text-[#16A36A]" value={s.activeCount || 0} label="Active (published)" />
        <StatusCard icon={Clock} tint="bg-[#FFF3DD] text-[#D98A00]" value={s.pendingCount || 0} label="Pending review" />
        <StatusCard icon={FileEdit} tint="bg-[#F1F2F5] text-[#64748B]" value={s.draftCount || 0} label="Drafts" />
      </div>

      <div className="bg-white rounded-[24px] border border-[#F1ECE3] shadow-[0_14px_34px_-26px_rgba(16,24,40,0.5)] p-6 sm:p-7">
        <h2 className="font-display font-bold text-[22px] text-rc-navy mb-4">Quick actions</h2>
        <div className="grid sm:grid-cols-2 gap-3 max-w-2xl">
          {canAdd ? (
            <Link to={`${basePath}/listings/new`} className="group flex items-center gap-3.5 rounded-2xl bg-[#FFF8E6] border border-[#FBE3A8] px-4 py-3.5 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-18px_rgba(16,24,40,0.5)] transition">
              <span className="grid place-items-center w-11 h-11 rounded-full bg-rc-brand text-white shrink-0"><PlusCircle size={20} /></span>
              <span className="flex-1 font-bold text-rc-navy">New experience</span>
              <ArrowRight size={18} className="text-rc-navy group-hover:translate-x-1 transition" />
            </Link>
          ) : (
            <button disabled title="Available once your first experience is live" className="flex items-center gap-3.5 rounded-2xl bg-[#F4F2EE] border border-[#ECE8E0] px-4 py-3.5 text-left cursor-not-allowed">
              <span className="grid place-items-center w-11 h-11 rounded-full bg-[#E2DED6] text-white shrink-0"><PlusCircle size={20} /></span>
              <span className="flex-1 font-bold text-rc-ink-faint">New experience</span>
            </button>
          )}
          <Link to={`${basePath}/listings`} className="group flex items-center gap-3.5 rounded-2xl bg-white border border-[#EEE9E0] px-4 py-3.5 hover:border-[#FBE3A8] hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-18px_rgba(16,24,40,0.5)] transition">
            <span className="grid place-items-center w-11 h-11 rounded-full bg-[#E9F8F1] text-[#16A36A] shrink-0"><ListChecks size={20} /></span>
            <span className="flex-1 font-bold text-rc-navy">Manage listings</span>
            <ArrowRight size={18} className="text-rc-navy group-hover:translate-x-1 transition" />
          </Link>
        </div>
        {(s.earnedTotal === 0 && (s.bookings || 0) === 0) && (
          <p className="text-[13px] text-rc-ink-muted mt-4">
            Earnings and bookings will appear here once guests start booking your live listings.
          </p>
        )}
      </div>
    </div>
  );
}

const TONES = {
  amber: { card: 'bg-gradient-to-br from-[#FFF6E0] to-[#FFF1D0] border-[#FBE3A8]', icon: 'bg-rc-brand text-white', glow: 'bg-[#FFD666]/50' },
  mint: { card: 'bg-gradient-to-br from-[#E9F8F1] to-[#DDF3EA] border-[#BFE8D5]', icon: 'bg-[#16A36A] text-white', glow: 'bg-[#7FDDB5]/45' },
  rose: { card: 'bg-gradient-to-br from-[#FFEEF0] to-[#FFE3E7] border-[#FAC9D1]', icon: 'bg-[#EF3E5C] text-white', glow: 'bg-[#FF9FB0]/45' },
  sky: { card: 'bg-gradient-to-br from-[#EAF2FF] to-[#DEEAFF] border-[#C3D7FA]', icon: 'bg-[#2F6FED] text-white', glow: 'bg-[#9DBDFB]/45' },
};

function StatCard({ icon: Icon, tone = 'amber', art, value, label }) {
  const t = TONES[tone] || TONES.amber;
  return (
    <div className={`group relative overflow-hidden flex items-center justify-between gap-3 min-h-[128px] rounded-[22px] border p-5 ${t.card}`}>
      <div className="min-w-0">
        <span className={`grid place-items-center w-11 h-11 rounded-full shadow-sm ${t.icon}`}><Icon size={20} /></span>
        <div className="mt-3 text-[26px] font-black text-rc-navy leading-none truncate">{value}</div>
        <div className="text-sm font-semibold text-rc-navy/70 mt-1">{label}</div>
      </div>
      <span className="relative shrink-0 hidden sm:grid place-items-center w-20 h-20" aria-hidden="true">
        <span className={`absolute inset-2 rounded-full blur-xl ${t.glow}`} />
        <span className="relative text-[48px] leading-none drop-shadow-[0_10px_12px_rgba(0,0,0,0.18)] group-hover:scale-110 group-hover:-rotate-6 transition duration-300">{art}</span>
      </span>
    </div>
  );
}

function StatusCard({ icon: Icon, tint, value, label }) {
  return (
    <div className="bg-white rounded-[22px] border border-[#F1ECE3] shadow-[0_14px_34px_-26px_rgba(16,24,40,0.5)] p-5 flex items-center gap-4">
      <span className={`grid place-items-center w-12 h-12 rounded-2xl shrink-0 ${tint}`}><Icon size={24} /></span>
      <div>
        <div className="text-[24px] font-black text-rc-navy leading-none">{value}</div>
        <div className="text-sm text-rc-ink-muted mt-1">{label}</div>
      </div>
    </div>
  );
}
