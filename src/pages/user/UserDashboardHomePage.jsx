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
} from 'lucide-react';
import api from '../../services/api';
import { useUserAuth } from '../../context/UserAuthContext.jsx';
import { useWishlist } from '../../context/WishlistContext.jsx';
import { categorize, isPaid } from '../../components/user/bookingFormatters.js';

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

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Greeting hero */}
      <div className="bg-gradient-to-r from-brand-light to-brand text-ink rounded-2xl p-6 md:p-8 shadow-soft">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm opacity-80 mb-1">Welcome to your dashboard</p>
            <h1 className="text-2xl md:text-3xl font-display font-bold">
              {greeting()}, {user?.name?.split(/\s+/)[0] || 'Traveller'}!
            </h1>
            <p className="opacity-80 mt-2 text-sm md:text-base max-w-lg">
              Track your bookings, transactions and rewards — all in one place.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-black/10 backdrop-blur px-4 py-3 rounded-xl">
            <Wallet size={22} />
            <div className="leading-tight">
              <div className="text-xs opacity-90">Wallet balance</div>
              <div className="font-bold text-xl">₹{wallet}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          to="/dashboard/bookings"
          icon={BookOpen}
          label="My Bookings"
          value={bookingCounts.upcoming > 0 ? `${bookingCounts.upcoming} upcoming` : 'View all'}
          accent="bg-blue-50 text-blue-600"
        />
        <StatCard
          to="/dashboard/transactions"
          icon={Wallet}
          label="Transactions"
          value={bookingCounts.txns > 0 ? `${bookingCounts.txns} payments` : 'View history'}
          accent="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          to="/dashboard/wishlist"
          icon={Heart}
          label="Wishlist"
          value={wishlistCount > 0 ? `${wishlistCount} saved` : 'Saved items'}
          accent="bg-rose-50 text-rose-600"
        />
        {/* Refer & Earn card hidden alongside the nav tab (logic kept intact).
        <StatCard
          to="/dashboard/refer"
          icon={Gift}
          label="Refer & Earn"
          value={user?.referralCode || '—'}
          accent="bg-amber-50 text-amber-600"
        />
        */}
      </div>

      {/* Profile completeness + quick links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-soft p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Your profile</h3>
            <Link to="/dashboard/profile" className="text-sm text-brand hover:underline inline-flex items-center gap-1">
              Edit profile <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <ProfileRow label="Full name" value={user?.name} />
            <ProfileRow label="Email" value={user?.email} />
            <ProfileRow label="Phone" value={user?.phone} />
            <ProfileRow label="City" value={user?.city} />
            <ProfileRow label="Gender" value={prettyGender(user?.gender)} />
            <ProfileRow label="Date of birth" value={user?.dob} />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-soft p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={18} className="text-brand" />
            <h3 className="font-semibold text-lg">Start exploring</h3>
          </div>
          <p className="text-sm text-ink-muted mb-4">
            Discover curated retreats, hotels and experiences.
          </p>
          <div className="space-y-2 mt-auto">
            <Link to="/retreats" className="block w-full text-center py-2.5 rounded-lg bg-brand text-white font-medium hover:brightness-110 transition">
              Browse retreats
            </Link>
            <Link to="/hotels" className="block w-full text-center py-2.5 rounded-lg border border-gray-200 hover:bg-surface-alt font-medium transition">
              Browse hotels
            </Link>
            <Link to="/events" className="block w-full text-center py-2.5 rounded-lg border border-gray-200 hover:bg-surface-alt font-medium transition">
              Browse events
            </Link>
          </div>
        </div>
      </div>
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

function StatCard({ to, icon: Icon, label, value, accent }) {
  return (
    <Link
      to={to}
      className="bg-white rounded-2xl shadow-soft p-5 hover:shadow-card transition group"
    >
      <div className={`inline-flex w-10 h-10 rounded-lg items-center justify-center mb-3 ${accent}`}>
        <Icon size={20} />
      </div>
      <div className="text-xs text-ink-muted uppercase tracking-wide">{label}</div>
      <div className="font-semibold text-ink mt-0.5 group-hover:text-brand transition truncate">
        {value}
      </div>
    </Link>
  );
}

function ProfileRow({ label, value }) {
  return (
    <div className="flex items-start gap-2">
      <UserIcon size={14} className="mt-0.5 text-ink-muted shrink-0" />
      <div className="min-w-0">
        <div className="text-xs text-ink-muted uppercase tracking-wide">{label}</div>
        <div className="font-medium text-ink truncate">{value || '—'}</div>
      </div>
    </div>
  );
}
