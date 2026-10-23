import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Wallet,
  Heart,
  Gift,
  User as UserIcon,
  ArrowRight,
  Sparkles,
  Phone,
  MapPin,
  CalendarDays,
} from 'lucide-react';
import api from '../../services/api';
import { useUserAuth } from '../../context/UserAuthContext.jsx';
import { useWishlist } from '../../context/WishlistContext.jsx';
import { categorize, isPaid } from '../../components/user/bookingFormatters.js';
import RatingModal from '../../components/user/RatingModal.jsx';

export default function UserDashboardHomePage() {
  const { user } = useUserAuth();
  const { count: wishlistCount } = useWishlist();
  const wallet = ((user?.walletBalancePaise || 0) / 100).toFixed(2);

  const [bookingCounts, setBookingCounts] = useState({ upcoming: 0, txns: 0 });

  // Lightweight summary — we only need counts, but the /me list isn't huge
  // and reuses the same data My Bookings + Transactions already load.
  useEffect(() => {
    api.get('/bookings/me', { params: { limit: 200 } })
      .then((res) => {
        const list = res.data?.data?.bookings || [];
        setBookingCounts({
          upcoming: list.filter((b) => categorize(b) === 'upcoming').length,
          txns: list.filter(isPaid).length,
        });
      })
      .catch(() => {});
  }, []);

  // Auto "rate and review" popup — mirrors the app's Home screen exactly
  // (same /bookings/me/pending-review + dismiss endpoints), so the behaviour
  // is identical across platforms. X closes for this browser session only;
  // "Stop showing" calls the server so it never auto-shows again for that
  // one booking (manual Rate button on the booking still works).
  const [pendingReview, setPendingReview] = useState(null);
  const [reviewPopupClosed, setReviewPopupClosed] = useState(false);

  useEffect(() => {
    api.get('/bookings/me/pending-review')
      .then((res) => setPendingReview(res.data?.data?.booking || null))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-5 lg:space-y-6 max-w-[1600px]">
      {/* Greeting hero — photo banner, same copy as before */}
      <div className="relative isolate overflow-hidden rounded-[26px] min-h-[230px] sm:min-h-[260px] lg:min-h-[286px] shadow-[0_24px_50px_-30px_rgba(16,24,40,0.55)]">
        <picture>
          <source srcSet="/hero/santorini-640.webp 640w, /hero/santorini-1024.webp 1024w, /hero/santorini-1795.webp 1795w" sizes="(min-width: 1024px) 75vw, 100vw" type="image/webp" />
          <img src="/hero/santorini-1600.jpg" alt="" className="absolute inset-0 -z-20 w-full h-full object-cover object-[center_60%]" />
        </picture>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white/95 via-white/75 to-white/0" aria-hidden="true" />
        <div className="relative h-full flex flex-col lg:flex-row lg:items-center justify-between gap-5 p-6 sm:p-8 lg:px-12 lg:py-10">
          <div className="max-w-[640px]">
            <p className="flex items-center gap-3 text-[11px] sm:text-[13px] font-bold tracking-[0.2em] uppercase text-rc-navy/85">
              Welcome to your dashboard <span className="h-[3px] w-9 rounded-full bg-rc-brand" aria-hidden="true" />
            </p>
            <h1 className="font-sans font-black text-[30px] sm:text-[40px] lg:text-[48px] leading-[1.08] text-rc-navy mt-3">
              {greeting()}, <span className="text-rc-brand">{user?.name?.split(/\s+/)[0] || 'Traveller'}!</span>
            </h1>
            <p className="text-rc-navy/85 mt-2.5 text-[15px] sm:text-lg max-w-lg">
              Track your bookings, transactions and rewards — all in one place.
            </p>
          </div>
          <div className="self-start flex items-center gap-4 bg-rc-navy/75 backdrop-blur-md text-white pl-4 pr-6 py-4 rounded-[20px] shadow-[0_14px_30px_-16px_rgba(0,0,0,0.6)]">
            <span className="grid place-items-center w-14 h-14 rounded-2xl bg-rc-brand text-white shrink-0"><Wallet size={26} /></span>
            <div className="leading-tight">
              <div className="text-sm text-white/85">Wallet balance</div>
              <div className="font-black text-[28px] mt-0.5">₹{wallet}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
        <StatCard
          to="/dashboard/bookings"
          icon={BookOpen}
          label="My Bookings"
          value={bookingCounts.upcoming > 0 ? `${bookingCounts.upcoming} upcoming` : 'View all'}
          tone="amber"
          art="🧳"
        />
        <StatCard
          to="/dashboard/transactions"
          icon={Wallet}
          label="Transactions"
          value={bookingCounts.txns > 0 ? `${bookingCounts.txns} payments` : 'View history'}
          tone="mint"
          art="💰"
        />
        <StatCard
          to="/dashboard/wishlist"
          icon={Heart}
          label="Wishlist"
          value={wishlistCount > 0 ? `${wishlistCount} saved` : 'Saved items'}
          tone="rose"
          art="💖"
        />
        {/* Refer & Earn card hidden alongside the nav tab (logic kept intact).
        <StatCard
          to="/dashboard/refer"
          icon={Gift}
          label="Refer & Earn"
          value={user?.referralCode || '—'}
          tone="sky"
          art="🎁"
        />
        */}
      </div>

      {/* Profile + quick links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-[24px] border border-[#F1ECE3] shadow-[0_14px_34px_-26px_rgba(16,24,40,0.5)] p-6 sm:p-7">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-sans font-extrabold text-xl text-rc-navy">Your profile</h3>
            <Link to="/dashboard/profile" className="text-sm font-bold text-[#C98A00] hover:text-rc-navy inline-flex items-center gap-1.5 transition">
              Edit profile <ArrowRight size={16} />
            </Link>
          </div>
          <div className="flex items-center gap-4 sm:gap-5 pb-5 border-b border-[#F3EEE5]">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-[72px] h-[72px] rounded-full object-cover ring-4 ring-[#FFF1CC] shrink-0" />
            ) : (
              <span className="grid place-items-center w-[72px] h-[72px] rounded-full bg-[#FFF1CC] text-[#C98A00] text-3xl font-black shrink-0">
                {(user?.name || user?.email || '?').trim()[0]?.toUpperCase()}
              </span>
            )}
            <div className="min-w-0 grid gap-1">
              <div className="text-[12px] text-rc-ink-muted">Full name</div>
              <div className="font-sans font-extrabold text-xl sm:text-2xl text-rc-navy truncate -mt-1">{user?.name || '—'}</div>
              <div className="text-rc-ink-muted truncate"><span className="text-[12px]">Email · </span>{user?.email || '—'}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 pt-5">
            <ProfileRow icon={Phone} label="Phone" value={user?.phone} />
            <ProfileRow icon={MapPin} label="City" value={user?.city} />
            <ProfileRow icon={UserIcon} label="Gender" value={prettyGender(user?.gender)} />
            <ProfileRow icon={CalendarDays} label="Date of birth" value={user?.dob} />
          </div>
        </div>

        <div className="bg-white rounded-[24px] border border-[#F1ECE3] shadow-[0_14px_34px_-26px_rgba(16,24,40,0.5)] p-6 sm:p-7 flex flex-col">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="grid place-items-center w-8 h-8 rounded-full bg-[#FFF1CC] text-[#C98A00]"><Sparkles size={17} /></span>
            <h3 className="font-sans font-extrabold text-xl text-rc-navy">Start exploring</h3>
          </div>
          <p className="text-sm text-rc-ink-muted mb-5">
            Discover curated retreats, hotels and experiences.
          </p>
          <div className="space-y-3 mt-auto">
            <ExploreRow to="/retreats" img="/moments/wellness.webp" label="Browse retreats" highlight />
            <ExploreRow to="/hotels" img="/moments/relationship.webp" label="Browse hotels" />
            <ExploreRow to="/events" img="/moments/group.webp" label="Browse events" />
          </div>
        </div>
      </div>

      <RatingModal
        open={!!pendingReview && !reviewPopupClosed}
        variant="auto"
        booking={pendingReview}
        onClose={() => setReviewPopupClosed(true)}
        onDismissForever={() => { setReviewPopupClosed(true); setPendingReview(null); }}
        onSubmitted={() => setPendingReview(null)}
      />
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function prettyGender(g) {
  if (!g) return null;
  return {
    male: 'Male',
    female: 'Female',
    other: 'Other',
    prefer_not_to_say: 'Prefer not to say',
  }[g] || g;
}

const TONES = {
  amber: { card: 'bg-gradient-to-br from-[#FFF6E0] to-[#FFF1D0] border-[#FBE3A8]', icon: 'bg-rc-brand text-white', glow: 'bg-[#FFD666]/50' },
  mint: { card: 'bg-gradient-to-br from-[#E9F8F1] to-[#DDF3EA] border-[#BFE8D5]', icon: 'bg-[#16A36A] text-white', glow: 'bg-[#7FDDB5]/45' },
  rose: { card: 'bg-gradient-to-br from-[#FFEEF0] to-[#FFE3E7] border-[#FAC9D1]', icon: 'bg-[#EF3E5C] text-white', glow: 'bg-[#FF9FB0]/45' },
  sky: { card: 'bg-gradient-to-br from-[#EAF2FF] to-[#DEEAFF] border-[#C3D7FA]', icon: 'bg-[#2F6FED] text-white', glow: 'bg-[#9DBDFB]/45' },
};

function StatCard({ to, icon: Icon, label, value, tone = 'amber', art }) {
  const t = TONES[tone] || TONES.amber;
  return (
    <Link
      to={to}
      className={`group relative overflow-hidden flex items-center justify-between gap-3 min-h-[132px] rounded-[22px] border p-5 sm:p-6 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_-22px_rgba(16,24,40,0.45)] transition ${t.card}`}
    >
      <div className="min-w-0 relative z-10">
        <div className="flex items-center gap-3">
          <span className={`grid place-items-center w-11 h-11 rounded-full shrink-0 shadow-sm ${t.icon}`}><Icon size={20} /></span>
          <span className="font-sans font-extrabold text-[17px] text-rc-navy">{label}</span>
        </div>
        <div className="mt-4 flex items-center gap-2 text-[22px] font-black text-rc-navy truncate">
          {value} <ArrowRight size={18} className="text-rc-navy/50 group-hover:translate-x-1 group-hover:text-rc-navy transition shrink-0" />
        </div>
      </div>
      <span className="relative shrink-0 grid place-items-center w-24 h-24" aria-hidden="true">
        <span className={`absolute inset-2 rounded-full blur-xl ${t.glow}`} />
        <span className="relative text-[58px] leading-none drop-shadow-[0_10px_12px_rgba(0,0,0,0.18)] group-hover:scale-110 group-hover:-rotate-6 transition duration-300">{art}</span>
      </span>
    </Link>
  );
}

function ProfileRow({ icon: Icon = UserIcon, label, value }) {
  return (
    <div className="flex items-center gap-3.5">
      <span className="grid place-items-center w-11 h-11 rounded-full bg-[#F6F4F0] text-rc-navy/80 shrink-0"><Icon size={19} /></span>
      <div className="min-w-0">
        <div className="text-[13px] text-rc-ink-muted">{label}</div>
        <div className="font-semibold text-rc-navy truncate">{value || '—'}</div>
      </div>
    </div>
  );
}

function ExploreRow({ to, img, label, highlight = false }) {
  return (
    <Link
      to={to}
      className={`group flex items-center gap-4 rounded-2xl border overflow-hidden pr-4 transition hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-18px_rgba(16,24,40,0.5)] ${highlight ? 'bg-[#FFF8E6] border-[#FBE3A8]' : 'bg-white border-[#EEE9E0] hover:border-[#FBE3A8]'}`}
    >
      <img src={img} alt="" loading="lazy" className="w-[88px] h-[52px] object-cover shrink-0" />
      <span className="flex-1 font-semibold text-rc-navy">{label}</span>
      <ArrowRight size={18} className="text-rc-navy group-hover:translate-x-1 transition" />
    </Link>
  );
}
